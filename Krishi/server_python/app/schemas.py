from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    verification_method: Optional[str] = "email"

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

class FirebaseLoginRequest(BaseModel):
    phone: str
    full_name: Optional[str] = None

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

class MarketItem(BaseModel):
    id: str | int
    name: str
    address: str
    lat: float
    lng: float
    type: str

class AIAnalyzeMarketsRequest(BaseModel):
    markets: List[MarketItem]
    crop_name: str
    language: str = "en"

class CropPriceTrendsRequest(BaseModel):
    crop_name: str
    market_name: str = "Local APMC Mandi"
    days_history: int = 30
    forecast_days: int = 14
