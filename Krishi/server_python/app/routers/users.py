import os
import uuid
import shutil
import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request

from app import database
from app.config import UPLOAD_DIR
from app.schemas import UpdateProfileRequest, SendOTPRequest, VerifyOTPRequest
from app.services.auth_helpers import get_current_user_id
import logging
from app.services.email_service import send_otp_email

logger = logging.getLogger("krishi.users")

def _send_otp_helper(channel: str, contact: str, code: str, purpose: str) -> bool:
    if channel == "email":
        return send_otp_email(to_email=contact, otp=code, purpose=purpose)
    else:
        logger.warning(f"[SMS DEV-MODE] OTP for {contact} (purpose={purpose}): {code}")
        print(f"\n[SMS DEV-MODE] OTP for {contact} (purpose={purpose}): {code}\n")
        return True

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

@router.patch("/me")
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

@router.post("/me/photo")
async def upload_photo(file: UploadFile = File(...),
                       user_id: int = Depends(get_current_user_id),
                       request: Request = None):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    new_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    # Ensure upload dir exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    base_url = str(request.base_url).rstrip('/') if request else "http://localhost:8000"
    avatar_url = f"{base_url}/uploads/{new_filename}"
    
    database.update_user_profile(user_id=user_id, profile_photo_url=avatar_url)
    return {"detail": "Profile photo updated", "profile_photo_url": avatar_url}

@router.post("/me/verify-contact/send")
async def verify_contact_send(req: SendOTPRequest,
                              user_id: int = Depends(get_current_user_id)):
    code = f"{random.randint(100000, 999999)}"
    database.save_otp(req.contact, code, "verify_secondary")
    _send_otp_helper(req.channel, req.contact, code, "verify_secondary")
    return {"detail": f"Verification OTP sent to {req.contact}."}

@router.post("/me/verify-contact/confirm")
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
