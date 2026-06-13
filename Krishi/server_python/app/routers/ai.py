import random
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File, Header

from app.schemas import (
    AIChatRequest,
    AIMarketRequest,
    AIWeatherRequest,
    AIAnalyzeMarketsRequest
)
from app.config import _agro_replies, _prices
from app.services.ml_service import run_disease_diagnosis, run_market_analysis

router = APIRouter(prefix="/api/v1/ai", tags=["AI Agricultural Features"])

@router.post("/chat")
def ai_chat(req: AIChatRequest):
    return {
        "reply": random.choice(_agro_replies),
        "usage": {"prompt_tokens": 12, "completion_tokens": 40},
    }

@router.post("/diagnose")
async def ai_diagnose(
    image: UploadFile = File(...),
    crop_name: str = Form(""),
    description: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    language: str = Form("en"),
    authorization: Optional[str] = Header(None),
):
    """3-stage plant disease analyser:
    Stage 1 — Gemini Vision AI (full image analysis — most accurate)
    Stage 2 — HuggingFace PlantVillage MobileNetV2 (free ML model, 38 disease classes)
    Stage 3 — Smart mock fallback if both stages are unavailable
    """
    image_bytes = await image.read()
    content_type = image.content_type or "image/jpeg"
    
    result = await run_disease_diagnosis(
        image_bytes=image_bytes,
        content_type=content_type,
        crop_name=crop_name,
        description=description,
        location=location,
        language=language
    )
    return result

@router.post("/market-price")
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

@router.post("/analyze-markets")
def ai_analyze_markets(req: AIAnalyzeMarketsRequest):
    if not req.markets:
        return []
        
    markets_list = [m.model_dump() for m in req.markets]
    result = run_market_analysis(markets=markets_list, crop_name=req.crop_name)
    return result

@router.post("/weather-advisory")
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
