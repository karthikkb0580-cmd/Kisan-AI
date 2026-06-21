"""
auth.py — Krishi AI Authentication
====================================
Authentication flow:

  Registration:
    POST /register:
        • Validates name, email, password
        • Creates the user immediately in the database
        • Returns JWT tokens + user profile

  Login:
    POST /login/password:
        • Email + password login
        • Returns JWT tokens

  All other endpoints (OTP, token refresh, /me, password reset) are unchanged.
"""

import random
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

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

def seed_users():
    _demo = database.get_user_by_email("demo@krishi.ai")
    if not _demo:
        demo_pw_hash = hash_password("password")
        u_id = database.create_user(
            full_name="Dr. Demo Farmer",
            email="demo@krishi.ai",
            phone=None,          # no phone to avoid conflicts
            password_hash=demo_pw_hash
        )
        if u_id:
            database.update_user_verification(user_id=u_id, email_verified=True, phone_verified=True)
            print("[DB] Demo user seeded: demo@krishi.ai / password")
    else:
        # Always keep the password hash fresh on startup
        database.update_user_profile(user_id=_demo["id"], password_hash=hash_password("password"))

    if not database.get_user_by_email("dev@krishi.ai"):
        user_pw_hash = hash_password("password")
        u_id = database.create_user(
            full_name="Dev User",
            email="dev@krishi.ai",
            phone=None,
            password_hash=user_pw_hash
        )
        if u_id:
            database.update_user_verification(user_id=u_id, email_verified=True, phone_verified=True)
            print("[DB] Seeded dev user: dev@krishi.ai / password")


# ─── REGISTER STEP 1 — validate details & send OTP to email ──────────────────

@router.post("/register/send-otp")
async def register_send_otp(req: RegisterSendOTPRequest):
    """
    Step 1 of OTP-gated registration.
    Validates the inputs, stores pending data, and sends a 6-digit OTP to
    the supplied email address via Gmail SMTP.
    """
    if not req.full_name or len(req.full_name.strip()) < 2:
        raise HTTPException(400, "Full name must be at least 2 characters long")
    if not req.password or len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters long")
    if database.get_user_by_email(req.email):
        raise HTTPException(400, "An account with this email already exists")

    pw_hash = hash_password(req.password)
    database.upsert_pending_registration(
        email=req.email,
        full_name=req.full_name.strip(),
        password_hash=pw_hash,
    )

    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.email, code, "registration")
    await send_otp("email", req.email, code, "registration")

    return {"detail": f"A 6-digit verification code has been sent to {req.email}. It expires in 5 minutes."}


# ─── REGISTER STEP 2 — verify OTP & create account ───────────────────────────

@router.post("/register/confirm-otp")
def register_confirm_otp(req: RegisterConfirmOTPRequest):
    """
    Step 2 of OTP-gated registration.
    Verifies the OTP, creates the user account, and returns JWT tokens.
    """
    pending = database.get_pending_registration(req.email)
    if not pending:
        raise HTTPException(400, "No pending registration found for this email. Please start over.")

    ok = database.verify_otp(req.email, req.code, "registration")
    if not ok:
        raise HTTPException(400, "Invalid or expired OTP — please check your email and try again.")

    # Guard against duplicate (race condition)
    if database.get_user_by_email(req.email):
        database.delete_pending_registration(req.email)
        raise HTTPException(400, "An account with this email already exists")

    user_id = database.create_user(
        full_name=pending["full_name"],
        email=req.email,
        phone=None,
        password_hash=pending["password_hash"],
    )
    if not user_id:
        raise HTTPException(500, "Account creation failed — please try again")

    database.update_user_verification(user_id=user_id, email_verified=True, phone_verified=False)
    database.delete_pending_registration(req.email)

    user   = database.get_user_by_id(user_id)
    tokens = create_tokens(user_id)
    print(f"[DB] ✅ New user registered via OTP: {req.email} (id={user_id})")
    return {
        **tokens,
        "user": {
            "id":             user["id"],
            "full_name":      user["full_name"],
            "email":          user["email"] or "",
            "phone":          user["phone"] or "",
            "email_verified": bool(user["email_verified"]),
            "phone_verified": bool(user["phone_verified"]),
            "created_at":     user["created_at"],
        },
    }


# ─── REGISTER (legacy single-step — kept for backward compat) ─────────────────

@router.post("/register")
def register(req: RegisterRequest):
    """
    Register a new user with full name, email, and password (no OTP verification).
    """
    if not req.email:
        raise HTTPException(400, "Email address is required")
    if not req.full_name or len(req.full_name.strip()) < 2:
        raise HTTPException(400, "Full name must be at least 2 characters long")
    if not req.password or len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters long")

    # Reject duplicate emails
    if database.get_user_by_email(req.email):
        raise HTTPException(400, "An account with this email already exists")
    if req.phone and database.get_user_by_phone(req.phone):
        raise HTTPException(400, "An account with this mobile number already exists")

    pw_hash = hash_password(req.password)
    user_id = database.create_user(
        full_name=req.full_name.strip(),
        email=req.email,
        phone=req.phone,
        password_hash=pw_hash,
    )
    if not user_id:
        raise HTTPException(500, "Account creation failed — please try again")

    database.update_user_verification(user_id=user_id, email_verified=True, phone_verified=False)

    user   = database.get_user_by_id(user_id)
    tokens = create_tokens(user_id)
    print(f"[DB] ✅ New user registered (legacy): {req.email} (id={user_id})")
    return {
        **tokens,
        "user": {
            "id":             user["id"],
            "full_name":      user["full_name"],
            "email":          user["email"] or "",
            "phone":          user["phone"] or "",
            "email_verified": bool(user["email_verified"]),
            "phone_verified": bool(user["phone_verified"]),
            "created_at":     user["created_at"],
        },
    }


# ─── OTP/SEND — send a fresh OTP (login / password-reset / verify_secondary) ──

@router.post("/otp/send")
async def otp_send(req: SendOTPRequest):
    """
    Send or re-send a 6-digit OTP for login, password reset, or secondary contact verification.
    """
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, req.purpose)
    await send_otp(req.channel, req.contact, code, req.purpose)
    return {"detail": f"A verification code has been sent to {req.contact}."}


# ─── OTP/VERIFY — verify OTP code ─────────────────────────────────────────────

@router.post("/otp/verify")
async def otp_verify(req: VerifyOTPRequest):
    ok = database.verify_otp(req.contact, req.code, req.purpose)
    if not ok:
        raise HTTPException(400, "Invalid or expired code — please try again")

    if req.purpose == "verify_secondary":
        return {"detail": "Contact verified."}

    return {"detail": "OTP verified."}


# ─── LOGIN — email + password ─────────────────────────────────────────────────

@router.post("/login/password")
def login_password(req: LoginPasswordRequest):
    user = (database.get_user_by_email(req.identifier)
            or database.get_user_by_phone(req.identifier))
    if not user or not verify_password(req.password, user.get("password_hash") or ""):
        raise HTTPException(401, "Incorrect email or password")

    tokens = create_tokens(user["id"])
    return {
        **tokens,
        "user": {
            "id":             user["id"],
            "full_name":      user["full_name"],
            "email":          user["email"] or "",
            "phone":          user["phone"] or "",
            "email_verified": bool(user["email_verified"]),
            "phone_verified": bool(user["phone_verified"]),
            "created_at":     user["created_at"],
        },
    }


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

    tokens = create_tokens(user["id"])
    return {
        **tokens,
        "user": {
            "id":             user["id"],
            "full_name":      user["full_name"],
            "email":          user["email"] or "",
            "phone":          user["phone"] or "",
            "email_verified": bool(user["email_verified"]),
            "phone_verified": bool(user["phone_verified"]),
            "created_at":     user["created_at"],
        },
    }


# ─── LOGIN — Firebase OTP (phone, verified by client) ────────────────────────

@router.post("/login/firebase")
def login_firebase(req: FirebaseLoginRequest):
    phone = req.phone.replace(" ", "")
    user = database.get_user_by_phone(phone)
    if not user:
        name = req.full_name or f"Farmer {phone[-4:]}"
        user_id = database.create_user(full_name=name, phone=phone)
        if not user_id:
            raise HTTPException(500, "Failed to create user in database")
        database.update_user_verification(user_id=user_id, phone_verified=True)
        user = database.get_user_by_id(user_id)

    tokens = create_tokens(user["id"])
    return {
        **tokens,
        "user": {
            "id":             user["id"],
            "full_name":      user["full_name"],
            "email":          user["email"] or "",
            "phone":          user["phone"] or "",
            "email_verified": bool(user["email_verified"]),
            "phone_verified": bool(user["phone_verified"]),
            "created_at":     user["created_at"],
        }
    }


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
