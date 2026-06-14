import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status

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

# Seed demo user
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


@router.post("/register")
async def register(req: RegisterRequest):
    if not req.email and not req.phone:
        raise HTTPException(400, "Provide at least one of email or phone")

    if req.email and database.get_user_by_email(req.email):
        raise HTTPException(400, "An account with this email already exists")
    if req.phone and database.get_user_by_phone(req.phone):
        raise HTTPException(400, "An account with this mobile number already exists")

    pw_hash = hash_password(req.password) if req.password else None
    user_id = database.create_user(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        password_hash=pw_hash,
    )
    if not user_id:
        raise HTTPException(500, "Registration failed — please try again")

    # Send verification OTP to email (primary) or phone
    primary  = req.email if req.email else req.phone
    channel  = "email"   if req.email else "sms"
    code     = f"{random.randint(100000, 999999)}"
    database.save_otp(primary, code, "registration")
    await send_otp(channel, primary, code, "registration")

    return {
        "detail": f"Account created. Verification OTP sent via {channel}.",
        "contact": primary,
        "channel": channel,
    }

@router.post("/otp/send")
async def otp_send(req: SendOTPRequest):
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, req.purpose)
    await send_otp(req.channel, req.contact, code, req.purpose)
    return {
        "detail": f"OTP sent to {req.contact} via {req.channel}.",
        "dev_hint": "Check the terminal window running the Python server for the code.",
    }

@router.post("/otp/verify")
def otp_verify(req: VerifyOTPRequest):
    ok = database.verify_otp(req.contact, req.code, req.purpose)
    if not ok:
        raise HTTPException(400, "Invalid or expired code — please try again")

    if req.purpose == "registration":
        user = (database.get_user_by_email(req.contact)
                or database.get_user_by_phone(req.contact))
        if not user:
            raise HTTPException(404, "User not found for this contact")

        database.update_user_verification(
            user_id=user["id"],
            email_verified=(req.channel == "email"),
            phone_verified=(req.channel == "sms"),
        )
        updated = database.get_user_by_id(user["id"])
        tokens  = create_tokens(user["id"])
        return {
            **tokens,
            "user": {
                "id":             updated["id"],
                "full_name":      updated["full_name"],
                "email":          updated["email"] or "",
                "phone":          updated["phone"] or "",
                "email_verified": bool(updated["email_verified"]),
                "phone_verified": bool(updated["phone_verified"]),
                "created_at":     updated["created_at"],
            },
        }

    if req.purpose == "verify_secondary":
        return {"detail": "Contact verified."}

    return {"detail": "OTP verified."}

@router.post("/login/password")
def login_password(req: LoginPasswordRequest):
    user = (database.get_user_by_email(req.identifier)
            or database.get_user_by_phone(req.identifier))
    if not user or not verify_password(req.password, user.get("password_hash") or ""):
        raise HTTPException(401, "Incorrect email/phone or password")
    return create_tokens(user["id"])

@router.post("/login/otp")
def login_otp(req: LoginOTPRequest):
    ok = database.verify_otp(req.contact, req.code, "login")
    if not ok:
        raise HTTPException(400, "Invalid or expired OTP")

    user = (database.get_user_by_email(req.contact)
            or database.get_user_by_phone(req.contact))
    if not user:
        # Passwordless: create account on first login
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

@router.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id":               user["id"],
        "full_name":        user["full_name"],
        "email":            user["email"] or "",
        "phone":            user["phone"] or "",
        "profile_photo_url": user.get("profile_photo_url") or "",
        "email_verified":   bool(user["email_verified"]),
        "phone_verified":   bool(user["phone_verified"]),
        "created_at":       user["created_at"],
    }

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

@router.post("/password/reset")
async def password_reset_request(req: PasswordResetRequest):
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
