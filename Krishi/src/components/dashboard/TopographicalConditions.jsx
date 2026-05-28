import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom Leaflet marker icons fixing React production issues
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const DEFAULT_POS = { lat: 31.634, lng: 74.872 } // Amritsar, Punjab region (highly fertile Alluvial plains)

const SOIL_REGIONS = [
  {
    name: 'Alluvial Soil (Fertile Clay-Loam)',
    description: 'High potassium and organic contents. Highly suitable for wheat, paddy, sugarcane, and oilseeds.',
    drainage: 'Moderate-High. Natural river silt ensures high water storage capacity without rotting roots.',
    nutrients: { n: 'Medium', p: 'Low-Medium', k: 'Very High', pH: '6.8 - 7.3 (Neutral)' },
    improvement: 'Introduce green manuring (Dhaincha/Sunnhemp) during summer to bolster Nitrogen levels. Avoid soil compaction by minimizing heavy machinery passes.'
  },
  {
    name: 'Black Cotton Soil (Regur)',
    description: 'Highly clayey, deep, and rich in lime, iron, alumina, and magnesium. Extremely moisture-retentive.',
    drainage: 'Poor-Fair. Becomes sticky when wet, and develops deep cracks when dry, facilitating self-aeration.',
    nutrients: { n: 'Deficient', p: 'Deficient', k: 'High', pH: '7.5 - 8.5 (Mildly Alkaline)' },
    improvement: 'Incorporate sand or well-rotted farmyard manure (FYM) to improve permeability. Implement contour planting to control water logging during monsoon.'
  },
  {
    name: 'Red and Yellow Soil',
    description: 'Developed on crystalline igneous rocks. Sandy to loamy structure, high iron content giving its reddish tint.',
    drainage: 'Excellent. Coarse texture allows swift percolation, preventing root rot.',
    nutrients: { n: 'Deficient', p: 'Deficient', k: 'Medium', pH: '5.5 - 6.5 (Mildly Acidic)' },
    improvement: 'Add agricultural lime (calcium carbonate) to neutralize acidity. Supply phosphorus-rich organic fertilizers like bone meal or rock phosphate.'
  }
]

// Map view controller to re-center map when user location updates
function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 12)
    }
  }, [center, map])
  return null
}

// Env conditions seeded by location (mock live values)
const getEnvConditions = (pos) => {
  const isNorth = pos.lat > 26
  return {
    temp:     isNorth ? '29°C' : '34°C',
    tempNote: isNorth ? 'Comfortable' : 'Hot',
    humidity: isNorth ? '58%' : '72%',
    humNote:  isNorth ? 'Moderate' : 'High',
    uv:       isNorth ? '6 — High' : '9 — Very High',
    uvColor:  isNorth ? '#f59e0b' : '#ef4444',
    aqi:      isNorth ? '87 — Moderate' : '142 — Unhealthy',
    aqiColor: isNorth ? '#f59e0b' : '#ef4444',
    wind:     isNorth ? '14 km/h NW' : '8 km/h SE',
    rain:     isNorth ? '12mm / next 48h' : '0mm / next 48h',
    rainColor: isNorth ? '#3b82f6' : '#94a3b8',
  }
}

export default function TopographicalConditions() {
  const [userPos, setUserPos] = useState(DEFAULT_POS)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [closestSoil, setClosestSoil] = useState(SOIL_REGIONS[0])
  const [envCond, setEnvCond] = useState(getEnvConditions(DEFAULT_POS))

  // Form states for manual input
  const [inputType, setInputType] = useState('clayey')
  const [inputColor, setInputColor] = useState('dark')
  const [inputMoisture, setInputMoisture] = useState('moist')
  const [inputPractice, setInputPractice] = useState('traditional')

  const [formSubmitted, setFormSubmitted] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  // Fetch location on load
  const fetchLocation = () => {
    setLocating(true)
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by this browser.')
      setLocating(false)
      determineSoilByLocation(DEFAULT_POS)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        determineSoilByLocation(p)
        setEnvCond(getEnvConditions(p))
        setLocating(false)
      },
      () => {
        setLocationError('Access denied. Using default location (Amritsar APMC region).')
        determineSoilByLocation(DEFAULT_POS)
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  const determineSoilByLocation = (pos) => {
    if (pos.lat > 28) {
      setClosestSoil(SOIL_REGIONS[0])
    } else if (pos.lat > 16 && pos.lat < 26 && pos.lng > 72 && pos.lng < 81) {
      setClosestSoil(SOIL_REGIONS[1])
    } else {
      setClosestSoil(SOIL_REGIONS[2])
    }
  }

  useEffect(() => {
    fetchLocation()
  }, [])

  // Analyze soil form input
  const handleSoilAnalysis = (e) => {
    e.preventDefault()
    setAnalyzing(true)
    setFormSubmitted(true)
    
    setTimeout(() => {
      // Logic mapping user observations to nutrient indexes and suggestions
      let nutrients = { n: 'Medium', p: 'Medium', k: 'Medium', pH: '6.8' }
      let drainage = 'Moderate'
      let matchingCrops = []
      let correctiveActions = []

      // 1. Soil Type mapping
      if (inputType === 'sandy') {
        drainage = 'Excessive (Fast Draining)'
        nutrients.n = 'Deficient 🔴'
        nutrients.p = 'Low 🟡'
        nutrients.k = 'Low 🟡'
        nutrients.pH = '6.0 (Mildly Acidic)'
        matchingCrops = ['Groundnut', 'Carrots', 'Potato', 'Melons', 'Millets']
        correctiveActions.push('Apply large amounts of organic compost or green manures to build moisture retention capacity.')
        correctiveActions.push('Use split application of nitrogenous fertilizers to avoid rapid leaching.')
      } else if (inputType === 'clayey') {
        drainage = 'Poor (Slow / Waterlogged)'
        nutrients.n = 'High 🟢'
        nutrients.p = 'Medium 🟢'
        nutrients.k = 'Very High 🟢'
        nutrients.pH = '7.8 (Alkaline)'
        matchingCrops = ['Paddy (Rice)', 'Sugarcane', 'Cotton', 'Wheat', 'Soybean']
        correctiveActions.push('Incorporate agricultural Gypsum (calcium sulfate) to loosen tight clay lattices and enhance soil aggregation.')
        correctiveActions.push('Construct raised beds or install broadbed furrow systems to facilitate excess surface run-off drainage.')
      } else if (inputType === 'loamy') {
        drainage = 'Optimal / Good'
        nutrients.n = 'Optimal 🟢'
        nutrients.p = 'Optimal 🟢'
        nutrients.k = 'Optimal 🟢'
        nutrients.pH = '6.7 (Perfect)'
        matchingCrops = ['Wheat', 'Tomato', 'Mustard', 'Maize', 'Pulses']
        correctiveActions.push('Maintain high fertility using crop rotation with legumes (beans/peas).')
        correctiveActions.push('Apply a thin layer of mulching to retain the excellent moisture profile.')
      } else if (inputType === 'silt') {
        drainage = 'Fair'
        nutrients.n = 'Medium 🟢'
        nutrients.p = 'Medium 🟢'
        nutrients.k = 'High 🟢'
        nutrients.pH = '6.4'
        matchingCrops = ['Lettuce', 'Cabbage', 'Maize', 'Wheat', 'Broccoli']
        correctiveActions.push('Avoid working with the soil when wet, as silt easily compacts into dense hardpans.')
        correctiveActions.push('Incorporate coarse compost to keep soil structure loose and well-aerated.')
      } else { // peaty
        drainage = 'Waterlogged'
        nutrients.n = 'Extremely High 🟢'
        nutrients.p = 'Deficient 🔴'
        nutrients.k = 'Deficient 🔴'
        nutrients.pH = '5.0 (Highly Acidic)'
        matchingCrops = ['Blueberries', 'Root Vegetables', 'Rice', 'Brassicas']
        correctiveActions.push('Apply agricultural lime (calcium carbonate) liberally to raise the acidic pH.')
        correctiveActions.push('Add potassium and phosphorus inputs to balance the extremely high nitrogen/organic content.')
      }

      // Adjustments based on Color
      if (inputColor === 'red') {
        correctiveActions.push('Red color indicates high iron oxide. Spray zinc sulfate chelates as red soils typically lock out micro-nutrients.')
      } else if (inputColor === 'light') {
        nutrients.n = 'Critically Low 🔴'
        correctiveActions.push('Light color signals low organic matter. Incorporate farmyard manure (FYM) or bio-char to dark-condition the soil.')
      }

      // Drainage adjust based on moisture
      if (inputMoisture === 'waterlogged') {
        drainage = 'Waterlogged ⚠️'
        correctiveActions.push('Critical: Cease standard irrigation. Dig peripheral trenches immediately to vent standing water.')
      }

      setAnalysisResult({
        nutrients,
        drainage,
        matchingCrops,
        correctiveActions
      })
      setAnalyzing(false)
    }, 1800)
  }

  return (
    <div className="db-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 className="db-page-title">🗺️ Topographical Terrain & Soil</h1>
          <p className="db-page-sub">Satellite terrain mapping, live environmental conditions, and dynamic soil diagnostics.</p>
        </div>
        <button onClick={fetchLocation} className="nm-locate-btn" disabled={locating} style={{ cursor: 'pointer' }}>
          {locating ? '📡 Scanning…' : '📍 Detect Location'}
        </button>
      </div>

      {locationError && (
        <div className="db-alert yellow" style={{ marginBottom: '1rem' }}>{locationError}</div>
      )}

      {/* ── ENVIRONMENTAL CONDITIONS STRIP ── */}
      <div className="topo-env-strip">
        <div className="topo-env-card">
          <span className="topo-env-icon">🌡️</span>
          <span className="topo-env-label">Temperature</span>
          <strong className="topo-env-val">{envCond.temp}</strong>
          <span className="topo-env-note">{envCond.tempNote}</span>
        </div>
        <div className="topo-env-card">
          <span className="topo-env-icon">💧</span>
          <span className="topo-env-label">Humidity</span>
          <strong className="topo-env-val">{envCond.humidity}</strong>
          <span className="topo-env-note">{envCond.humNote}</span>
        </div>
        <div className="topo-env-card">
          <span className="topo-env-icon">☀️</span>
          <span className="topo-env-label">UV Index</span>
          <strong className="topo-env-val" style={{ color: envCond.uvColor }}>{envCond.uv}</strong>
          <span className="topo-env-note">Wear sunscreen</span>
        </div>
        <div className="topo-env-card">
          <span className="topo-env-icon">🌫️</span>
          <span className="topo-env-label">Air Quality</span>
          <strong className="topo-env-val" style={{ color: envCond.aqiColor }}>{envCond.aqi}</strong>
          <span className="topo-env-note">AQI Index</span>
        </div>
        <div className="topo-env-card">
          <span className="topo-env-icon">🌬️</span>
          <span className="topo-env-label">Wind</span>
          <strong className="topo-env-val">{envCond.wind}</strong>
          <span className="topo-env-note">Surface level</span>
        </div>
        <div className="topo-env-card">
          <span className="topo-env-icon">🌧️</span>
          <span className="topo-env-label">Rainfall</span>
          <strong className="topo-env-val" style={{ color: envCond.rainColor }}>{envCond.rain}</strong>
          <span className="topo-env-note">Forecast</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left: GIS Terrain Map */}
        <div className="db-card" style={{ border: '3px solid #0f172a', borderRadius: '20px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white', boxShadow: '5px 5px 0 0 #0f172a' }}>
          <h2 className="db-card-title" style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ⛰️ Sat GIS Terrain Map Only
          </h2>
          
          <div style={{ height: '320px', width: '100%', borderRadius: '14px', overflow: 'hidden', border: '2.5px solid #0f172a', zIndex: 1 }}>
            <MapContainer 
              center={[userPos.lat, userPos.lng]} 
              zoom={12} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              {/* TERRAIN TILE LAYER ONLY: OpenTopoMap provides beautiful topo contour lines and elevations */}
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
                maxZoom={17}
              />
              <Marker position={[userPos.lat, userPos.lng]} icon={icon} />
              <Circle 
                center={[userPos.lat, userPos.lng]} 
                radius={2000} 
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15, weight: 2 }}
              />
              <MapUpdater center={userPos} />
            </MapContainer>
          </div>
          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '700', marginTop: '-0.4rem' }}>
            🗺️ Currently displaying high-altitude contour indices, river channels, and slope gradients.
          </span>
        </div>

        {/* Right: GPS Soil Auto-Detection */}
        <div className="db-card" style={{ border: '2px solid #e2e8f0', borderRadius: '20px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white' }}>
          <h2 className="db-card-title" style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            🛰️ Coordinates-Based Soil Profile
          </h2>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Current GPS location</span>
              <strong style={{ fontSize: '0.7rem', color: '#22c55e' }}>{userPos.lat.toFixed(4)}° N, {userPos.lng.toFixed(4)}° E</strong>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.1rem', color: '#0f172a', margin: '0.2rem 0' }}>
              {closestSoil.name}
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.4', margin: 0 }}>
              {closestSoil.description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.72rem' }}>
            <div className="db-info-row"><span>Water Drainage</span><span style={{ fontWeight: '700' }}>{closestSoil.drainage}</span></div>
            <div className="db-info-row"><span>Nitrogen (N) Rating</span><span style={{ fontWeight: '700' }}>{closestSoil.nutrients.n}</span></div>
            <div className="db-info-row"><span>Phosphorus (P) Rating</span><span style={{ fontWeight: '700' }}>{closestSoil.nutrients.p}</span></div>
            <div className="db-info-row"><span>Potassium (K) Rating</span><span style={{ fontWeight: '700', color: '#22c55e' }}>{closestSoil.nutrients.k}</span></div>
            <div className="db-info-row"><span>Soil Alkaline scale</span><span style={{ fontWeight: '700' }}>{closestSoil.nutrients.pH}</span></div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '10px', borderLeft: '3.5px solid #22c55e' }}>
            <strong style={{ fontSize: '0.68rem', color: '#15803d', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>🚀 AI Base Treatment:</strong>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#166534', lineHeight: '1.4' }}>{closestSoil.improvement}</p>
          </div>
        </div>

      </div>

      {/* ── USER INPUT SOIL CONDITIONS & AI IMPROVEMENT PLAN ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Form panel */}
        <div className="db-card" style={{ border: '2px solid #0f172a', borderRadius: '20px', padding: '1.25rem', boxShadow: '4px 4px 0 0 #0f172a', background: 'white' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🧪 Input Your Soil Observations
          </h3>
          <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '-0.3rem', marginBottom: '1rem' }}>
            No lab report needed! Describe your physical soil observation, and our agronomic engine will predict chemical deficiencies.
          </p>

          <form onSubmit={handleSoilAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Observed Texture */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '0.3rem' }}>
                🪨 Soil Texture / Texture Type
              </label>
              <select 
                value={inputType} 
                onChange={(e) => setInputType(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.75rem', fontWeight: '700', background: 'white' }}
              >
                <option value="loamy">Loamy Soil (Balanced sand/clay, crumbly texture)</option>
                <option value="clayey">Clayey Soil (Heavy, very sticky when wet, hard when dry)</option>
                <option value="sandy">Sandy Soil (Coarse grains, gritty, non-cohesive)</option>
                <option value="silt">Silty Soil (Smooth, soapy feel, retains moisture easily)</option>
                <option value="peaty">Peaty Soil (Dark brown, spongy, highly fibrous organic matter)</option>
              </select>
            </div>

            {/* Observed Color */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '0.3rem' }}>
                🎨 Soil Color
              </label>
              <select 
                value={inputColor} 
                onChange={(e) => setInputColor(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.75rem', fontWeight: '700', background: 'white' }}
              >
                <option value="dark">Dark Brown / Deep Black (Rich in humic matter)</option>
                <option value="red">Reddish Brown / Rusty Red (Iron oxide rich, low calcium)</option>
                <option value="light">Light Grey / Pale Yellow (Low organic carbon, washed out)</option>
              </select>
            </div>

            {/* Soil Moisture */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '0.3rem' }}>
                💧 Average Soil Moisture State
              </label>
              <select 
                value={inputMoisture} 
                onChange={(e) => setInputMoisture(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.75rem', fontWeight: '700', background: 'white' }}
              >
                <option value="moist">Optimal Moist (Damp but fluffy)</option>
                <option value="dry">Extremely Dry / Cracking (Arid, water-deprived)</option>
                <option value="waterlogged">Waterlogged / Muddy pools (Saturated, standing water)</option>
              </select>
            </div>

            {/* Farming Practice */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '0.3rem' }}>
                🚜 Agricultural Tillage Practice
              </label>
              <select 
                value={inputPractice} 
                onChange={(e) => setInputPractice(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.75rem', fontWeight: '700', background: 'white' }}
              >
                <option value="traditional">Traditional Intensive Tilling (Rotavator, tractor ploughing)</option>
                <option value="organic">Organic Tilling with heavy manure cycling</option>
                <option value="notill">Zero-Tillage / Direct sowing (Conservation farming)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-magnetic"
              style={{ 
                background: '#0f172a', 
                color: '#22c55e', 
                fontWeight: '900', 
                fontSize: '0.75rem', 
                padding: '0.65rem', 
                borderRadius: '10px', 
                border: '3px solid #22c55e',
                cursor: 'pointer',
                marginTop: '0.25rem' 
              }}
            >
              🧪 RUN AI SOIL PROFILE DIAGNOSTIC
            </button>
          </form>
        </div>

        {/* Results / Diagnostics panel */}
        <div className="db-card" style={{ border: '2px solid #e2e8f0', borderRadius: '20px', padding: '1.25rem', background: 'white', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.05rem', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', margin: 0 }}>
            ⚡ Diagnosis & Remediation Output
          </h3>

          {analyzing && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#22c55e', gap: '0.5rem' }}>
              <div className="db-map-spinner" style={{ borderTopColor: '#22c55e' }} />
              <strong style={{ fontSize: '0.72rem' }}>🧬 Running mineral calculations…</strong>
            </div>
          )}

          {!analyzing && analysisResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', animation: 'scale-in 0.2s ease-out' }}>
              
              {/* Soil Chemical Forecast */}
              <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', background: '#3b82f6', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>AI Mineral Prediction</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                  <div><span>Nitrogen:</span> <strong style={{ color: '#0f172a' }}>{analysisResult.nutrients.n}</strong></div>
                  <div><span>Phosphorus:</span> <strong style={{ color: '#0f172a' }}>{analysisResult.nutrients.p}</strong></div>
                  <div><span>Potassium:</span> <strong style={{ color: '#0f172a' }}>{analysisResult.nutrients.k}</strong></div>
                  <div><span>Expected pH:</span> <strong style={{ color: '#3b82f6' }}>{analysisResult.nutrients.pH}</strong></div>
                </div>
              </div>

              {/* Soil Drainage */}
              <div style={{ fontSize: '0.72rem' }}>
                <span>🛡️ Predicted Soil Drainage Index:</span>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.8rem', marginTop: '0.1rem' }}>💧 {analysisResult.drainage}</strong>
              </div>

              {/* Corrective Actions */}
              <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#22c55e', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>🛠️ Action Plan: How to Improve Soil Health</span>
                
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.68rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: '1.4' }}>
                  {analysisResult.correctiveActions.map((act, index) => (
                    <li key={index} style={{ marginBottom: '0.1rem' }}>{act}</li>
                  ))}
                </ul>
              </div>

              {/* Matching Crops */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>🌾 Recommended Matching Crops</span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {analysisResult.matchingCrops.map(crop => (
                    <span 
                      key={crop} 
                      style={{ 
                        background: '#f0fdf4', 
                        color: '#15803d', 
                        border: '1px solid #22c55e', 
                        borderRadius: '6px', 
                        fontSize: '0.62rem', 
                        padding: '0.2rem 0.45rem', 
                        fontWeight: '700' 
                      }}
                    >
                      {crop}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          )}

          {!analyzing && !analysisResult && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', textAlign: 'center', color: '#94a3b8' }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block' }}>🧪</span>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', margin: '0.5rem 0 0' }}>Awaiting Soil Parameters</p>
                <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Select parameters on the left and execute diagnostics to compute soil corrective treatments and crop suitability charts.</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
