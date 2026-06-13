import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Header, HTTPException
from app.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TTL, REFRESH_TTL

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(pw: str, hashed: str) -> bool:
    if not pw or not hashed:
        return False
    return bcrypt.checkpw(pw.encode(), hashed.encode())

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
