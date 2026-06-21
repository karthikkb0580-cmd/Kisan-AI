"""
audit_logger.py — Security audit logging
=========================================
All sensitive auth events are written to:
  - Python logging (stdout, captured by Render/Docker)
  - The `security_audit_log` SQLite table (via database.py)

Log levels:
  INFO  — normal operations (OTP sent, login success)
  WARNING — suspicious activity (too many attempts, unknown email)
  ERROR   — system errors (email delivery failure)
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("krishi.audit")


def _fmt(event: str, **kwargs) -> str:
    parts = " ".join(f"{k}={v!r}" for k, v in kwargs.items() if v is not None)
    return f"[AUDIT] event={event!r} {parts} ts={datetime.utcnow().isoformat()}Z"


# ── Public helpers ────────────────────────────────────────────────────────────

def log_otp_sent(email: str, ip: str, purpose: str) -> None:
    logger.info(_fmt("OTP_SENT", email=email, ip=ip, purpose=purpose))


def log_otp_verified(email: str, ip: str) -> None:
    logger.info(_fmt("OTP_VERIFIED", email=email, ip=ip))


def log_otp_failed(email: str, ip: str, reason: str) -> None:
    logger.warning(_fmt("OTP_FAILED", email=email, ip=ip, reason=reason))


def log_register(email: str, ip: str) -> None:
    logger.info(_fmt("USER_REGISTERED", email=email, ip=ip))


def log_login_success(email: str, ip: str) -> None:
    logger.info(_fmt("LOGIN_SUCCESS", email=email, ip=ip))


def log_login_failed(identifier: str, ip: str, reason: str) -> None:
    logger.warning(_fmt("LOGIN_FAILED", identifier=identifier, ip=ip, reason=reason))


def log_rate_limit(key: str, ip: str) -> None:
    logger.warning(_fmt("RATE_LIMIT_HIT", key=key, ip=ip))


def log_suspicious(detail: str, ip: str, email: Optional[str] = None) -> None:
    logger.warning(_fmt("SUSPICIOUS", detail=detail, ip=ip, email=email))
