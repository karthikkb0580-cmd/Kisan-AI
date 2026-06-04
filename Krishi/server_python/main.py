import os
import sys
import random
import time
import jwt
import bcrypt
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
import httpx

import database

# ── Force UTF-8 stdout so box chars don't crash on Windows cp1252 ─────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables from .env next to this file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Initialize SQLite DB (creates tables if missing)
database.init_db()

app = FastAPI(title="Krishi AI Backend", version="1.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── In-memory rate limiter ────────────────────────────────────────────────────
_rate_store: Dict[str, List[float]] = {}

def rate_limiter(max_requests: int = 10, window_seconds: int = 60):
    def _dep(request: Request):
        ip = (request.client.host if request.client else "unknown")
        now = time.time()
        bucket = _rate_store.setdefault(ip, [])
        _rate_store[ip] = [t for t in bucket if now - t < window_seconds]
        if len(_rate_store[ip]) >= max_requests:
            raise HTTPException(429, "Too many requests — slow down.")
        _rate_store[ip].append(now)
    return _dep

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET    = os.getenv("JWT_SECRET", "krishi_dev_secret_changeme")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TTL    = 60          # minutes
REFRESH_TTL   = 7           # days

def create_tokens(user_id: int) -> dict:
    now = datetime.utcnow()
    access  = jwt.encode({"sub": str(user_id), "type": "access",
                           "exp": now + timedelta(minutes=ACCESS_TTL)},
                          JWT_SECRET, algorithm=JWT_ALGORITHM)
    refresh = jwt.encode({"sub": str(user_id), "type": "refresh",
                           "exp": now + timedelta(days=REFRESH_TTL)},
                          JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

def get_current_user_id(authorization: Optional[str] = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid auth token")
    try:
        payload = jwt.decode(authorization.split()[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Wrong token type")
        return int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ── Password hashing ──────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(pw: str, hashed: str) -> bool:
    if not pw or not hashed:
        return False
    return bcrypt.checkpw(pw.encode(), hashed.encode())

# ── Dev OTP helper — always prints to terminal; optionally emails via Resend ──
async def send_otp(channel: str, contact: str, code: str, purpose: str) -> None:
    """
    Prints OTP to terminal (dev fallback).
    If RESEND_API_KEY is set and doesn't look like a placeholder,
    also attempts to email the code via Resend.
    """
    sep = "-" * 56
    print(f"\n+{sep}+")
    print(f"|  [DEV] OTP for {contact}")
    print(f"|  Channel : {channel.upper()}")
    print(f"|  Purpose : {purpose.upper()}")
    print(f"|  Code    : {code}   <-- copy this")
    print(f"+{sep}+\n")

    resend_key = os.getenv("RESEND_API_KEY", "")
    if channel == "email" and resend_key and not resend_key.startswith("re_your"):
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_key}",
                             "Content-Type": "application/json"},
                    json={
                        "from": "Krishi AI <onboarding@resend.dev>",
                        "to": contact,
                        "subject": f"Your Krishi AI OTP: {code}",
                        "html": (
                            f"<p>Hi,</p>"
                            f"<p>Your <strong>{purpose}</strong> OTP is:</p>"
                            f"<h1 style='letter-spacing:6px'>{code}</h1>"
                            f"<p>Valid for 5 minutes. Do not share it.</p>"
                        ),
                    },
                )
                if r.status_code in (200, 201):
                    print(f"[Resend] Email delivered to {contact}")
                else:
                    print(f"[Resend] Failed ({r.status_code}): {r.text}")
        except Exception as exc:
            print(f"[Resend] Error: {exc}")

# ── Pydantic models ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class SendOTPRequest(BaseModel):
    channel: str   # "email" | "sms"
    contact: str
    purpose: str   # "login" | "registration" | "verify_secondary"

class VerifyOTPRequest(BaseModel):
    channel: str
    contact: str
    code: str
    purpose: str

class LoginPasswordRequest(BaseModel):
    identifier: str
    password: str

class LoginOTPRequest(BaseModel):
    channel: str
    contact: str
    code: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class AIChatRequest(BaseModel):
    message: str
    history: List[Dict] = []
    language: str = "en"

class AIMarketRequest(BaseModel):
    crop_name: str
    location: Optional[str] = None
    language: str = "en"

class AIWeatherRequest(BaseModel):
    location: str
    crop_name: Optional[str] = None
    language: str = "en"

class PasswordResetRequest(BaseModel):
    channel: str
    contact: str

class PasswordResetConfirm(BaseModel):
    channel: str
    contact: str
    code: str
    new_password: str

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ── Auth: Register ────────────────────────────────────────────────────────────
@app.post("/api/v1/auth/register")
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

# ── Auth: Send OTP ────────────────────────────────────────────────────────────
@app.post("/api/v1/auth/otp/send")
async def otp_send(req: SendOTPRequest):
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, req.purpose)
    await send_otp(req.channel, req.contact, code, req.purpose)
    return {
        "detail": f"OTP sent to {req.contact} via {req.channel}.",
        "dev_hint": "Check the terminal window running the Python server for the code.",
    }

# ── Auth: Verify OTP ──────────────────────────────────────────────────────────
@app.post("/api/v1/auth/otp/verify")
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

# ── Auth: Login (password) ────────────────────────────────────────────────────
@app.post("/api/v1/auth/login/password")
def login_password(req: LoginPasswordRequest):
    user = (database.get_user_by_email(req.identifier)
            or database.get_user_by_phone(req.identifier))
    if not user or not verify_password(req.password, user.get("password_hash") or ""):
        raise HTTPException(401, "Incorrect email/phone or password")
    return create_tokens(user["id"])

# ── Auth: Login (OTP) ─────────────────────────────────────────────────────────
@app.post("/api/v1/auth/login/otp")
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

# ── Auth: Get current user ────────────────────────────────────────────────────
@app.get("/api/v1/auth/me")
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

# ── Auth: Refresh tokens ──────────────────────────────────────────────────────
@app.post("/api/v1/auth/token/refresh")
def token_refresh(req: RefreshRequest):
    try:
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

# ── Auth: Password reset (request) ───────────────────────────────────────────
@app.post("/api/v1/auth/password/reset")
async def password_reset_request(req: PasswordResetRequest):
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, "password_reset")
    await send_otp(req.channel, req.contact, code, "password_reset")
    return {"detail": "Password reset OTP sent."}

# ── Auth: Password reset (confirm) ───────────────────────────────────────────
@app.post("/api/v1/auth/password/confirm")
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

# ── Users: Update profile ─────────────────────────────────────────────────────
@app.patch("/api/v1/users/me")
def update_profile(req: UpdateProfileRequest,
                   user_id: int = Depends(get_current_user_id)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if req.email and req.email != user["email"] and database.get_user_by_email(req.email):
        raise HTTPException(400, "Email already in use")
    if req.phone and req.phone != user["phone"] and database.get_user_by_phone(req.phone):
        raise HTTPException(400, "Phone number already in use")
    database.update_user_profile(
        user_id=user_id,
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
    )
    return database.get_user_by_id(user_id)

# ── Users: Upload photo ───────────────────────────────────────────────────────
@app.post("/api/v1/users/me/photo")
async def upload_photo(file: UploadFile = File(...),
                       user_id: int = Depends(get_current_user_id)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # Mock: use DiceBear avatars (replace with real storage in prod)
    avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={user['full_name']}"
    database.update_user_profile(user_id=user_id, profile_photo_url=avatar_url)
    return {"detail": "Profile photo updated", "profile_photo_url": avatar_url}

# ── Users: Verify secondary contact (send) ───────────────────────────────────
@app.post("/api/v1/users/me/verify-contact/send")
async def verify_contact_send(req: SendOTPRequest,
                              user_id: int = Depends(get_current_user_id)):
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, "verify_secondary")
    await send_otp(req.channel, req.contact, code, "verify_secondary")
    return {"detail": f"Verification OTP sent to {req.contact}."}

# ── Users: Verify secondary contact (confirm) ─────────────────────────────────
@app.post("/api/v1/users/me/verify-contact/confirm")
def verify_contact_confirm(req: VerifyOTPRequest,
                           user_id: int = Depends(get_current_user_id)):
    ok = database.verify_otp(req.contact, req.code, "verify_secondary")
    if not ok:
        raise HTTPException(400, "Invalid or expired verification code")
    if req.channel == "email":
        database.update_user_profile(user_id=user_id, email=req.contact)
        database.update_user_verification(user_id=user_id, email_verified=True)
    else:
        database.update_user_profile(user_id=user_id, phone=req.contact)
        database.update_user_verification(user_id=user_id, phone_verified=True)
    return {"detail": "Contact verified and linked to your profile."}

# ── AI: Chat ──────────────────────────────────────────────────────────────────
_agro_replies = [
    "To prevent root rot in tomatoes, ensure proper drainage and avoid overwatering. Apply copper-based fungicide if needed.",
    "Yellowing leaves often indicate nitrogen deficiency. Apply urea or a balanced NPK fertilizer.",
    "Rice blast is managed by avoiding excess nitrogen, planting resistant varieties, and using tricyclazole fungicides.",
    "For optimal wheat yield, sow between Nov 1–15 and maintain soil moisture during the CRI stage.",
    "To repel aphids organically, apply 1–2% neem oil spray or introduce ladybugs as biological control.",
    "Drip irrigation reduces water usage by 40–50% compared to flood irrigation for most vegetables.",
    "Soil testing every 2 years helps maintain optimal pH (6.0–7.0) and nutrient balance.",
]

@app.post("/api/v1/ai/chat")
def ai_chat(req: AIChatRequest):
    return {
        "reply": random.choice(_agro_replies),
        "usage": {"prompt_tokens": 12, "completion_tokens": 40},
    }

# ── AI: Diagnose ──────────────────────────────────────────────────────────────
_diseases = {
    "tomato": {"disease": "Early Blight (Alternaria solani)", "confidence": 98.4,
               "cause": "Fungal pathogen in warm, humid weather.",
               "treatment": "Prune lower leaves; apply copper fungicide every 7–10 days.",
               "prevention": "Rotate crops every 2–3 years; sanitise tools."},
    "rice":   {"disease": "Bacterial Leaf Blight (Xanthomonas oryzae)", "confidence": 97.2,
               "cause": "Bacterial pathogen via irrigation water and wind.",
               "treatment": "Avoid excess nitrogen; drain field to reduce humidity.",
               "prevention": "Use certified disease-free seeds; treat seedbeds with bleaching powder."},
    "wheat":  {"disease": "Leaf Rust (Puccinia recondita)", "confidence": 99.1,
               "cause": "Airborne fungal spores on wet leaves.",
               "treatment": "Apply triazole fungicides immediately; remove infected weeds.",
               "prevention": "Sow rust-resistant varieties; avoid late-season nitrogen overloading."},
}

@app.post("/api/v1/ai/diagnose")
async def ai_diagnose(
    image: UploadFile = File(...),
    crop_name: str = Form(...),
    description: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    language: str = Form("en"),
    user_id: int = Depends(get_current_user_id),
):
    r = _diseases.get(crop_name.lower(), {
        "disease": f"Leaf Spot (probable) on {crop_name.capitalize()}",
        "confidence": 84.0,
        "cause": "Mild nutrient deficiency or weather stress.",
        "treatment": "Apply balanced NPK and neem oil spray.",
        "prevention": "Regular watering schedule and weed management.",
    })
    return {
        "crop_name":  crop_name,
        "diagnosis":  r["disease"],
        "confidence": r["confidence"],
        "details":    {"cause": r["cause"], "treatment": r["treatment"], "prevention": r["prevention"]},
        "location":   location or "Unknown",
        "timestamp":  datetime.utcnow().isoformat(),
    }

# ── AI: Market price ──────────────────────────────────────────────────────────
_prices = {
    "tomato": {"avg": "28/kg", "range": "22–35/kg", "trend": "rising"},
    "rice":   {"avg": "42/kg", "range": "38–45/kg", "trend": "stable"},
    "wheat":  {"avg": "25/kg", "range": "24–27/kg", "trend": "falling"},
    "onion":  {"avg": "22/kg", "range": "18–28/kg", "trend": "rising"},
    "potato": {"avg": "18/kg", "range": "15–22/kg", "trend": "stable"},
}

@app.post("/api/v1/ai/market-price")
def ai_market_price(req: AIMarketRequest):
    p = _prices.get(req.crop_name.lower(), {"avg": "30/kg", "range": "20–40/kg", "trend": "stable"})
    return {
        "crop_name":     req.crop_name,
        "location":      req.location or "State Market",
        "average_price": f"Rs.{p['avg']}",
        "price_range":   f"Rs.{p['range']}",
        "trend":         p["trend"],
        "timestamp":     datetime.utcnow().isoformat(),
    }

# ── AI: Weather advisory ──────────────────────────────────────────────────────
@app.post("/api/v1/ai/weather-advisory")
def ai_weather_advisory(req: AIWeatherRequest):
    crop = req.crop_name or "general farming"
    return {
        "location":    req.location,
        "advisory":    (f"Advisory for {crop}: Light rainfall (3–5 mm) expected in 48 h. "
                        "Postpone chemical sprays and nitrogen applications. "
                        "Maintain drainage channels to prevent waterlogging."),
        "temperature": "29 C",
        "humidity":    "78%",
        "timestamp":   datetime.utcnow().isoformat(),
    }

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(os.path.dirname(__file__))],
    )
