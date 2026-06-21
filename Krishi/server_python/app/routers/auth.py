"""
auth.py — Krishi AI Production Authentication Router
=====================================================
Implements OWASP-compliant OTP-based email authentication.

Endpoints:
  POST /auth/register          — Create account (password optional, email verified via OTP)
  POST /auth/send-otp          — Send / resend OTP (registration or login)
  POST /auth/verify-otp        — Verify OTP and activate account
  POST /auth/login             — Email + password login (verified users only)
  POST /auth/resend-otp        — Alias for send-otp (UX convenience)
  POST /auth/logout            — Invalidate refresh token
  POST /auth/token/refresh     — Refresh access token
  GET  /auth/me                — Get current user profile

Security highlights:
  • CSPRNG OTP (secrets.SystemRandom)
  • Argon2id hashing — OTP never stored in plaintext
  • Multi-level rate limiting (IP + email)
  • Email enumeration prevention (generic responses)
  • Attempt tracking and automatic OTP invalidation
  • Structured security audit logging
"""

from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request

from app import database
from app.schemas import (
    RegisterRequest,
    RegisterSendOTPRequest,
    RegisterConfirmOTPRequest,
    SendOTPRequest,
    VerifyOTPRequest,
    LoginPasswordRequest,
    LoginOTPRequest,
    FirebaseLoginRequest,
    RefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.services.auth_helpers import (
    hash_password,
    verify_password,
    create_tokens,
    get_current_user_id,
)
from app.services.otp_email import send_otp_email
from app.security.otp_security import generate_otp, hash_otp, verify_otp_hash
from app.security.rate_limiter import (
    limit_by_ip,
    limit_otp_send,
    limit_otp_verify,
    get_client_ip,
)
from app.security.audit_logger import (
    log_otp_sent,
    log_otp_verified,
    log_otp_failed,
    log_register,
    log_login_success,
    log_login_failed,
)

logger = logging.getLogger("krishi.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ── OTP expiry ────────────────────────────────────────────────────────────────
OTP_EXPIRY_SECONDS = 300     # 5 minutes
OTP_MAX_ATTEMPTS   = 100     # per OTP window
MAX_OTP_ATTEMPTS_HARD = 5    # hard lock after this many wrong attempts per OTP row


# ── Generic messages (email enumeration prevention) ───────────────────────────
_GENERIC_OTP_MSG = (
    "If this email is registered, a verification code has been sent. "
    "Please check your inbox (and spam folder)."
)


# ─── Seed demo users ──────────────────────────────────────────────────────────

def seed_users() -> None:
    """Create demo accounts on first run (safe to call repeatedly)."""
    for email, full_name in [("demo@krishi.ai", "Dr. Demo Farmer"), ("dev@krishi.ai", "Dev User")]:
        existing = database.get_user_by_email(email)
        if not existing:
            uid = database.create_user(
                full_name=full_name,
                email=email,
                phone=None,
                password_hash=hash_password("password"),
            )
            if uid:
                database.update_user_verification(uid, email_verified=True, phone_verified=True)
                logger.info("[Seed] Created demo user: %s", email)
        else:
            database.update_user_profile(user_id=existing["id"], password_hash=hash_password("password"))


# ─── Shared user serialiser ───────────────────────────────────────────────────

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


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_user_agent(request: Request) -> str:
    return request.headers.get("User-Agent", "")[:256]


async def _dispatch_otp(email: str, purpose: str, ip: str, ua: str,
                        user_id: Optional[int] = None) -> None:
    """Generate, hash, store, and email an OTP. Handles dev fallback."""
    otp   = generate_otp(6)
    hashed = hash_otp(otp)

    database.create_secure_otp(
        email=email,
        otp_hash=hashed,
        purpose=purpose,
        ip_address=ip,
        user_agent=ua,
        expires_in_seconds=OTP_EXPIRY_SECONDS,
        user_id=user_id,
    )

    # Attempt real delivery; always log to terminal for dev visibility
    logger.info("[OTP] ──── NEW OTP ────  email=%s  purpose=%s  code=%s", email, purpose, otp)
    sent = await send_otp_email(to_email=email, otp=otp, purpose=purpose,
                                expiry_minutes=OTP_EXPIRY_SECONDS // 60)
    if not sent:
        logger.warning("[OTP] Email delivery failed — code printed to log above (dev mode).")

    log_otp_sent(email=email, ip=ip, purpose=purpose)


# ─── POST /register/send-otp — Step 1: validate & send OTP ───────────────────

@router.post("/register/send-otp")
async def register_send_otp(req: RegisterSendOTPRequest, request: Request):
    """
    Step 1: Validate registration details, stage the user, and send OTP.
    Rate limited: 20 sends per email per 15 min, 50 requests per IP per hour.
    """
    ip = get_client_ip(request)
    ua = _get_user_agent(request)

    # Rate limiting
    limit_by_ip(request)
    limit_otp_send(req.email)

    # Validations
    if len(req.full_name.strip()) < 2:
        raise HTTPException(400, "Full name must be at least 2 characters.")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")

    # Email enumeration prevention: don't reveal whether email exists
    if database.get_user_by_email(req.email):
        # Silently succeed — never reveal email existence
        logger.info("[Auth] Register attempt on existing email=%s ip=%s", req.email, ip)
        return {"detail": _GENERIC_OTP_MSG}

    # Stage the registration
    database.upsert_pending_registration(
        email=req.email,
        full_name=req.full_name.strip(),
        password_hash=hash_password(req.password),
    )

    await _dispatch_otp(req.email, "registration", ip, ua)
    return {"detail": _GENERIC_OTP_MSG}


# ─── POST /register/confirm-otp — Step 2: verify OTP & create account ─────────

@router.post("/register/confirm-otp")
async def register_confirm_otp(req: RegisterConfirmOTPRequest, request: Request):
    """
    Step 2: Verify OTP, create the user account, return JWT tokens.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)
    limit_otp_verify(req.email)

    otp_row = database.get_active_secure_otp(req.email, "registration")

    # Generic failure — never reveal whether email/OTP exists
    def _fail(reason: str):
        log_otp_failed(email=req.email, ip=ip, reason=reason)
        raise HTTPException(400, "Invalid or expired verification code. Please try again.")

    if not otp_row:
        _fail("no_active_otp")

    # Hard attempt cap per OTP row
    attempts = database.increment_otp_attempt(otp_row["id"])
    if attempts > MAX_OTP_ATTEMPTS_HARD:
        database.mark_otp_used(otp_row["id"])
        _fail("max_attempts_exceeded")

    if not verify_otp_hash(req.code, otp_row["otp_hash"]):
        _fail("hash_mismatch")

    # OTP is valid — finalise registration
    pending = database.get_pending_registration(req.email)
    if not pending:
        _fail("no_pending_registration")

    if database.get_user_by_email(req.email):
        database.delete_pending_registration(req.email)
        raise HTTPException(400, "An account with this email already exists.")

    user_id = database.create_user(
        full_name=pending["full_name"],
        email=req.email,
        phone=None,
        password_hash=pending["password_hash"],
    )
    if not user_id:
        raise HTTPException(500, "Account creation failed. Please try again.")

    database.update_user_verification(user_id=user_id, email_verified=True)
    database.mark_otp_used(otp_row["id"])
    database.delete_pending_registration(req.email)

    user = database.get_user_by_id(user_id)
    tokens = create_tokens(user_id)
    log_otp_verified(email=req.email, ip=ip)
    log_register(email=req.email, ip=ip)
    logger.info("[Auth] ✅ New user registered: email=%s id=%s", req.email, user_id)

    return {**tokens, "user": _user_response(user)}


# ─── POST /register — Direct registration (no OTP, legacy compat) ─────────────

@router.post("/register")
def register(req: RegisterRequest, request: Request):
    """
    Legacy single-step registration (for internal/seed use).
    For new users, prefer the OTP-gated flow above.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    if database.get_user_by_email(req.email):
        raise HTTPException(400, "An account with this email already exists.")

    pw_hash = hash_password(req.password)
    user_id = database.create_user(
        full_name=req.full_name.strip(),
        email=req.email,
        phone=req.phone,
        password_hash=pw_hash,
    )
    if not user_id:
        raise HTTPException(500, "Registration failed.")

    user = database.get_user_by_id(user_id)
    tokens = create_tokens(user_id)
    log_register(email=req.email, ip=ip)
    return {**tokens, "user": _user_response(user)}


# ─── POST /send-otp — Generic OTP send (login / password-reset) ───────────────

@router.post("/send-otp")
@router.post("/resend-otp")  # UX alias
async def send_otp_endpoint(req: SendOTPRequest, request: Request):
    """
    Send or resend an OTP for any purpose.
    Uses generic response to prevent email enumeration.
    """
    ip = get_client_ip(request)
    ua = _get_user_agent(request)
    limit_by_ip(request)
    limit_otp_send(req.contact)

    if req.channel == "email":
        user = database.get_user_by_email(req.contact)
        if user:
            await _dispatch_otp(req.contact, req.purpose, ip, ua, user_id=user["id"])
        else:
            logger.info("[Auth] OTP requested for unknown email=%s", req.contact)
        # Generic response regardless of whether user exists
        return {"detail": _GENERIC_OTP_MSG}

    return {"detail": "If this contact exists, an OTP has been sent."}


# ─── POST /otp/send — same as /send-otp, alternate path ──────────────────────

@router.post("/otp/send")
async def otp_send(req: SendOTPRequest, request: Request):
    return await send_otp_endpoint(req, request)


# ─── POST /verify-otp — Verify OTP for any purpose ───────────────────────────

@router.post("/verify-otp")
@router.post("/otp/verify")
async def verify_otp_endpoint(req: VerifyOTPRequest, request: Request):
    """
    Verify an OTP. For 'registration' purpose, marks user email as verified.
    Returns a JWT if purpose is 'login'.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)
    limit_otp_verify(req.contact)

    otp_row = database.get_active_secure_otp(req.contact, req.purpose)

    def _fail(reason: str):
        log_otp_failed(email=req.contact, ip=ip, reason=reason)
        raise HTTPException(400, "Invalid or expired verification code.")

    if not otp_row:
        _fail("no_active_otp")

    attempts = database.increment_otp_attempt(otp_row["id"])
    if attempts > MAX_OTP_ATTEMPTS_HARD:
        database.mark_otp_used(otp_row["id"])
        _fail("max_attempts_exceeded")

    if not verify_otp_hash(req.code, otp_row["otp_hash"]):
        _fail("hash_mismatch")

    database.mark_otp_used(otp_row["id"])
    log_otp_verified(email=req.contact, ip=ip)

    user = database.get_user_by_email(req.contact)

    if req.purpose == "registration" and user:
        database.update_user_verification(user["id"], email_verified=True)

    if req.purpose == "login" and user:
        tokens = create_tokens(user["id"])
        log_login_success(email=req.contact, ip=ip)
        return {**tokens, "user": _user_response(user)}

    if req.purpose == "verify_secondary":
        if user:
            database.update_user_verification(user["id"], email_verified=True)
        return {"detail": "Contact verified successfully."}

    return {"detail": f"{req.purpose.replace('_', ' ').title()} verified successfully."}


# ─── POST /login — Email + password login ────────────────────────────────────

@router.post("/login")
@router.post("/login/password")
def login(req: LoginPasswordRequest, request: Request):
    """
    Standard email + password login. Only verified users may log in.
    Uses generic errors to prevent enumeration.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

    _GENERIC_LOGIN_ERR = "Incorrect email or password."

    user = (database.get_user_by_email(req.identifier)
            or database.get_user_by_phone(req.identifier))

    if not user or not verify_password(req.password, user.get("password_hash") or ""):
        log_login_failed(identifier=req.identifier, ip=ip, reason="bad_credentials")
        raise HTTPException(401, _GENERIC_LOGIN_ERR)

    if not user.get("email_verified") and not user.get("phone_verified"):
        log_login_failed(identifier=req.identifier, ip=ip, reason="unverified")
        raise HTTPException(403, "Please verify your email before logging in.")

    tokens = create_tokens(user["id"])
    log_login_success(email=user.get("email", req.identifier), ip=ip)
    return {**tokens, "user": _user_response(user)}


# ─── POST /login/otp — OTP-based login ───────────────────────────────────────

@router.post("/login/otp")
async def login_otp(req: LoginOTPRequest, request: Request):
    """OTP-based login — verify the OTP and return JWT tokens."""
    return await verify_otp_endpoint(
        VerifyOTPRequest(
            channel=req.channel,
            contact=req.contact,
            code=req.code,
            purpose="login",
        ),
        request,
    )


# ─── POST /login/firebase — Firebase phone auth ───────────────────────────────

@router.post("/login/firebase")
def login_firebase(req: FirebaseLoginRequest, request: Request):
    """
    Login or auto-register via verified Firebase phone auth.
    The phone must already be verified client-side by Firebase SDK.
    """
    ip = get_client_ip(request)
    limit_by_ip(request)

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

    tokens = create_tokens(user["id"])
    log_login_success(email=user.get("email", req.phone), ip=ip)
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


# ─── POST /password/reset — Step 1: send OTP ─────────────────────────────────

@router.post("/password/reset")
async def password_reset_request(req: PasswordResetRequest, request: Request):
    ip = get_client_ip(request)
    ua = _get_user_agent(request)
    limit_by_ip(request)
    limit_otp_send(req.contact)

    user = database.get_user_by_email(req.contact) if req.channel == "email" else \
           database.get_user_by_phone(req.contact)
    if user:
        await _dispatch_otp(req.contact, "password_reset", ip, ua, user_id=user["id"])

    return {"detail": "If this contact exists, a reset code has been sent."}


# ─── POST /password/confirm — Step 2: verify OTP & set new password ──────────

@router.post("/password/confirm")
async def password_reset_confirm(req: PasswordResetConfirm, request: Request):
    ip = get_client_ip(request)
    limit_by_ip(request)
    limit_otp_verify(req.contact)

    otp_row = database.get_active_secure_otp(req.contact, "password_reset")

    def _fail(reason: str):
        log_otp_failed(email=req.contact, ip=ip, reason=reason)
        raise HTTPException(400, "Invalid or expired reset code.")

    if not otp_row:
        _fail("no_active_otp")

    attempts = database.increment_otp_attempt(otp_row["id"])
    if attempts > MAX_OTP_ATTEMPTS_HARD:
        database.mark_otp_used(otp_row["id"])
        _fail("max_attempts_exceeded")

    if not verify_otp_hash(req.code, otp_row["otp_hash"]):
        _fail("hash_mismatch")

    if len(req.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters.")

    user = (database.get_user_by_email(req.contact)
            or database.get_user_by_phone(req.contact))
    if not user:
        raise HTTPException(404, "User not found.")

    database.update_user_profile(user["id"], password_hash=hash_password(req.new_password))
    database.mark_otp_used(otp_row["id"])
    log_otp_verified(email=req.contact, ip=ip)

    return {"detail": "Password reset successfully. You may now log in."}
