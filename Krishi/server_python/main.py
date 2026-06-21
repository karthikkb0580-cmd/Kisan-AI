import os
import sys
import time
from datetime import datetime
from typing import List, Dict
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from app import database
from app.config import ALLOWED_ORIGINS, UPLOAD_DIR
from app.routers import auth, users, ai

# ── Force UTF-8 stdout so box chars don't crash on Windows cp1252 ─────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables from .env next to this file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Initialize Database (creates tables if missing)
database.init_db()

# Seed default users
auth.seed_users()

# Initialize FastAPI App
app = FastAPI(
    title="Krishi AI Backend",
    version="1.0.0",
    description="REST API backend for Krishi AI agricultural application"
)

# ── Static Uploads Mount ──────────────────────────────────────────────────────
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── CORS Middleware ───────────────────────────────────────────────────────────
allow_all = "*" in ALLOWED_ORIGINS or not os.getenv("ALLOWED_ORIGINS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else ALLOWED_ORIGINS,
    allow_credentials=False if allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── In-Memory Rate Limiter (Optional helper) ──────────────────────────────────
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

# ── Include Routers ───────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(ai.router)

# ── Root / Health Endpoints ───────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "Krishi AI Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

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
