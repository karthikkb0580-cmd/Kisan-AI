import os
import sys
from typing import Dict
from dotenv import load_dotenv

# Force UTF-8 stdout so box chars don't crash on Windows cp1252
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash-lite"

# HuggingFace Model Config
HF_MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")

# JWT Auth Config
JWT_SECRET = os.getenv("JWT_SECRET", "krishi_dev_secret_changeme")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TTL = 60          # minutes
REFRESH_TTL = 7           # days

# Email — Gmail SMTP (works for ALL email addresses, no domain restriction)
# Set GMAIL_USER and GMAIL_APP_PASSWORD in .env
# See: https://myaccount.google.com/apppasswords

# Upload Directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

# Allowed Origins for CORS
ALLOWED_ORIGINS = [
    # Local dev
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    # GitHub Pages production
    "https://karthikkb0580-cmd.github.io",
    # Vercel (add your exact URL here too)
    "https://kisan-ai-bice.vercel.app",
]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS.extend([o.strip() for o in env_origins.split(",") if o.strip()])

# Maps PlantVillage label -> (plant_type, disease_with_scientific_name)
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

_agro_replies = [
    "To prevent root rot in tomatoes, ensure proper drainage and avoid overwatering. Apply copper-based fungicide if needed.",
    "Yellowing leaves often indicate nitrogen deficiency. Apply urea or a balanced NPK fertilizer.",
    "Rice blast is managed by avoiding excess nitrogen, planting resistant varieties, and using tricyclazole fungicides.",
    "For optimal wheat yield, sow between Nov 1–15 and maintain soil moisture during the CRI stage.",
    "To repel aphids organically, apply 1–2% neem oil spray or introduce ladybugs as biological control.",
    "Drip irrigation reduces water usage by 40–50% compared to flood irrigation for most vegetables.",
    "Soil testing every 2 years helps maintain optimal pH (6.0–7.0) and nutrient balance.",
]

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

_prices = {
    "tomato": {"avg": "28/kg", "range": "22–35/kg", "trend": "rising"},
    "rice":   {"avg": "42/kg", "range": "38–45/kg", "trend": "stable"},
    "wheat":  {"avg": "25/kg", "range": "24–27/kg", "trend": "falling"},
    "onion":  {"avg": "22/kg", "range": "18–28/kg", "trend": "rising"},
    "potato": {"avg": "18/kg", "range": "15–22/kg", "trend": "stable"},
}

_MARKET_ANALYSIS_PROMPT = """
You are an AI agricultural market analyst.
The user is growing: {crop_name}.
Here is a list of nearby physical markets/mandis found via maps:
{markets_json}

Your task: Analyze these markets based on their names and types, and select the best ones for selling '{crop_name}'. 
Return ONLY a raw JSON array of the recommended markets. Include all original fields (id, name, address, lat, lng, type) and add a "reasoning" string field explaining why it is a good fit for {crop_name}.
Keep the reasoning concise and practical.

Rules:
- Return raw JSON array only, no markdown formatting.
- If the list is empty, return an empty array [].
"""
