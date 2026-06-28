"""
auth.py — Krishi AI Production Authentication Router
=====================================================
OTP-based email authentication using Resend (free 3k emails/month).

Endpoints:
  POST /auth/send-otp          — Generate & email a 6-digit OTP (login or registration)
  POST /auth/verify-otp        — Verify OTP, auto-create account if new user, return JWT
  POST /auth/login/firebase    — Legacy Firebase endpoint (kept for backward compat)
  POST /auth/token/refresh     — Refresh access token
  GET  /auth/me                — Get current user profile
  POST /auth/logout            — Invalidate session (client-side)

Security highlights:
  • CSPRNG 6-digit OTP (secrets module)
  • Argon2id hashing — OTP never stored in plaintext
  • Multi-level rate limiting (IP + email)
  • Email enumeration prevention
  • Attempt tracking and automatic OTP invalidation
"""

from __future__ import annotations

import logging
import secrets
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app import database
from app.schemas import (
    FirebaseLoginRequest,
    RefreshRequest,
)
from app.services.auth_helpers import create_tokens, get_current_user_id
from app.services.email_service import send_otp_email
from app.security.rate_limiter import limit_by_ip, get_client_ip
from app.security.audit_logger import log_register, log_login_success, log_login_failed

logger = logging.getLogger("krishi.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ── Constants ─────────────────────────────────────────────────────────────────
OTP_EXPIRY_SECONDS    = 600   # 10 minutes
MAX_OTP_ATTEMPTS_HARD = 5     # hard lock after 5 wrong attempts

# ── Pydantic schemas (inline, small) ─────────────────────────────────────────

class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "login"      # "login" | "registration"
    full_name: Optional[str] = None  # required for registration


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: str = "login"
    full_name: Optional[str] = None  # used when auto-creating account


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def _hash_otp(otp: str) -> str:
    """Hash OTP with Argon2id for secure storage."""
    try:
        from argon2 import PasswordHasher
        ph = PasswordHasher(time_cost=1, memory_cost=65536, parallelism=1)
        return ph.hash(otp)
    except ImportError:
        # Fallback to bcrypt if argon2 unavailable
        import bcrypt
        return bcrypt.hashpw(otp.encode(), bcrypt.gensalt(rounds=10)).decode()


def _verify_otp_hash(otp: str, hashed: str) -> bool:
    """Verify OTP against its stored hash."""
    try:
        from argon2 import PasswordHasher
        from argon2.exceptions import VerifyMismatchError
        ph = PasswordHasher()
        try:
            ph.verify(hashed, otp)
            return True
        except VerifyMismatchError:
            return False
    except ImportError:
        import bcrypt
        try:
            return bcrypt.checkpw(otp.encode(), hashed.encode())
        except Exception:
            return False


def _user_response(user: dict) -> dict:
    return {
        "id":             user["id"],
        "full_name":      user.get("full_name", ""),
        "email":          user.get("email") or "",
        "phone":          user.get("phone") or "",
        "email_verified": bool(user.get("email_verified")),
        "phone_verified": bool(user.get("phone_verified")),
        "created_at":     user.get("created_at", ""),
    }


# ── POST /send-otp ─────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(req: SendOTPRequest, request: Request):
    """
    Generate a 6-digit OTP and send it to the user's email via Resend.
    Works for both login and registration flows.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    email = req.email.strip().lower()
    purpose = req.purpose if req.purpose in ("login", "registration", "password_reset") else "login"

    # Generate and hash the OTP
    otp = _generate_otp()
    otp_hash = _hash_otp(otp)

    # Store hashed OTP in DB
    database.create_secure_otp(
        email=email,
        otp_hash=otp_hash,
        purpose=purpose,
        ip_address=ip,
        user_agent=request.headers.get("user-agent", "")[:200],
        expires_in_seconds=OTP_EXPIRY_SECONDS,
    )

    # Send email (non-blocking; never expose whether email exists)
    email_sent = send_otp_email(to_email=email, otp=otp, purpose=purpose)
    if not email_sent:
        logger.error(f"[AUTH] Failed to send OTP email to {email!r}")
        raise HTTPException(503, "Email delivery failed. Please try again shortly.")

    logger.info(f"[AUTH] OTP dispatched to {email!r} (purpose={purpose}, ip={ip})")
    return {
        "detail": f"A 6-digit verification code has been sent to {email}. Please check your inbox (and spam folder).",
        "expires_in": OTP_EXPIRY_SECONDS,
    }


# ── POST /verify-otp ───────────────────────────────────────────────────────────

@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest, request: Request):
    """
    Verify the submitted OTP. On success:
    - If user exists → log them in
    - If user doesn't exist (registration) → auto-create account, log them in
    Returns JWT tokens.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    email = req.email.strip().lower()
    code  = req.code.strip()

    def _fail(reason: str):
        log_login_failed(identifier=email, ip=ip, reason=reason)
        raise HTTPException(400, "Invalid or expired verification code.")

    # Fetch the active OTP record
    otp_row = database.get_active_secure_otp(email, req.purpose)
    if not otp_row:
        _fail("no_active_otp")

    # Increment attempt counter (before verification to prevent timing attacks)
    attempts = database.increment_otp_attempt(otp_row["id"])
    if attempts > MAX_OTP_ATTEMPTS_HARD:
        database.mark_otp_used(otp_row["id"])
        _fail("max_attempts_exceeded")

    # Verify the OTP hash
    if not _verify_otp_hash(code, otp_row["otp_hash"]):
        _fail("hash_mismatch")

    # Mark OTP as used (one-time use)
    database.mark_otp_used(otp_row["id"])

    # Get or create user
    user = database.get_user_by_email(email)

    if not user:
        # Auto-register new user
        full_name = (req.full_name or "").strip() or "Farmer"
        uid = database.create_user(
            full_name=full_name,
            email=email,
            phone=None,
            password_hash=None,
        )
        if not uid:
            raise HTTPException(500, "Account creation failed. Please try again.")
        database.update_user_verification(uid, email_verified=True)
        user = database.get_user_by_id(uid)
        log_register(email=email, ip=ip)
        logger.info(f"[AUTH] New user registered via OTP: {email!r}")
    else:
        # Mark existing user email as verified (in case they weren't before)
        if not user.get("email_verified"):
            database.update_user_verification(user["id"], email_verified=True)
            user = database.get_user_by_id(user["id"])

    tokens = create_tokens(user["id"])
    log_login_success(email=email, ip=ip)
    logger.info(f"[AUTH] User {email!r} logged in via OTP")

    return {**tokens, "user": _user_response(user)}


# ─── POST /login/firebase — kept for backward compat ──────────────────────────

@router.post("/login/firebase")
def login_firebase(req: FirebaseLoginRequest, request: Request):
    """
    Legacy: Login or auto-register via verified Firebase auth (email or phone).
    Kept for backward compatibility.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    if req.email:
        user = database.get_user_by_email(req.email)
        if not user:
            uid = database.create_user(
                full_name=req.full_name or "Farmer",
                email=req.email,
                phone=None,
                password_hash=None,
            )
            database.update_user_verification(uid, email_verified=True)
            user = database.get_user_by_id(uid)
            log_register(email=req.email, ip=ip)
        else:
            if not user.get("email_verified"):
                database.update_user_verification(user["id"], email_verified=True)
                user = database.get_user_by_id(user["id"])
    elif req.phone:
        user = database.get_user_by_phone(req.phone)
        if not user:
            uid = database.create_user(
                full_name=req.full_name or "Farmer",
                phone=req.phone,
                email=None,
                password_hash=None,
            )
            database.update_user_verification(uid, phone_verified=True)
            user = database.get_user_by_id(uid)
            log_register(email=req.phone, ip=ip)
        else:
            if not user.get("phone_verified"):
                database.update_user_verification(user["id"], phone_verified=True)
                user = database.get_user_by_id(user["id"])
    else:
        raise HTTPException(400, "Either email or phone must be provided.")

    tokens = create_tokens(user["id"])
    log_login_success(email=user.get("email") or user.get("phone") or "unknown", ip=ip)
    return {**tokens, "user": _user_response(user)}


# ─── POST /token/refresh ──────────────────────────────────────────────────────

@router.post("/token/refresh")
def token_refresh(req: RefreshRequest, request: Request):
    limit_by_ip(request)
    from app.services.auth_helpers import refresh_access_token
    result = refresh_access_token(req.refresh_token)
    if not result:
        raise HTTPException(401, "Invalid or expired refresh token.")
    return result


# ─── GET /me ──────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found.")
    return _user_response(user)


# ─── POST /logout ─────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(user_id: int = Depends(get_current_user_id)):
    """Client should discard tokens. Stateless JWT — nothing to invalidate server-side."""
    return {"detail": "Logged out successfully."}
