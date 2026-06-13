import json
import re
import random
import asyncio
import httpx
from datetime import datetime
from typing import Optional, List, Dict

from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    HF_API_URL,
    HF_API_KEY,
    PLANTVILLAGE_LABELS,
    _GEMINI_TREATMENT_PROMPT,
    _GEMINI_PROMPT,
    _MOCK_RESULTS,
    _MARKET_ANALYSIS_PROMPT
)

# Initialize Gemini Client
_gemini_client = None
if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_gemini"):
    try:
        from google import genai as _genai
        _gemini_client = _genai.Client(api_key=GEMINI_API_KEY)
        print(f"[Gemini] ✅ Client ready — default model: {GEMINI_MODEL}.")
    except Exception as _e:
        print(f"[Gemini] ❌ Failed to load client: {type(_e).__name__}: {_e}")
else:
    print("[Gemini] ⚠️  No API key found — using smart mock fallback.")

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

def get_fallback_treatment(plant_type: str, disease_name: str) -> dict:
    disease_lower = disease_name.lower()
    
    # Defaults
    severity = "Medium"
    severity_level = "warning"
    affected_area = "20%"
    diagnosis = f"Visible symptoms of {disease_name} observed on the leaves/stems of the {plant_type} plant. Prompt management is advised to prevent further spread."
    precaution = "Practice crop rotation, maintain field sanitation, and avoid overhead watering to reduce leaf moisture."
    additional_notes = "Monitor weather conditions; warm and humid environments favor the propagation of this pathogen."
    
    treatments = []
    
    if "healthy" in disease_lower:
        severity = "None"
        severity_level = "healthy"
        affected_area = "0%"
        diagnosis = f"The {plant_type} plant appears healthy with no visible signs of disease, pest damage, or nutrient deficiency."
        precaution = "Maintain proper irrigation and balanced fertilisation. Inspect weekly for early symptoms."
        additional_notes = "Continue current crop management practices. Monitor surrounding plants for any disease onset."
        treatments = []
    elif "blight" in disease_lower:
        severity = "High" if "early" in disease_lower else "Critical"
        severity_level = "warning" if "early" in disease_lower else "critical"
        affected_area = "35%"
        diagnosis = f"Dark brown or water-soaked lesions developing rapidly on the {plant_type} leaves, typical of blight. High humidity triggers rapid spore release."
        precaution = "Ensure wider spacing for aeration. Remove and burn infected crop residues."
        additional_notes = "Blight pathogens spread quickly through wind-blown rain. Check weather reports for rain/humidity alerts."
        treatments = [
            {
                "id": "t1",
                "label": "Chemical Treatment",
                "name": "Mancozeb 75% WP or Copper Oxychloride 50% WP",
                "dosage": "Apply 600g per acre in 200L water. Repeat after 10 days if humid conditions persist.",
                "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"
            },
            {
                "id": "t2",
                "label": "Organic / Bio Remedy",
                "name": "Pseudomonas fluorescens formulation",
                "dosage": "Mix 5g/L water and spray early morning. Apply neem cake (100kg/acre) to soil.",
                "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"
            }
        ]
    elif "rust" in disease_lower:
        severity = "Medium"
        severity_level = "warning"
        affected_area = "20%"
        diagnosis = f"Powdery orange-brown pustules developing on the under-surface of {plant_type} leaves. Spores are easily carried by wind."
        precaution = "Plant resistant cultivars. Keep field free of volunteer host plants."
        additional_notes = "Favorable temperature range for rust is 18-25°C. Spreads faster in dew-laden mornings."
        treatments = [
            {
                "id": "t1",
                "label": "Chemical Treatment",
                "name": "Propiconazole 25% EC (Tilt) or Hexaconazole 5% EC",
                "dosage": "Mix 1 ml per litre of water. Spray immediately when pustules are noticed.",
                "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"
            },
            {
                "id": "t2",
                "label": "Organic / Bio Remedy",
                "name": "Wettable Sulfur 80% WP or Neem Oil 1%",
                "dosage": "Dust sulfur at 10kg/acre, or spray neem oil (10ml/L with emulsifier) weekly.",
                "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"
            }
        ]
    elif "rot" in disease_lower:
        severity = "High"
        severity_level = "warning"
        affected_area = "30%"
        diagnosis = f"Soft, water-soaked brown lesions causing decay of plant tissue in {plant_type}. Roots or stems may exhibit dark necrosis."
        precaution = "Improve drainage. Avoid waterlogging around root zones. Avoid wounding plants during weeding."
        additional_notes = "Soilborne pathogens are responsible for rot. Avoid planting susceptible crops in the same field consecutively."
        treatments = [
            {
                "id": "t1",
                "label": "Chemical Treatment",
                "name": "Carbendazim 50% WP or Metalaxyl 8% + Mancozeb 64% WP",
                "dosage": "Soil drench with 2g per litre of water around the root zone of affected plants.",
                "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"
            },
            {
                "id": "t2",
                "label": "Organic / Bio Remedy",
                "name": "Trichoderma viride or Trichoderma harzianum",
                "dosage": "Apply 2kg per acre mixed with 100kg organic compost to the root zone.",
                "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"
            }
        ]
    elif any(term in disease_lower for term in ["spot", "scab", "scorch", "mold", "mildew"]):
        severity = "Medium"
        severity_level = "warning"
        affected_area = "25%"
        diagnosis = f"Circular or irregular spots with yellow margins appearing on {plant_type} foliage. May cause premature defoliation if left unchecked."
        precaution = "Prune lower leaves to facilitate airflow. Water at the base, not overhead."
        additional_notes = "Pathogens overwinter in fallen leaves. Raking and clearing debris reduces inoculum level next season."
        treatments = [
            {
                "id": "t1",
                "label": "Chemical Treatment",
                "name": "Chlorothalonil 75% WP or Tebuconazole 250 EC",
                "dosage": "Mix 2g Chlorothalonil or 1 ml Tebuconazole per litre of water. Spray twice at 10-day interval.",
                "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"
            },
            {
                "id": "t2",
                "label": "Organic / Bio Remedy",
                "name": "Baking Soda + Neem Oil Spray",
                "dosage": "Mix 5g baking soda + 5ml neem oil + 2ml liquid soap in 1L water. Spray weekly.",
                "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"
            }
        ]
    elif any(term in disease_lower for term in ["virus", "mosaic", "greening", "curl", "mite"]):
        severity = "Critical"
        severity_level = "critical"
        affected_area = "45%"
        diagnosis = f"Severe leaf curling, mosaic mottling, or yellowing on {plant_type} leaves. Growth is stunted. Transmitted primarily by insect vectors like whiteflies, aphids, or thrips."
        precaution = "Uproot and burn severely infected plants. Use insect-proof net nurseries. Control weed hosts."
        additional_notes = "Viruses cannot be cured chemically. Management must focus on controlling the sap-sucking insect vectors."
        treatments = [
            {
                "id": "t1",
                "label": "Chemical Vector Control",
                "name": "Imidacloprid 17.8% SL or Thiamethoxam 25% WG",
                "dosage": "Mix 0.5 ml Imidacloprid or 0.3g Thiamethoxam per litre. Spray to control aphids/whiteflies.",
                "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"
            },
            {
                "id": "t2",
                "label": "Organic Vector Control",
                "name": "Yellow Sticky Traps + Neem Oil 2%",
                "dosage": "Install 15 yellow sticky traps per acre. Spray neem oil (20ml/L water) to repel insect vectors.",
                "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"
            }
        ]
    else:
        # Generic disease template
        treatments = [
            {
                "id": "t1",
                "label": "Chemical Treatment",
                "name": "Broad-spectrum Fungicide / Pesticide",
                "dosage": "Consult local agricultural officer. Generally 2g/L of standard copper fungicide.",
                "color": "#15803d", "bg": "#f0fdf4", "border": "#22c55e"
            },
            {
                "id": "t2",
                "label": "Organic / Bio Remedy",
                "name": "Neem-based Bio-pesticide 1.5%",
                "dosage": "Spray at 3-5ml per litre of water during evening hours.",
                "color": "#854d0e", "bg": "#fef9c3", "border": "#eab308"
            }
        ]
        
    return {
        "plantType": plant_type,
        "disease": disease_name,
        "severity": severity,
        "severityLevel": severity_level,
        "affectedArea": affected_area,
        "diagnosis": diagnosis,
        "treatments": treatments,
        "precaution": precaution,
        "additionalNotes": additional_notes
    }

async def run_disease_diagnosis(
    image_bytes: bytes,
    content_type: str,
    crop_name: str = "",
    description: Optional[str] = None,
    location: Optional[str] = None,
    language: str = "en"
) -> dict:
    """3-stage plant disease analyser:
    Stage 1 — Gemini Vision AI (full image analysis — most accurate)
    Stage 2 — HuggingFace PlantVillage MobileNetV2 (free ML model, 38 disease classes)
    Stage 3 — Smart mock fallback if both stages are unavailable
    """
    
    # ── STAGE 1: Gemini Vision AI (primary — most accurate full image analysis) ─
    print("[Diagnose] Stage 1: Gemini Vision AI full image analysis...")
    if _gemini_client is not None:
        try:
            from google.genai import types as _gtypes
            hint   = f" Farmer reports the crop as: {crop_name}." if crop_name else ""
            prompt = _GEMINI_PROMPT + hint
            models_to_try = [GEMINI_MODEL, "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]
            response = None
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
                    err_str = str(exc)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        print(f"[Gemini] Model {model_name} rate-limited (429) — trying next model...")
                        await asyncio.sleep(1)
                    else:
                        print(f"[Gemini] Model {model_name} failed: {type(exc).__name__}: {err_str[:120]}")

            if response is not None:
                raw = response.text.strip()
                raw = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
                raw = re.sub(r'^```\s*',     '', raw)
                raw = re.sub(r'\s*```$',     '', raw)
                result = json.loads(raw)
                for t in result.get("treatments", []):
                    if t.get("id") == "t1":
                        t.setdefault("color", "#15803d"); t.setdefault("bg", "#f0fdf4"); t.setdefault("border", "#22c55e")
                    elif t.get("id") == "t2":
                        t.setdefault("color", "#854d0e"); t.setdefault("bg", "#fef9c3"); t.setdefault("border", "#eab308")
                result["modelSource"] = "Gemini Vision AI"
                result["timestamp"]   = datetime.utcnow().isoformat()
                result["location"]    = location or "Unknown"
                print(f"[Diagnose] Gemini Vision success: {result.get('disease')} @ {result.get('confidence')}")
                return result

        except json.JSONDecodeError as je:
            print(f"[Diagnose] Gemini JSON parse error: {je}")
        except Exception as exc:
            print(f"[Diagnose] Gemini Stage 1 failed: {type(exc).__name__}: {str(exc)[:200]}")

    # ── STAGE 2: HuggingFace PlantVillage MobileNetV2 ML Model ───────────────
    print("[Diagnose] Stage 2: Running PlantVillage MobileNetV2 classifier (HuggingFace)...")
    hf_result = await classify_plant_disease_hf(image_bytes)

    if hf_result:
        plant_type = hf_result["plantType"]
        disease    = hf_result["disease"]
        ml_conf    = hf_result["confidence"]
        is_healthy = hf_result["isHealthy"]
        print(f"[Diagnose] HF ML Model -> {disease} ({plant_type}) @ {ml_conf}")

        # Healthy plant: return immediately
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

        # Try Gemini for treatment details on HF-detected disease
        if _gemini_client is not None:
            print("[Diagnose] Stage 2b: Gemini generating treatment plan for HF detection...")
            try:
                prompt = _GEMINI_TREATMENT_PROMPT.format(
                    plant_type=plant_type,
                    disease_name=disease,
                )
                models_to_try2 = [GEMINI_MODEL, "gemini-2.0-flash", "gemini-2.0-flash-lite"]
                response2 = None
                for model_name in models_to_try2:
                    try:
                        response2 = _gemini_client.models.generate_content(
                            model=model_name, contents=[prompt]
                        )
                        break
                    except Exception as _me:
                        if "429" in str(_me) or "RESOURCE_EXHAUSTED" in str(_me):
                            print(f"[Gemini] {model_name} rate-limited, trying next...")
                        else:
                            print(f"[Gemini] {model_name} failed: {type(_me).__name__}")

                if response2:
                    raw = response2.text.strip()
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
                    return result

            except Exception as exc:
                print(f"[Diagnose] Gemini treatment step failed: {exc}")

        # Gemini unavailable — generate real treatment plan from local lookup
        result = get_fallback_treatment(plant_type, disease)
        result["confidence"]  = ml_conf
        result["modelSource"] = "PlantVillage MobileNetV2"
        result["timestamp"]   = datetime.utcnow().isoformat()
        result["location"]    = location or "Unknown"
        return result

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
        "DEMO MODE: Gemini Vision and HuggingFace ML are both unavailable. "
        "Check GEMINI_API_KEY in server_python/.env and network connectivity."
    )
    print("[Diagnose] Returning MOCK data - all AI stages failed.")
    return result

def run_market_analysis(markets: List[Dict], crop_name: str) -> List[Dict]:
    """Analyze the given markets using Gemini, falling back to a rule-based selection."""
    if not markets:
        return []

    # If Gemini is available
    if _gemini_client is not None:
        try:
            prompt = _MARKET_ANALYSIS_PROMPT.format(
                crop_name=crop_name,
                markets_json=json.dumps(markets, indent=2)
            )
            models_to_try = [GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash-lite"]
            for model_name in models_to_try:
                try:
                    response = _gemini_client.models.generate_content(
                        model=model_name, contents=[prompt]
                    )
                    raw = response.text.strip()
                    raw = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
                    raw = re.sub(r'^```\s*', '', raw)
                    raw = re.sub(r'\s*```$', '', raw)
                    result = json.loads(raw)
                    return result
                except Exception as _e:
                    print(f"[Gemini Markets] Model {model_name} failed: {_e}")
        except Exception as exc:
            print(f"[Gemini Markets] Analysis failed: {exc}")

    # Fallback if Gemini fails or is not available
    results = []
    for m in markets[:3]:
        d = dict(m)
        d["reasoning"] = f"Suitable general marketplace for selling {crop_name} locally."
        results.append(d)
    return results
