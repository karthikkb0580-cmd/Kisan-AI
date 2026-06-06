import os
import sys
import io
import json
import re
import random
import time
import base64
import asyncio
import jwt
import bcrypt
import shutil
import uuid
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
import httpx

import database

# ── Force UTF-8 stdout so box chars don't crash on Windows cp1252 ─────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables from .env next to this file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ── Gemini Vision AI ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_gemini_client = None
GEMINI_MODEL   = "gemini-2.5-flash-lite"

if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_gemini"):
    try:
        from google import genai as _genai
        _gemini_client = _genai.Client(api_key=GEMINI_API_KEY)
        print(f"[Gemini] ✅ Client ready — default model: {GEMINI_MODEL}.")
        print(f"[Gemini]    Key prefix: {GEMINI_API_KEY[:8]}... (valid keys start with AIza)")
    except Exception as _e:
        print(f"[Gemini] ❌ Failed to load client: {type(_e).__name__}: {_e}")
else:
    print("[Gemini] ⚠️  No API key found — using smart mock fallback.")
    print("[Gemini]    → Get a free key at: https://aistudio.google.com/apikey")
    print("[Gemini]    → Add to server_python/.env:  GEMINI_API_KEY=AIzaSy...")

# ── HuggingFace PlantVillage MobileNetV2 ML Model (Free — no key needed) ──────
# Trained on PlantVillage dataset: 38 disease classes across 14 crop species.
# Public inference API, no auth required for basic usage (1000 req/day free).
HF_MODEL_ID  = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
HF_API_URL   = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"
HF_API_KEY   = os.getenv("HUGGINGFACE_API_KEY", "")  # optional – increases quota

# Maps PlantVillage label → (plant_type, disease_with_scientific_name)
PLANTVILLAGE_LABELS: Dict[str, tuple] = {
    "Apple___Apple_scab":                                   ("Apple",         "Apple Scab (Venturia inaequalis)"),
    "Apple___Black_rot":                                    ("Apple",         "Black Rot (Botryosphaeria obtusa)"),
    "Apple___Cedar_apple_rust":                             ("Apple",         "Cedar Apple Rust (Gymnosporangium juniperi-virginianae)"),
    "Apple___healthy":                                      ("Apple",         "Healthy"),
    "Blueberry___healthy":                                  ("Blueberry",     "Healthy"),
    "Cherry_(including_sour)___Powdery_mildew":             ("Cherry",        "Powdery Mildew (Podosphaera clandestina)"),
    "Cherry_(including_sour)___healthy":                    ("Cherry",        "Healthy"),
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot":   ("Corn (Maize)",  "Gray Leaf Spot (Cercospora zeae-maydis)"),
    "Corn_(maize)___Common_rust_":                          ("Corn (Maize)",  "Common Rust (Puccinia sorghi)"),
    "Corn_(maize)___Northern_Leaf_Blight":                  ("Corn (Maize)",  "Northern Leaf Blight (Exserohilum turcicum)"),
    "Corn_(maize)___healthy":                               ("Corn (Maize)",  "Healthy"),
    "Grape___Black_rot":                                    ("Grape",         "Black Rot (Guignardia bidwellii)"),
    "Grape___Esca_(Black_Measles)":                         ("Grape",         "Esca / Black Measles (Phaeomoniella chlamydospora)"),
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)":           ("Grape",         "Leaf Blight (Isariopsis clavispora)"),
    "Grape___healthy":                                      ("Grape",         "Healthy"),
    "Orange___Haunglongbing_(Citrus_greening)":             ("Orange",        "Huanglongbing / Citrus Greening (Candidatus Liberibacter spp.)"),
    "Peach___Bacterial_spot":                               ("Peach",         "Bacterial Spot (Xanthomonas arboricola pv. pruni)"),
    "Peach___healthy":                                      ("Peach",         "Healthy"),
    "Pepper,_bell___Bacterial_spot":                        ("Bell Pepper",   "Bacterial Spot (Xanthomonas campestris pv. vesicatoria)"),
    "Pepper,_bell___healthy":                               ("Bell Pepper",   "Healthy"),
    "Potato___Early_blight":                                ("Potato",        "Early Blight (Alternaria solani)"),
    "Potato___Late_blight":                                 ("Potato",        "Late Blight (Phytophthora infestans)"),
    "Potato___healthy":                                     ("Potato",        "Healthy"),
    "Raspberry___healthy":                                  ("Raspberry",     "Healthy"),
    "Soybean___healthy":                                    ("Soybean",       "Healthy"),
    "Squash___Powdery_mildew":                              ("Squash",        "Powdery Mildew (Sphaerotheca fuliginea)"),
    "Strawberry___Leaf_scorch":                             ("Strawberry",    "Leaf Scorch (Diplocarpon earlianum)"),
    "Strawberry___healthy":                                 ("Strawberry",    "Healthy"),
    "Tomato___Bacterial_spot":                              ("Tomato",        "Bacterial Spot (Xanthomonas campestris pv. vesicatoria)"),
    "Tomato___Early_blight":                                ("Tomato",        "Early Blight (Alternaria solani)"),
    "Tomato___Late_blight":                                 ("Tomato",        "Late Blight (Phytophthora infestans)"),
    "Tomato___Leaf_Mold":                                   ("Tomato",        "Leaf Mold (Fulvia fulva)"),
    "Tomato___Septoria_leaf_spot":                          ("Tomato",        "Septoria Leaf Spot (Septoria lycopersici)"),
    "Tomato___Spider_mites Two-spotted_spider_mite":        ("Tomato",        "Spider Mites / Two-Spotted Mite (Tetranychus urticae)"),
    "Tomato___Target_Spot":                                 ("Tomato",        "Target Spot (Corynespora cassiicola)"),
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus":               ("Tomato",        "Yellow Leaf Curl Virus (TYLCV)"),
    "Tomato___Tomato_mosaic_virus":                         ("Tomato",        "Mosaic Virus (ToMV)"),
    "Tomato___healthy":                                     ("Tomato",        "Healthy"),
}

async def classify_plant_disease_hf(image_bytes: bytes) -> Optional[dict]:
    """
    Classify plant disease using the free HuggingFace PlantVillage MobileNetV2 model.
    Covers 38 disease classes across 14 crops — no API key required for basic usage.
    Returns top prediction dict or None on failure.
    """
    headers = {"Content-Type": "application/octet-stream"}
    if HF_API_KEY:
        headers["Authorization"] = f"Bearer {HF_API_KEY}"

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=40) as client:
                r = await client.post(HF_API_URL, content=image_bytes, headers=headers)

            if r.status_code == 200:
                preds = r.json()
                if not isinstance(preds, list) or not preds:
                    return None
                top   = preds[0]
                label = top.get("label", "")
                score = top.get("score", 0.0)
                # Resolve label → (plant_type, disease)
                match = PLANTVILLAGE_LABELS.get(label)
                if not match:
                    # Case-insensitive fallback
                    label_norm = label.lower().replace(" ", "_")
                    for k, v in PLANTVILLAGE_LABELS.items():
                        if k.lower().replace(" ", "_") == label_norm:
                            match = v
                            break
                if match:
                    print(f"[HF-ML] Detected: {match[1]} in {match[0]} — confidence {round(score*100)}%")
                    return {
                        "plantType":   match[0],
                        "disease":     match[1],
                        "confidence":  f"{round(score * 100)}%",
                        "modelSource": "PlantVillage MobileNetV2",
                        "isHealthy":   "healthy" in label.lower(),
                    }
                return None

            elif r.status_code == 503 and attempt == 0:
                # Model cold-starting on HuggingFace — wait and retry once
                wait_secs = min(r.json().get("estimated_time", 20), 30)
                print(f"[HF-ML] Model loading… retrying in {wait_secs}s")
                await asyncio.sleep(wait_secs)
                continue

            else:
                print(f"[HF-ML] API error {r.status_code}: {r.text[:200]}")
                return None

        except Exception as exc:
            print(f"[HF-ML] Request failed: {exc}")
            return None

    return None

# ── Gemini treatment-only prompt (used when HF model provides the diagnosis) ───
_GEMINI_TREATMENT_PROMPT = """
You are Dr. KrishiAI, an expert plant pathologist.
A dedicated plant disease ML model (MobileNetV2 trained on PlantVillage) has already identified:
  Plant : {plant_type}
  Disease: {disease_name}

Your task: provide detailed, actionable treatment information for this specific disease.
Return ONLY a raw JSON object — no markdown fences, no extra text.

{{
  "plantType": "{plant_type}",
  "disease": "{disease_name}",
  "severity": "None|Low|Medium|High|Critical",
  "severityLevel": "healthy|info|warning|critical",
  "affectedArea": "estimated XX%",
  "diagnosis": "2-3 sentences describing this disease's key visible symptoms and conditions.",
  "treatments": [
    {{"id":"t1","label":"Chemical Treatment","name":"Product name + formulation","dosage":"Exact dose + timing","color":"#15803d","bg":"#f0fdf4","border":"#22c55e"}},
    {{"id":"t2","label":"Organic / Bio Remedy","name":"Organic/bio agent","dosage":"Preparation + dosage","color":"#854d0e","bg":"#fef9c3","border":"#eab308"}}
  ],
  "precaution": "2-3 preventive cultural practices.",
  "additionalNotes": "Spread risk, weather triggers, or secondary infection risk."
}}

Rules:
- If disease is "Healthy": severity="None", severityLevel="healthy", treatments=[], affectedArea="0%"
- Use Indian/regional market product names where possible
- Raw JSON only
"""


# ── Force UTF-8 stdout so box chars don't crash on Windows cp1252 ─────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables from .env next to this file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Initialize SQLite DB (creates tables if missing)
database.init_db()


app = FastAPI(title="Krishi AI Backend", version="1.0.0")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

allow_all = "*" in allowed_origins or not env_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else allowed_origins,
    allow_credentials=False if allow_all else True,
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

# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "Krishi AI Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }

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
                       user_id: int = Depends(get_current_user_id),
                       request: Request = None):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    new_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    base_url = str(request.base_url).rstrip('/') if request else "http://localhost:8000"
    avatar_url = f"{base_url}/uploads/{new_filename}"
    
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

# ── Gemini prompt template ────────────────────────────────────────────────────
_GEMINI_PROMPT = """
You are Dr. KrishiAI, an expert plant pathologist AI assistant trained on thousands of crop disease cases.
Analyze the provided plant/leaf image carefully and return ONLY a raw JSON object — no markdown, no code blocks, no extra text.

Return this exact JSON structure:
{
  "plantType": "Name of the identified plant or crop",
  "disease": "Disease name with scientific name in parentheses (e.g., Early Blight (Alternaria solani))",
  "severity": "None|Low|Medium|High|Critical",
  "severityLevel": "healthy|info|warning|critical",
  "confidence": "XX%",
  "affectedArea": "XX%",
  "diagnosis": "Detailed 2-3 sentence clinical description of visible symptoms, lesion morphology, and environmental triggers.",
  "treatments": [
    {
      "id": "t1",
      "label": "Chemical Treatment",
      "name": "Specific fungicide/pesticide product name with formulation (e.g., Mancozeb 75% WP)",
      "dosage": "Exact dosage per acre/litre with timing and application method.",
      "color": "#15803d",
      "bg": "#f0fdf4",
      "border": "#22c55e"
    },
    {
      "id": "t2",
      "label": "Organic / Bio Remedy",
      "name": "Organic or biological control agent name",
      "dosage": "Organic treatment dosage, timing, and preparation instructions.",
      "color": "#854d0e",
      "bg": "#fef9c3",
      "border": "#eab308"
    }
  ],
  "precaution": "2-3 key preventive cultural practices for future crops.",
  "additionalNotes": "Epidemiology, spread risk, weather conditions, or secondary infection risk."
}

Rules:
- If plant is healthy: severity="None", severityLevel="healthy", affectedArea="0%", treatments=[]
- If not a plant/leaf image: disease="Not a Plant Image", severityLevel="info", severity="Low", confidence="100%", affectedArea="0%", treatments=[], diagnosis="The uploaded image does not appear to contain a plant or crop. Please capture a clear photo of a leaf, stem, or affected plant area."
- Confidence should reflect your certainty (85-99% for clear images, 60-84% for ambiguous)
- Use Indian market fungicide/pesticide product names where possible
- Always respond with raw JSON only
"""

# ── Fallback mock diagnoses (used when GEMINI_API_KEY not set) ────────────────
_MOCK_RESULTS = [
    {
        "plantType": "Tomato", "disease": "Early Blight (Alternaria solani)",
        "severity": "High", "severityLevel": "warning",
        "confidence": "94%", "affectedArea": "35%",
        "diagnosis": "Dark brown concentric ring lesions with yellow halos on lower leaves. Warm, humid conditions are accelerating fungal sporulation. Significant defoliation risk if untreated within 7 days.",
        "treatments": [
            {"id": "t1", "label": "Chemical Treatment", "name": "Mancozeb 75% WP (Dithane M-45)",
             "dosage": "Apply 600g per acre dissolved in 200L water. Repeat every 7-10 days.",
             "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"},
            {"id": "t2", "label": "Organic / Bio Remedy", "name": "Neem Oil + Copper Sulphate Spray",
             "dosage": "Mix 5ml neem oil + 2g copper sulphate per litre. Apply weekly in early morning.",
             "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"}
        ],
        "precaution": "Rotate crops every 2 years. Remove infected lower leaves immediately. Avoid overhead irrigation.",
        "additionalNotes": "Spores spread via wind and water splash. Monitor adjacent tomato and potato plants for early symptoms."
    },
    {
        "plantType": "Rice", "disease": "Bacterial Leaf Blight (Xanthomonas oryzae pv. oryzae)",
        "severity": "Critical", "severityLevel": "critical",
        "confidence": "97%", "affectedArea": "60%",
        "diagnosis": "Water-soaked lesions along leaf margins turning yellow then white-straw colored. Kresek phase observed in young plants causing wilting. High temperature and flood-prone conditions are aggravating bacterial spread.",
        "treatments": [
            {"id": "t1", "label": "Chemical Treatment", "name": "Streptocycline 90% + Copper Oxychloride 50% WP",
             "dosage": "Mix 1g Streptocycline + 2.5g Copper Oxychloride per litre. Spray 200L per acre.",
             "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"},
            {"id": "t2", "label": "Organic / Bio Remedy", "name": "Pseudomonas fluorescens Bio-agent",
             "dosage": "Apply 1kg/acre as soil drench or foliar spray at 0.5% concentration.",
             "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"}
        ],
        "precaution": "Drain fields after heavy rain. Avoid excess nitrogen. Use certified disease-free seeds.",
        "additionalNotes": "Pathogen survives in seed, infected stubble and irrigation water. Isolate field immediately."
    },
]

@app.post("/api/v1/ai/diagnose")
async def ai_diagnose(
    image: UploadFile = File(...),
    crop_name: str = Form(""),
    description: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    language: str = Form("en"),
    authorization: Optional[str] = Header(None),
):
    """3-stage plant disease analyser:
    Stage 1 — HuggingFace PlantVillage MobileNetV2 (free ML model, 38 disease classes)
    Stage 2 — Gemini AI generates detailed treatment plan for the ML-detected disease
    Stage 3 — Smart mock fallback if both stages are unavailable
    """
    image_bytes  = await image.read()
    content_type = image.content_type or "image/jpeg"

    # ── STAGE 1: HuggingFace PlantVillage MobileNetV2 ML Model ───────────────
    print("[Diagnose] Stage 1: Running PlantVillage MobileNetV2 classifier...")
    hf_result = await classify_plant_disease_hf(image_bytes)

    if hf_result:
        plant_type = hf_result["plantType"]
        disease    = hf_result["disease"]
        ml_conf    = hf_result["confidence"]
        is_healthy = hf_result["isHealthy"]
        print(f"[Diagnose] ML Model -> {disease} ({plant_type}) @ {ml_conf}")

        # Healthy plant: return immediately without needing treatment details
        if is_healthy:
            return {
                "plantType":      plant_type,
                "disease":        "Healthy - No Disease Detected",
                "severity":       "None",
                "severityLevel":  "healthy",
                "confidence":     ml_conf,
                "affectedArea":   "0%",
                "diagnosis":      f"The {plant_type} plant appears healthy with no visible signs of disease, pest damage, or nutrient deficiency.",
                "treatments":     [],
                "precaution":     "Maintain proper irrigation and balanced fertilisation. Inspect weekly for early symptoms.",
                "additionalNotes":"Continue current crop management practices. Monitor surrounding plants for any disease onset.",
                "modelSource":    "PlantVillage MobileNetV2",
                "timestamp":      datetime.utcnow().isoformat(),
                "location":       location or "Unknown",
            }

        # ── STAGE 2: Gemini generates treatment details for ML-detected disease
        if _gemini_client is not None:
            print("[Diagnose] Stage 2: Gemini generating treatment plan...")
            try:
                prompt = _GEMINI_TREATMENT_PROMPT.format(
                    plant_type=plant_type,
                    disease_name=disease,
                )
                models_to_try = [GEMINI_MODEL, "gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"]
                response = None
                for model_name in models_to_try:
                    try:
                        response = _gemini_client.models.generate_content(
                            model=model_name, contents=[prompt]
                        )
                        break
                    except Exception as _me:
                        print(f"[Gemini] Model {model_name} failed: {type(_me).__name__}")

                if response:
                    raw = response.text.strip()
                    raw = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
                    raw = re.sub(r'^```\s*', '', raw)
                    raw = re.sub(r'\s*```$', '', raw)
                    result = json.loads(raw)
                    result["plantType"]   = plant_type
                    result["disease"]     = disease
                    result["confidence"]  = ml_conf
                    result["modelSource"] = "PlantVillage MobileNetV2 + Gemini AI"
                    for t in result.get("treatments", []):
                        if t.get("id") == "t1":
                            t.setdefault("color", "#15803d"); t.setdefault("bg", "#f0fdf4"); t.setdefault("border", "#22c55e")
                        elif t.get("id") == "t2":
                            t.setdefault("color", "#854d0e"); t.setdefault("bg", "#fef9c3"); t.setdefault("border", "#eab308")
                    result["timestamp"] = datetime.utcnow().isoformat()
                    result["location"]  = location or "Unknown"
                    print(f"[Diagnose] HF+Gemini pipeline success: {disease}")
                    return result

            except Exception as exc:
                print(f"[Diagnose] Gemini treatment step failed: {exc}")

        # Gemini unavailable: find matching mock treatment for the ML-detected disease
        mock_match = next(
            (m for m in _MOCK_RESULTS
             if plant_type.lower() in m["plantType"].lower()
             or m["disease"].lower().split("(")[0].strip() in disease.lower()),
            None
        )
        if mock_match:
            result = dict(mock_match)
            result["plantType"]   = plant_type
            result["disease"]     = disease
            result["confidence"]  = ml_conf
            result["modelSource"] = "PlantVillage MobileNetV2"
            result["timestamp"]   = datetime.utcnow().isoformat()
            result["location"]    = location or "Unknown"
            return result

    # ── STAGE 3 (Fallback): Gemini Vision full image analysis ────────────────
    print("[Diagnose] Stage 3: HF model unavailable - trying Gemini Vision...")
    if _gemini_client is not None:
        try:
            from google.genai import types as _gtypes
            hint   = f" Farmer reports the crop as: {crop_name}." if crop_name else ""
            prompt = _GEMINI_PROMPT + hint
            models_to_try = [GEMINI_MODEL, "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"]
            response = None
            last_err = None
            for model_name in models_to_try:
                try:
                    print(f"[Gemini] Attempting diagnosis with model: {model_name}...")
                    response = _gemini_client.models.generate_content(
                        model=model_name,
                        contents=[
                            _gtypes.Part.from_bytes(data=image_bytes, mime_type=content_type),
                            prompt,
                        ],
                    )
                    print(f"[Gemini] Success with model: {model_name}!")
                    break
                except Exception as exc:
                    last_err = exc
                    print(f"[Gemini] Model {model_name} failed: {type(exc).__name__}")
            if response is None:
                raise last_err
            raw    = response.text.strip()
            raw    = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
            raw    = re.sub(r'^```\s*', '',  raw)
            raw    = re.sub(r'\s*```$', '',  raw)
            result = json.loads(raw)
            for t in result.get("treatments", []):
                if t.get("id") == "t1":
                    t.setdefault("color", "#15803d"); t.setdefault("bg", "#f0fdf4"); t.setdefault("border", "#22c55e")
                elif t.get("id") == "t2":
                    t.setdefault("color", "#854d0e"); t.setdefault("bg", "#fef9c3"); t.setdefault("border", "#eab308")
            result["modelSource"] = "Gemini Vision AI"
            result["timestamp"]   = datetime.utcnow().isoformat()
            result["location"]    = location or "Unknown"
            print(f"[Gemini] Diagnosed: {result.get('disease')} - confidence {result.get('confidence')}")
            return result
        except json.JSONDecodeError as je:
            print(f"[Gemini] JSON parse error: {je}")
        except Exception as exc:
            print(f"[Gemini] Vision fallback failed: {exc}")

    # ── FINAL MOCK FALLBACK ────────────────────────────────────────────────────
    crop_lower = (crop_name or "").lower()
    mock = next(
        (m for m in _MOCK_RESULTS if crop_lower in m["plantType"].lower()),
        random.choice(_MOCK_RESULTS)
    )
    result = dict(mock)
    result["timestamp"]   = datetime.utcnow().isoformat()
    result["location"]    = location or "Unknown"
    result["modelSource"] = "Demo Data"
    result["_note"] = (
        "DEMO MODE: PlantVillage ML model and Gemini are both unavailable. "
        "Add GEMINI_API_KEY to server_python/.env for real AI diagnosis."
    )
    print("[Diagnose] Returning MOCK data - all AI stages failed.")
    return result


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
