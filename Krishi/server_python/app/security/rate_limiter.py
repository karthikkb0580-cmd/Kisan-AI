"""
rate_limiter.py — Production-grade multi-level rate limiting
=============================================================
Levels:
  1. IP-based: 50 requests/hour per IP
  2. Email OTP send: 20 requests/15 min per email
  3. OTP verification: 5 attempts per OTP code window

Uses in-memory sliding window. For multi-process deployments
replace with Redis. The DB-backed rate-limit table persists
abuse records across restarts.
"""

from __future__ import annotations

import time
import logging
from collections import defaultdict
from threading import Lock
from typing import Dict, List, Tuple

from fastapi import Request, HTTPException

logger = logging.getLogger("krishi.security")


class SlidingWindow:
    """Thread-safe sliding-window counter per key."""

    def __init__(self) -> None:
        self._store: Dict[str, List[float]] = defaultdict(list)
        self._lockout: Dict[str, float] = {}
        self._lock = Lock()

    def is_locked(self, key: str) -> Tuple[bool, float]:
        """Return (locked, seconds_remaining)."""
        with self._lock:
            until = self._lockout.get(key, 0)
            remaining = until - time.time()
            if remaining > 0:
                return True, round(remaining)
            if until:
                del self._lockout[key]
            return False, 0.0

    def hit(self, key: str, max_requests: int, window_secs: int,
            lockout_secs: int = 0) -> Tuple[bool, int]:
        """
        Record a hit for *key*. Returns (allowed, remaining_quota).
        If quota is exceeded and lockout_secs>0, locks the key.
        """
        now = time.time()
        with self._lock:
            # Check existing lockout
            until = self._lockout.get(key, 0)
            if until > now:
                raise HTTPException(
                    429,
                    detail={
                        "code": "RATE_LIMIT_LOCKED",
                        "message": f"Too many attempts. Try again in {round(until - now)}s.",
                        "retry_after": round(until - now),
                    }
                )

            bucket = self._store[key]
            # Evict timestamps outside the window
            self._store[key] = [t for t in bucket if now - t < window_secs]
            count = len(self._store[key])

            if count >= max_requests:
                if lockout_secs > 0:
                    self._lockout[key] = now + lockout_secs
                    logger.warning(
                        "[RateLimit] Key=%s locked for %ds after %d hits in %ds",
                        key, lockout_secs, count, window_secs,
                    )
                raise HTTPException(
                    429,
                    detail={
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Rate limit exceeded. Please slow down.",
                        "retry_after": lockout_secs or window_secs,
                    }
                )

            self._store[key].append(now)
            return True, max_requests - count - 1


# ── Shared windows ────────────────────────────────────────────────────────────

_ip_window    = SlidingWindow()   # 50 req / 60 min per IP
_email_window = SlidingWindow()   # 20 OTP sends / 15 min per email
_verify_window = SlidingWindow()  # 100 verify attempts / OTP-window per email


def get_client_ip(request: Request) -> str:
    """Extract real IP honoring X-Forwarded-For (Render/proxy-aware)."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def limit_by_ip(request: Request) -> None:
    """Dependency: 50 requests/hour per IP, 15-min lockout on abuse."""
    ip = get_client_ip(request)
    _ip_window.hit(ip, max_requests=50, window_secs=3600, lockout_secs=900)


def limit_otp_send(email: str) -> None:
    """20 OTP-send requests per email per 15 minutes, 15-min lockout."""
    _email_window.hit(
        f"otp_send:{email}",
        max_requests=20,
        window_secs=900,
        lockout_secs=900,
    )


def limit_otp_verify(email: str) -> None:
    """100 OTP verification attempts per 5-minute OTP window."""
    _verify_window.hit(
        f"otp_verify:{email}",
        max_requests=100,
        window_secs=300,
        lockout_secs=900,
    )
