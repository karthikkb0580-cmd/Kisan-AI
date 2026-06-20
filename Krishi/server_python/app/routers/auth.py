"""
auth.py — Krishi AI Authentication
====================================
Registration flow using TOTP (browser-authenticator / Google Authenticator protocol):

  Step 1 — POST /register:
      • Validates details, generates a TOTP secret
      • Returns { otpauth_uri, secret, qr_svg } — NOT saved to DB yet

  Step 2 — POST /otp/verify  (purpose="registration"):
      • Verifies the 6-digit TOTP code against the pending secret
      • Only NOW creates the user in the database
      • Returns JWT tokens

All other endpoints (login, password reset, token refresh, /me) are unchanged.
"""

import base64
import io
import pyotp
import qrcode
import qrcode.image.svg

from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

from app import database
from app.schemas import (
    RegisterRequest,
    SendOTPRequest,
    VerifyOTPRequest,
    LoginPasswordRequest,
    LoginOTPRequest,
    RefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm
)
from app.services.auth_helpers import (
    hash_password,
    verify_password,
    create_tokens,
    get_current_user_id
)
from app.services.otp_service import send_otp

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ─── Seed demo users ──────────────────────────────────────────────────────────

if not database.get_user_by_email("demo@krishi.ai"):
    demo_pw_hash = hash_password("password")
    u_id = database.create_user(
        full_name="Dr. Demo Farmer",
        email="demo@krishi.ai",
        phone="+919876543210",
        password_hash=demo_pw_hash
    )
    if u_id:
        database.update_user_verification(user_id=u_id, email_verified=True, phone_verified=True)
        print("[DB] Demo user seeded: demo@krishi.ai / password")

if not database.get_user_by_email("opkarthik2005@gmail.com"):
    user_pw_hash = hash_password("password")
    u_id = database.create_user(
        full_name="Karthik",
        email="opkarthik2005@gmail.com",
        phone="+919876543211",
        password_hash=user_pw_hash
    )
    if u_id:
        database.update_user_verification(user_id=u_id, email_verified=True, phone_verified=True)
        print("[DB] Seeded user: opkarthik2005@gmail.com / password")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_totp_uri(secret: str, email: str) -> str:
    """Build the otpauth:// URI compatible with Google Authenticator & browser-authenticator."""
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="Krishi AI"
    )


def _make_qr_svg(uri: str) -> str:
    """Return an inline SVG string of the QR code for the given URI."""
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(uri, image_factory=factory, box_size=8)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode("utf-8")


def _make_qr_base64_png(uri: str) -> str:
    """Return a base64-encoded PNG QR code (data URI) for the given URI."""
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


# ─── Pending registrations (in-memory, TTL = 15 min) ─────────────────────────
# Keyed by email/phone.
# User is NOT written to the database until the verification code is verified.
_pending: dict[str, dict] = {}


def _store_pending(contact: str, full_name: str, email: Optional[str],
                   phone: Optional[str], pw_hash: Optional[str], method: str, secret_or_code: str) -> None:
    _pending[contact] = {
        "full_name":      full_name,
        "email":          email,
        "phone":          phone,
        "pw_hash":        pw_hash,
        "method":         method,  # "totp" or "email"
        "secret_or_code": secret_or_code,
        "expires_at":     datetime.utcnow() + timedelta(minutes=15),
    }


def _get_pending(contact: str) -> Optional[dict]:
    entry = _pending.get(contact)
    if not entry:
        return None
    if datetime.utcnow() > entry["expires_at"]:
        _pending.pop(contact, None)
        return None
    return entry


def _pop_pending_if_valid(contact: str, code: str) -> Optional[dict]:
    """Pop the pending registration and return it only if the verification code is valid."""
    entry = _get_pending(contact)
    if not entry:
        return None
    
    method = entry.get("method", "totp")
    if method == "totp":
        totp = pyotp.TOTP(entry["secret_or_code"])
        # valid_window=1 allows 30s drift on either side
        if not totp.verify(code, valid_window=1):
            return None
    else:
        # Direct email verification code
        if entry["secret_or_code"] != code:
            return None

    _pending.pop(contact, None)
    return entry


# ─── REGISTER — Step 1: validate details, setup verification (TOTP or Email OTP) ─

@router.post("/register")
async def register(req: RegisterRequest):
    """
    Validate registration details and initiate TOTP or direct Email OTP setup.
    
    Returns:
      - method       : "totp" or "email"
      - contact      : the primary contact (email or phone)
      - channel      : "totp" or "email"
      
      For TOTP:
      - otpauth_uri  : the otpauth:// URI to open with browser-authenticator
      - qr_data      : base64-encoded PNG QR code (data: URI)
      - secret       : the raw base32 TOTP secret
      
      For Email OTP:
      - detail       : success message
    """
    if not req.email and not req.phone:
        raise HTTPException(400, "Provide at least one of email or phone")
    if not req.password or len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters long")

    # Reject duplicates
    if req.email and database.get_user_by_email(req.email):
        raise HTTPException(400, "An account with this email already exists")
    if req.phone and database.get_user_by_phone(req.phone):
        raise HTTPException(400, "An account with this mobile number already exists")

    primary = req.email if req.email else req.phone
    pw_hash = hash_password(req.password)
    method  = req.verification_method if req.verification_method in ("totp", "email") else "totp"

    if method == "totp":
        # Generate a fresh TOTP secret
        totp_secret = pyotp.random_base32()
        otp_uri     = _make_totp_uri(totp_secret, primary)
        qr_data     = _make_qr_base64_png(otp_uri)

        # Store in pending
        _store_pending(primary, req.full_name, req.email, req.phone, pw_hash, "totp", totp_secret)

        print(f"[Auth] Pending TOTP registration for {primary}")
        print(f"[Auth] TOTP secret (dev): {totp_secret}")

        return {
            "detail":      "Scan the QR code with your authenticator app, then enter the 6-digit code.",
            "otpauth_uri": otp_uri,
            "qr_data":     qr_data,
            "secret":      totp_secret,
            "contact":     primary,
            "channel":     "totp",
            "method":      "totp",
        }
    else:
        # Direct email OTP flow
        import random
        code = f"{random.randint(100000, 999999)}"
        
        # Store in pending
        _store_pending(primary, req.full_name, req.email, req.phone, pw_hash, "email", code)

        await send_otp("email", primary, code, "registration")
        print(f"[Auth] Pending Email OTP registration for {primary} (code={code})")

        return {
            "detail":      f"OTP sent to {primary}. Please check your inbox and enter the 6-digit code.",
            "contact":     primary,
            "channel":     "email",
            "method":      "email",
        }


# ─── OTP/SEND — resend verification code ──────────────────────────────────────

@router.post("/otp/send")
async def otp_send(req: SendOTPRequest):
    """
    Re-send a fresh email/SMS OTP.
    For TOTP-based registration, use /register again to get a fresh QR code.
    """
    code = f"{__import__('random').randint(100000, 999999)}"

    if req.purpose == "registration":
        entry = _pending.get(req.contact)
        if not entry:
            raise HTTPException(400, "No pending registration found. Please register again.")
        if entry.get("method") == "totp":
            raise HTTPException(400, "TOTP registration uses authenticator apps. Call /register again to get a new QR code.")
        
        # Resend email OTP code
        _store_pending(
            req.contact, entry["full_name"], entry["email"],
            entry["phone"], entry["pw_hash"], "email", code
        )
        await send_otp(req.channel, req.contact, code, req.purpose)
    else:
        database.save_otp(req.contact, code, req.purpose)
        await send_otp(req.channel, req.contact, code, req.purpose)

    return {"detail": f"A new verification code has been sent to {req.contact}."}


# ─── OTP/VERIFY — verify code → create user in DB → return tokens ─────────────

@router.post("/otp/verify")
async def otp_verify(req: VerifyOTPRequest):
    if req.purpose == "registration":
        # Pop from pending if valid (handles both TOTP and email OTP)
        entry = _pop_pending_if_valid(req.contact, req.code)
        if not entry:
            raise HTTPException(400, "Invalid or expired code — please try again")

        # ── Only NOW create the user in the database ──────────────────────────
        totp_secret = entry["secret_or_code"] if entry["method"] == "totp" else None
        totp_enabled = 1 if entry["method"] == "totp" else 0

        user_id = database.create_user(
            full_name=entry["full_name"],
            email=entry["email"],
            phone=entry["phone"],
            password_hash=entry["pw_hash"],
            totp_secret=totp_secret,
        )
        if not user_id:
            raise HTTPException(500, "Account creation failed — email or phone may already be registered")

        # Mark as verified
        database.update_user_verification(
            user_id=user_id,
            email_verified=(req.channel in ("email", "totp")),
            phone_verified=(req.channel == "sms"),
        )
        if totp_enabled:
            database.update_user_totp(user_id=user_id, totp_enabled=True)

        user   = database.get_user_by_id(user_id)
        tokens = create_tokens(user_id)
        print(f"[DB] ✅ New user created after {entry['method'].upper()} verification: {req.contact} (id={user_id})")
        return {
            **tokens,
            "user": {
                "id":             user["id"],
                "full_name":      user["full_name"],
                "email":          user["email"] or "",
                "phone":          user["phone"] or "",
                "email_verified": bool(user["email_verified"]),
                "phone_verified": bool(user["phone_verified"]),
                "totp_enabled":   bool(user.get("totp_enabled", 0)),
                "created_at":     user["created_at"],
            },
        }

    # ── Non-registration OTP (login, verify_secondary, etc.) ─────────────────
    ok = database.verify_otp(req.contact, req.code, req.purpose)
    if not ok:
        raise HTTPException(400, "Invalid or expired code — please try again")

    if req.purpose == "verify_secondary":
        return {"detail": "Contact verified."}

    return {"detail": "OTP verified."}


# ─── LOGIN — password ─────────────────────────────────────────────────────────

@router.post("/login/password")
def login_password(req: LoginPasswordRequest):
    user = (database.get_user_by_email(req.identifier)
            or database.get_user_by_phone(req.identifier))
    if not user or not verify_password(req.password, user.get("password_hash") or ""):
        raise HTTPException(401, "Incorrect email/phone or password")
    return create_tokens(user["id"])


# ─── LOGIN — OTP (passwordless) ───────────────────────────────────────────────

@router.post("/login/otp")
def login_otp(req: LoginOTPRequest):
    ok = database.verify_otp(req.contact, req.code, "login")
    if not ok:
        raise HTTPException(400, "Invalid or expired OTP")

    user = (database.get_user_by_email(req.contact)
            or database.get_user_by_phone(req.contact))
    if not user:
        email = req.contact if req.channel == "email" else None
        phone = req.contact if req.channel == "sms"   else None
        name  = req.contact.split("@")[0] if email else f"Farmer {req.contact[-4:]}"
        uid   = database.create_user(full_name=name, email=email, phone=phone)
        database.update_user_verification(
            user_id=uid,
            email_verified=(req.channel == "email"),
            phone_verified=(req.channel == "sms"),
        )
        user = database.get_user_by_id(uid)

    return create_tokens(user["id"])


# ─── CURRENT USER ─────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id":                user["id"],
        "full_name":         user["full_name"],
        "email":             user["email"] or "",
        "phone":             user["phone"] or "",
        "profile_photo_url": user.get("profile_photo_url") or "",
        "email_verified":    bool(user["email_verified"]),
        "phone_verified":    bool(user["phone_verified"]),
        "totp_enabled":      bool(user.get("totp_enabled", 0)),
        "created_at":        user["created_at"],
    }


# ─── TOKEN REFRESH ────────────────────────────────────────────────────────────

@router.post("/token/refresh")
def token_refresh(req: RefreshRequest):
    try:
        from app.services.auth_helpers import JWT_SECRET, JWT_ALGORITHM
        import jwt
        payload = jwt.decode(req.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Wrong token type")
        uid = int(payload["sub"])
        if not database.get_user_by_id(uid):
            raise HTTPException(404, "User not found")
        return create_tokens(uid)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")


# ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

@router.post("/password/reset")
async def password_reset_request(req: PasswordResetRequest):
    user = (database.get_user_by_email(req.contact)
            or database.get_user_by_phone(req.contact))
    if not user:
        raise HTTPException(404, "No account found for this contact")
    import random
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, "password_reset")
    await send_otp(req.channel, req.contact, code, "password_reset")
    return {"detail": "Password reset OTP sent."}


@router.post("/password/confirm")
def password_reset_confirm(req: PasswordResetConfirm):
    ok = database.verify_otp(req.contact, req.code, "password_reset")
    if not ok:
        raise HTTPException(400, "Invalid or expired reset code")
    user = (database.get_user_by_email(req.contact)
            or database.get_user_by_phone(req.contact))
    if not user:
        raise HTTPException(404, "No account found for this contact")
    pw_hash = hash_password(req.new_password)
    database.update_user_profile(user_id=user["id"], password_hash=pw_hash)
    return {"detail": "Password reset successful — please sign in."}
