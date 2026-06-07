import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AIAPI } from '../../services/api'
import { useFarmvestStore } from '../../store/useFarmvestStore'

// Fix Vite + Leaflet default icon path issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom colored div icon for markets
const marketIcon = (color = '#3b82f6', active = false) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: ${active ? '24px' : '16px'};
      height: ${active ? '24px' : '16px'};
      background: ${color};
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify: center;
      transition: all 0.2s ease;
    "></div>`,
    iconSize: [active ? 24 : 16, active ? 24 : 16],
    iconAnchor: [active ? 12 : 8, active ? 12 : 8],
  })

// User location icon
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #ef4444;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.4);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})


// Haversine distance helper
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, p = Math.PI / 180
  const dLat = (lat2 - lat1) * p, dLng = (lng2 - lng1) * p
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLng / 2) ** 2
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

// Map center controller
function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom || 11, { animate: true })
  }, [center, zoom, map])
  return null
}

// Map click and move handler
function MapEvents({ onMapClick, onMapMove }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    },
    dragend(e) {
      onMapMove(e.target.getCenter())
    },
    zoomend(e) {
      onMapMove(e.target.getCenter())
    }
  })
  return null
}

export default function NearbyMarkets() {
  const { farmerCrops } = useFarmvestStore()
  const [phase, setPhase] = useState('idle') // idle | locating | loading | ready | error
  const [error, setError] = useState('')
  const [userPos, setUserPos] = useState(null)
  const [markets, setMarkets] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeInstructions, setRouteInstructions] = useState([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [cropGrown, setCropGrown] = useState(farmerCrops[0] || 'Wheat')

  const ALL_KNOWN_CROPS = ['Wheat', 'Rice', 'Cotton', 'Maize', 'Mustard', 'Tomato', 'Potato', 'Onion', 'Soybean', 'Apple', 'Grape']
  const otherCrops = ALL_KNOWN_CROPS.filter(c => !farmerCrops.includes(c))

  const DEFAULT_POS = { lat: 31.634, lng: 74.872 } // Amritsar APMC

  const [mapDraggedCenter, setMapDraggedCenter] = useState(null)

  const showSearchHere = useMemo(() => {
    if (!mapDraggedCenter || !userPos) return false
    const dist = haversine(userPos.lat, userPos.lng, mapDraggedCenter.lat, mapDraggedCenter.lng)
    return dist > 1.0 // show button if center moved by more than 1km
  }, [mapDraggedCenter, userPos])

  // Fetch real markets using Overpass API
  const fetchOverpassMarkets = async (lat, lng) => {
    // Search for marketplaces, agricultural shops, farm shops, and food courts within 50km
    const query = `[out:json][timeout:20];
      (
        node["amenity"="marketplace"](around:50000, ${lat}, ${lng});
        way["amenity"="marketplace"](around:50000, ${lat}, ${lng});
        node["shop"="agricultural"](around:50000, ${lat}, ${lng});
        node["shop"="farm"](around:50000, ${lat}, ${lng});
      );
      out body 25;`;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Overpass API error')
    const data = await res.json()

    const results = (data.elements || []).map(element => {
      const name = element.tags?.name || element.tags?.operator || 'Local Mandi / Market'
      const address = element.tags?.['addr:street'] 
        ? `${element.tags?.['addr:street']}, ${element.tags?.['addr:city'] || ''}`
        : element.tags?.['addr:city'] || 'Nearby Agricultural Market'
      
      return {
        id: element.id,
        name,
        address,
        lat: element.lat || element.center?.lat || lat,
        lng: element.lon || element.center?.lng || lng,
        type: element.tags?.amenity || element.tags?.shop || 'Marketplace',
      }
    })

    return results.filter(r => r.lat !== lat && r.lng !== lng)
  }

  // Load routing from OSRM
  const getOSRMRoute = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]])
        const distanceKm = (route.distance / 1000).toFixed(1)
        const durationMin = Math.round(route.duration / 60)
        
        let instructions = []
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          instructions = route.legs[0].steps.map(step => {
            const { maneuver, name, distance } = step
            let text = ''
            if (maneuver.type === 'depart') text = `Head ${maneuver.modifier || 'straight'}`
            else if (maneuver.type === 'arrive') text = `You will arrive at your destination`
            else if (maneuver.type === 'turn') text = `Turn ${maneuver.modifier || ''}`.trim()
            else text = `Continue ${maneuver.modifier || 'straight'}`

            if (name) text += ` onto ${name}`
            if (distance > 0) {
              if (distance > 1000) text += ` for ${(distance / 1000).toFixed(1)} kilometers`
              else text += ` for ${Math.round(distance)} meters`
            }
            return text
          })
        }

        return { coords, distance: `${distanceKm} km`, duration: `${durationMin} mins`, instructions }
      }
    } catch {
      return null
    }
    return null
  }

  const loadData = useCallback(async (pos, currentCrop = '') => {
    setPhase('loading')
    setError('')
    setSelectedIdx(null)
    setRouteCoordinates([])
    setRouteInfo(null)
    setRouteInstructions([])
    setIsNavigating(false)
    setMapDraggedCenter(null)

    try {
      let list = []
      try {
        list = await fetchOverpassMarkets(pos.lat, pos.lng)
      } catch (e) {
        console.warn('Overpass API failed.', e)
      }

      if (list.length === 0) {
        setPhase('error')
        setError('No physical agricultural markets found nearby.')
        setMarkets([])
        return
      }

      // If a crop is specified, use AI to filter/analyze
      if (currentCrop.trim()) {
        try {
          const aiAnalyzed = await AIAPI.analyzeMarkets(list, currentCrop.trim())
          if (aiAnalyzed && aiAnalyzed.length > 0) {
            list = aiAnalyzed
          }
        } catch (e) {
          console.warn('AI Analysis failed, falling back to raw list.', e)
        }
      }

      // Calculate distances
      const sorted = list.map(m => ({
        ...m,
        dist: haversine(pos.lat, pos.lng, m.lat, m.lng),
      })).sort((a, b) => a.dist - b.dist)

      setMarkets(sorted)
      setPhase('ready')
    } catch (err) {
      setError('An error occurred while finding markets.')
      setMarkets([])
      setPhase('error')
    }
  }, [])

  const getLocation = useCallback(() => {
    setPhase('locating')
    setError('')
    setMapDraggedCenter(null)
    if (!navigator.geolocation) {
      setUserPos(DEFAULT_POS)
      loadData(DEFAULT_POS, cropGrown)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        loadData(p, cropGrown)
      },
      () => {
        setError('Location access denied — showing default Amritsar region.')
        setUserPos(DEFAULT_POS)
        loadData(DEFAULT_POS, cropGrown)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }, [loadData, cropGrown])

  useEffect(() => {
    getLocation()
  }, []) // run once on mount

  const handleAnalyze = () => {
    if (userPos) {
      loadData(userPos, cropGrown)
    } else {
      getLocation()
    }
  }

  const handleMapClick = useCallback((latlng) => {
    const newPos = { lat: latlng.lat, lng: latlng.lng }
    setUserPos(newPos)
    loadData(newPos, cropGrown)
  }, [loadData, cropGrown])

  const handleMapMove = useCallback((center) => {
    setMapDraggedCenter({ lat: center.lat, lng: center.lng })
  }, [])

  // Get route coordinates when market selected
  useEffect(() => {
    if (selectedIdx === null || !userPos) {
      setRouteCoordinates([])
      setRouteInfo(null)
      setRouteInstructions([])
      setIsNavigating(false)
      return
    }
    const target = markets[selectedIdx]
    if (!target) return

    getOSRMRoute(userPos, target).then(route => {
      if (route) {
        setRouteCoordinates(route.coords)
        setRouteInfo({ distance: route.distance, duration: route.duration })
        setRouteInstructions(route.instructions || [])
      } else {
        // Direct flight line fallback
        setRouteCoordinates([[userPos.lat, userPos.lng], [target.lat, target.lng]])
        setRouteInfo({ distance: `${target.dist} km`, duration: `${Math.round(target.dist * 1.5)} mins` })
        setRouteInstructions([`Head directly towards ${target.name} for ${target.dist} km`])
      }
      setIsNavigating(false)
      setCurrentStep(0)
    })
  }, [selectedIdx, userPos, markets])

  const speakInstruction = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // stop any current speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  const startVoiceNavigation = () => {
    setIsNavigating(true)
    setCurrentStep(0)
    const target = markets[selectedIdx]
    if (routeInstructions.length > 0 && target) {
      speakInstruction(`Navigating to ${target.name}. ` + routeInstructions[0])
    }
  }

  const nextStep = () => {
    if (currentStep < routeInstructions.length - 1) {
      const nextIdx = currentStep + 1
      setCurrentStep(nextIdx)
      speakInstruction(routeInstructions[nextIdx])
    } else {
      speakInstruction("You have arrived at your destination.")
      setIsNavigating(false)
    }
  }

  const stopNavigation = () => {
    setIsNavigating(false)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  const selectedMarket = selectedIdx !== null ? markets[selectedIdx] : null

  // Direct redirection URL to Google Maps driving route (does not require API key)
  const getGoogleMapsLink = (target) => {
    if (!userPos || !target) return '#'
    return `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${target.lat},${target.lng}&travelmode=driving`
  }

  const mapCenter = userPos ? [userPos.lat, userPos.lng] : [DEFAULT_POS.lat, DEFAULT_POS.lng]

  return (
    <div className="db-section">
      <div className="nm-header-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 className="db-page-title">🛒 Nearby Markets</h1>
          <p className="db-page-sub">Real agricultural markets, sabzi mandis, and APMCs — Drag red pin or click anywhere to search!</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={cropGrown}
            onChange={(e) => setCropGrown(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              minWidth: '220px',
              cursor: 'pointer'
            }}
          >
            <optgroup label="Your Priority Crops">
              {farmerCrops.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="Other Crops">
              {otherCrops.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </select>
          <button 
            className="nm-locate-btn" 
            onClick={handleAnalyze} 
            disabled={phase === 'locating' || phase === 'loading'}
            style={{ background: '#22c55e', color: 'white' }}
          >
            {phase === 'locating' ? '📡 Locating…' : phase === 'loading' ? '🔍 Analyzing…' : '✨ Analyze Markets'}
          </button>
          <button 
            className="nm-locate-btn" 
            onClick={getLocation} 
            disabled={phase === 'locating' || phase === 'loading'}
            style={{ background: '#3b82f6', color: 'white' }}
          >
            📍 Location
          </button>
        </div>
      </div>

      {error && (
        <div className="db-alert yellow" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>
      )}

      <div className="nm-side-by-side-container">
        
        {/* Left Column: Interactive Map */}
        <div className="nm-map-side">
          <div className="nm-map-wrap" style={{ height: '420px', minHeight: '420px', position: 'relative' }}>
            {showSearchHere && (
              <button
                onClick={() => {
                  if (mapDraggedCenter) {
                    setUserPos(mapDraggedCenter)
                    loadData(mapDraggedCenter, cropGrown)
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '30px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  cursor: 'pointer',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                🔍 Search This Area
              </button>
            )}
            <MapContainer
              center={mapCenter}
              zoom={11}
              style={{ width: '100%', height: '100%', borderRadius: '14px' }}
              zoomControl={true}
            >
              <MapController center={selectedMarket ? [selectedMarket.lat, selectedMarket.lng] : mapCenter} />
              <MapEvents onMapClick={handleMapClick} onMapMove={handleMapMove} />
              
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Position Marker */}
              {userPos && (
                <Marker 
                  position={[userPos.lat, userPos.lng]} 
                  icon={userIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target
                      const position = marker.getLatLng()
                      const newPos = { lat: position.lat, lng: position.lng }
                      setUserPos(newPos)
                      loadData(newPos, cropGrown)
                    }
                  }}
                >
                  <Popup>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      📍 Drag pin or click map<br/>to search new area!
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Markets Markers */}
              {markets.map((m, index) => (
                <Marker
                  key={m.id}
                  position={[m.lat, m.lng]}
                  icon={marketIcon(index === 0 ? '#22c55e' : '#3b82f6', selectedIdx === index)}
                  eventHandlers={{
                    click: () => setSelectedIdx(index),
                  }}
                >
                  <Popup>
                    <div style={{ padding: '0.2rem', maxWidth: '220px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{m.name}</strong>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', color: '#64748b' }}>{m.address}</p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a' }}>📏 {m.dist} km away</span>
                      {m.reasoning && (
                        <div style={{ marginTop: '0.4rem', padding: '0.4rem', background: '#f0fdf4', borderLeft: '3px solid #22c55e', fontSize: '0.7rem', color: '#166534', lineHeight: 1.3 }}>
                          <strong>AI Analysis:</strong> {m.reasoning}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Real-time route line */}
              {routeCoordinates.length > 0 && (
                <Polyline
                  positions={routeCoordinates}
                  pathOptions={{ color: '#22c55e', weight: 5, opacity: 0.85 }}
                />
              )}
            </MapContainer>

            {/* Route status banner */}
            {selectedMarket && routeInfo && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                padding: '0.75rem 1.25rem',
                borderRadius: '16px',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                {isNavigating ? (
                  <>
                    <div style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                      Step {currentStep + 1} of {routeInstructions.length}
                    </div>
                    <div style={{ fontSize: '1rem', lineHeight: '1.4' }}>
                      {routeInstructions[currentStep]}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                      <button onClick={nextStep} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {currentStep < routeInstructions.length - 1 ? 'Next Step 🔊' : 'Finish'}
                      </button>
                      <button onClick={stopNavigation} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Stop
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontWeight: 'bold' }}>
                      <span>🚛 {routeInfo.distance}</span>
                      <span style={{ color: '#22c55e' }}>⏱ {routeInfo.duration}</span>
                    </div>
                    {routeInstructions.length > 0 && (
                      <button onClick={startVoiceNavigation} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        🔊 Start Voice Navigation
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="nm-legend" style={{ marginTop: '0.5rem' }}>
            <div className="nm-legend-item"><span className="nm-legend-dot" style={{ background: '#ef4444' }}/><span>Your Location</span></div>
            <div className="nm-legend-item"><span className="nm-legend-dot" style={{ background: '#22c55e' }}/><span>Nearest Market</span></div>
            <div className="nm-legend-item"><span className="nm-legend-dot" style={{ background: '#3b82f6' }}/><span>Other Markets</span></div>
            <div className="nm-legend-item"><span style={{ width: 18, height: 4, background: '#22c55e', display: 'inline-block', borderRadius: 2 }}/><span>Truck Route</span></div>
          </div>
        </div>

        {/* Right Column: Markets List */}
        <div className="nm-list-side">
          {selectedMarket && (
            <div className="nm-best-card" style={{ marginBottom: '0.75rem', width: '100%', boxSizing: 'border-box', border: '2px solid #22c55e' }}>
              <div className="nm-best-left">
                <span className="nm-best-tag" style={{ background: '#dcfce7', color: '#166534' }}>🚛 Active Route Selected</span>
                <h3 className="nm-best-name" style={{ fontSize: '0.95rem', margin: '0.2rem 0' }}>{selectedMarket.name}</h3>
                <p className="nm-best-meta">{selectedMarket.address}</p>
                <p className="nm-best-meta" style={{ fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
                  📏 {selectedMarket.dist} km away
                </p>
                {routeInfo && (
                  <p style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, margin: '0.2rem 0 0' }}>
                    Truck duration: approx {routeInfo.duration}
                  </p>
                )}
                {selectedMarket.reasoning && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.75rem', color: '#166534', lineHeight: 1.4 }}>
                    <strong>✨ Why this market?</strong><br/>
                    {selectedMarket.reasoning}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                <a
                  href={getGoogleMapsLink(selectedMarket)}
                  target="_blank"
                  rel="noreferrer"
                  className="scanner-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#22c55e',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.72rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🚛 Truck Route
                </a>
                <button
                  onClick={() => setSelectedIdx(null)}
                  style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#64748b', cursor: 'pointer' }}
                >
                  Clear Route
                </button>
              </div>
            </div>
          )}

          {phase === 'ready' && markets.length > 0 ? (
            <div className="nm-markets-scroll-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {markets.map((m, index) => (
                <div
                  key={m.id}
                  className={`nm-market-list-item ${selectedIdx === index ? 'best' : ''}`}
                  onClick={() => setSelectedIdx(index)}
                  style={{ cursor: 'pointer', padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}
                >
                  <div className="nm-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: index === 0 ? '#22c55e' : '#3b82f6',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontWeight: 'bold', fontSize: '0.65rem'
                        }}>
                          {index + 1}
                        </span>
                        <h4 className="nm-item-name" style={{ fontSize: '0.85rem', margin: 0 }}>{m.name}</h4>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.2rem 0 0 1.6rem' }}>{m.address}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', paddingLeft: '1.6rem' }}>
                        <span style={{
                          fontSize: '0.65rem', padding: '0.15rem 0.4rem',
                          background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: 'bold'
                        }}>
                          📏 {m.dist} km
                        </span>
                        <span style={{
                          fontSize: '0.65rem', padding: '0.15rem 0.4rem',
                          background: '#ecfdf5', color: '#15803d', borderRadius: '4px', fontWeight: 'bold'
                        }}>
                          {m.type}
                        </span>
                      </div>
                      {m.reasoning && (
                        <p style={{ fontSize: '0.7rem', color: '#15803d', margin: '0.3rem 0 0 1.6rem', padding: '0.3rem', background: '#f0fdf4', borderRadius: '4px' }}>
                          ✨ {m.reasoning}
                        </p>
                      )}
                    </div>
                    <a
                      href={getGoogleMapsLink(m)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        padding: '0.3rem 0.5rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      🚛 Route
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <div className="db-map-spinner" style={{ borderTopColor: '#22c55e', margin: '0 auto 1rem' }}/>
              <p style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Finding local agricultural markets…</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
