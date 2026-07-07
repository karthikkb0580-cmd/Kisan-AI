import os
import sys
import time
import asyncio
import logging
from datetime import datetime
from typing import List, Dict
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from app import database
from app.config import ALLOWED_ORIGINS, UPLOAD_DIR
from app.routers import auth, users, ai

# ── Force UTF-8 stdout ────────────────────────────────────────────────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables from .env next to this file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

logger = logging.getLogger("krishi")
logging.basicConfig(level=logging.INFO)

# Initialize FastAPI App
app = FastAPI(
    title="Krishi AI Backend",
    version="1.0.0",
    description="REST API backend for Krishi AI agricultural application",
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

# ── In-Memory Rate Limiter ────────────────────────────────────────────────────
_rate_store: Dict[str, List[float]] = {}

def rate_limiter(max_requests: int = 10, window_seconds: int = 60):
    def _dep(request: Request):
        ip = request.client.host if request.client else "unknown"
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

# ── UptimeRobot Keep-Alive (secondary safety net for Render free tier) ────────
# Primary keep-alive: UptimeRobot pings /health every 5 minutes (external, free)
# Secondary: this internal loop also pings if RENDER_EXTERNAL_URL is set.
# Set RENDER_EXTERNAL_URL in Render → Environment to enable the internal ping.

_PING_INTERVAL = 8 * 60  # 8 minutes (UptimeRobot pings every 5 — this is backup)

async def _keep_alive_loop():
    await asyncio.sleep(60)  # Wait for server to fully start

    render_url = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")
    if not render_url:
        logger.info(
            "[KeepAlive] RENDER_EXTERNAL_URL not set — internal ping disabled. "
            "Use UptimeRobot (free) to ping /health every 5 min instead."
        )
        return

    ping_url = f"{render_url}/health"
    logger.info(f"[KeepAlive] Internal ping active → {ping_url} every {_PING_INTERVAL // 60} min")

    while True:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(ping_url)
                logger.info(f"[KeepAlive] Ping OK — HTTP {resp.status_code}")
        except Exception as exc:
            logger.warning(f"[KeepAlive] Ping failed: {exc}")
        await asyncio.sleep(_PING_INTERVAL)


@app.on_event("startup")
async def startup_event():
    # ── Env-var diagnostics (visible in Render logs) ──────────────────────────
    required = ["DATABASE_URL", "JWT_SECRET", "GEMINI_API_KEY"]
    missing  = [k for k in required if not os.getenv(k)]
    if missing:
        logger.warning(f"[Startup] ⚠️  Missing env vars: {missing} — some features may not work")
    else:
        logger.info("[Startup] ✅ All required env vars present")

    # ── Database initialisation (moved here so crash gives a clear log) ───────
    db_type = "PostgreSQL (Supabase)" if database.IS_POSTGRES else "SQLite (local dev)"
    logger.info(f"[Startup] Initialising DB: {db_type}")
    try:
        database.init_db()
        logger.info("[Startup] ✅ Database tables ready")
    except Exception as exc:
        logger.error(
            f"[Startup] ❌ DB init FAILED: {exc}\n"
            "  → Check DATABASE_URL in Render → Environment.\n"
            "  → Format: postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
        )
        # Don't crash the server — endpoints that need the DB will return 500

    db_type = "PostgreSQL (Supabase)" if database.IS_POSTGRES else "SQLite (local dev)"
    logger.info(f"[Startup] Krishi AI backend running — DB: {db_type}")
    asyncio.create_task(_keep_alive_loop())


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("[Shutdown] Krishi AI backend shutting down.")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        reload_dirs=[str(os.path.dirname(__file__))],
    )
