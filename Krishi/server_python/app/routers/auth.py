"""
auth.py — Krishi AI Authentication Router
==========================================

Registration flow (2 steps):
  Step 1: POST /auth/register/send-otp
          Body: { full_name, email, password }
          → Validates details, sends 6-digit OTP to email
  Step 2: POST /auth/register/verify
          Body: { email, code }
          → Verifies OTP, creates account, returns JWT

Login:
  POST /auth/login
  Body: { email, password }
  → Returns JWT tokens immediately (no OTP for login)

Other:
  POST /auth/token/refresh  — Refresh access token
  GET  /auth/me             — Current user profile
  POST /auth/logout         — Client-side logout
"""

from __future__ import annotations

import logging
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from app import database
from app.schemas import RefreshRequest
from app.services.auth_helpers import (
    create_tokens,
    get_current_user_id,
    hash_password,
    verify_password,
    refresh_access_token,
)
from app.services.email_service import send_otp_email
from app.security.rate_limiter import limit_by_ip, get_client_ip
from app.security.audit_logger import log_register, log_login_success, log_login_failed

logger = logging.getLogger("krishi.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ── Constants ─────────────────────────────────────────────────────────────────
OTP_EXPIRY_SECONDS    = 600   # 10 minutes
MAX_OTP_ATTEMPTS_HARD = 5     # hard-lock after 5 wrong attempts


# ── Request schemas ───────────────────────────────────────────────────────────

class RegisterSendOTPRequest(BaseModel):
    full_name: str     = Field(..., min_length=2, max_length=100)
    email:     EmailStr
    password:  str     = Field(..., min_length=6)


class RegisterVerifyRequest(BaseModel):
    email: EmailStr
    code:  str = Field(..., min_length=6, max_length=6)


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gen_otp() -> str:
    """CSPRNG 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def _hash_otp(otp: str) -> str:
    """Hash OTP with Argon2id (falls back to bcrypt)."""
    try:
        from argon2 import PasswordHasher
        return PasswordHasher(time_cost=1, memory_cost=65536, parallelism=1).hash(otp)
    except ImportError:
        import bcrypt
        return bcrypt.hashpw(otp.encode(), bcrypt.gensalt(rounds=10)).decode()


def _verify_otp_hash(otp: str, hashed: str) -> bool:
    """Verify OTP against stored hash."""
    try:
        from argon2 import PasswordHasher
        from argon2.exceptions import VerifyMismatchError
        try:
            PasswordHasher().verify(hashed, otp)
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


# ── POST /register/send-otp — Step 1 ─────────────────────────────────────────

@router.post("/register/send-otp")
def register_send_otp(req: RegisterSendOTPRequest, request: Request):
    """
    Step 1 of registration.
    Validates name/email/password, stores pending registration,
    and emails a 6-digit OTP for email verification.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    email = req.email.strip().lower()

    # Check if email already registered
    if database.get_user_by_email(email):
        raise HTTPException(
            400,
            "An account with this email already exists. Please log in instead."
        )

    # Hash password and store pending registration (expires in 10 min)
    pw_hash = hash_password(req.password)
    database.upsert_pending_registration(
        email=email,
        full_name=req.full_name.strip(),
        password_hash=pw_hash,
        ttl_seconds=OTP_EXPIRY_SECONDS,
    )

    # Generate OTP and store hashed copy
    otp = _gen_otp()
    database.create_secure_otp(
        email=email,
        otp_hash=_hash_otp(otp),
        purpose="registration",
        ip_address=ip,
        user_agent=request.headers.get("user-agent", "")[:200],
        expires_in_seconds=OTP_EXPIRY_SECONDS,
    )

    # Send OTP email
    sent = send_otp_email(to_email=email, otp=otp, purpose="registration")
    if not sent:
        logger.error(f"[AUTH] OTP email failed for {email!r}")
        raise HTTPException(503, "Could not send verification email. Please try again.")

    logger.info(f"[AUTH] Registration OTP sent to {email!r} from ip={ip}")
    return {
        "detail": (
            f"A 6-digit verification code has been sent to {email}. "
            "Please check your inbox and spam folder. The code expires in 10 minutes."
        ),
        "expires_in": OTP_EXPIRY_SECONDS,
    }


# ── POST /register/verify — Step 2 ───────────────────────────────────────────

@router.post("/register/verify")
def register_verify(req: RegisterVerifyRequest, request: Request):
    """
    Step 2 of registration.
    Verifies the OTP, creates the user account, returns JWT tokens.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    email = req.email.strip().lower()
    code  = req.code.strip()

    def _fail(reason: str):
        log_login_failed(identifier=email, ip=ip, reason=reason)
        raise HTTPException(400, "Invalid or expired verification code.")

    # Get active OTP record
    otp_row = database.get_active_secure_otp(email, "registration")
    if not otp_row:
        _fail("no_active_otp")

    # Increment attempts
    attempts = database.increment_otp_attempt(otp_row["id"])
    if attempts > MAX_OTP_ATTEMPTS_HARD:
        database.mark_otp_used(otp_row["id"])
        _fail("max_attempts_exceeded")

    # Verify hash
    if not _verify_otp_hash(code, otp_row["otp_hash"]):
        _fail("hash_mismatch")

    # Mark OTP used
    database.mark_otp_used(otp_row["id"])

    # Get pending registration details
    pending = database.get_pending_registration(email)
    if not pending:
        raise HTTPException(
            400,
            "Registration session expired. Please start registration again."
        )

    # Double-check email not taken between step 1 and step 2
    if database.get_user_by_email(email):
        database.delete_pending_registration(email)
        raise HTTPException(400, "This email was already registered. Please log in.")

    # Create the account
    uid = database.create_user(
        full_name=pending["full_name"],
        email=email,
        phone=None,
        password_hash=pending["password_hash"],
    )
    if not uid:
        raise HTTPException(500, "Account creation failed. Please try again.")

    database.update_user_verification(uid, email_verified=True)
    database.delete_pending_registration(email)

    user = database.get_user_by_id(uid)
    log_register(email=email, ip=ip)
    logger.info(f"[AUTH] New user registered: {email!r}")

    tokens = create_tokens(uid)
    log_login_success(email=email, ip=ip)
    return {**tokens, "user": _user_response(user)}


# ── POST /login — Email + Password ───────────────────────────────────────────

@router.post("/login")
def login(req: LoginRequest, request: Request):
    """
    Login with email and password.
    No OTP required — password was already verified at registration.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    email = req.email.strip().lower()

    def _fail(reason: str):
        log_login_failed(identifier=email, ip=ip, reason=reason)
        # Generic message to prevent user enumeration
        raise HTTPException(401, "Invalid email or password.")

    user = database.get_user_by_email(email)
    if not user:
        _fail("user_not_found")

    if not user.get("password_hash"):
        _fail("no_password_set")

    if not verify_password(req.password, user["password_hash"]):
        _fail("wrong_password")

    tokens = create_tokens(user["id"])
    log_login_success(email=email, ip=ip)
    logger.info(f"[AUTH] User logged in: {email!r}")
    return {**tokens, "user": _user_response(user)}


# ── POST /token/refresh ───────────────────────────────────────────────────────

@router.post("/token/refresh")
def token_refresh(req: RefreshRequest, request: Request):
    limit_by_ip(request)
    result = refresh_access_token(req.refresh_token)
    if not result:
        raise HTTPException(401, "Invalid or expired refresh token.")
    return result


# ── GET /me ───────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found.")
    return _user_response(user)


# ── POST /logout ──────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(user_id: int = Depends(get_current_user_id)):
    """Stateless JWT — tokens invalidated on client side."""
    return {"detail": "Logged out successfully."}


# ── Legacy Firebase endpoint (kept for compatibility) ─────────────────────────

class _FirebaseLegacy(BaseModel):
    phone:     Optional[str] = None
    email:     Optional[str] = None
    full_name: Optional[str] = None


@router.post("/login/firebase")
def login_firebase(req: _FirebaseLegacy, request: Request):
    """Legacy Firebase endpoint — kept so old clients don't break."""
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
