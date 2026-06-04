import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

// Fallback high-fidelity regional Mandis (Punjab & surrounding) if Overpass yields nothing
const PUNJAB_MANDIS = [
  { name: 'Amritsar APMC Mandi', lat: 31.6340, lng: 74.8720, address: 'GT Road, Amritsar, Punjab', type: 'APMC Market' },
  { name: 'Ludhiana Grain Market', lat: 30.9010, lng: 75.8570, address: 'Gill Road, Ludhiana, Punjab', type: 'Grain Market' },
  { name: 'Jalandhar Veg Mandi', lat: 31.3260, lng: 75.5760, address: 'Maqsudan, Jalandhar, Punjab', type: 'Vegetable Market' },
  { name: 'Patiala Wholesale Hub', lat: 30.3400, lng: 76.3800, address: 'Sanaur Road, Patiala, Punjab', type: 'Wholesale Mandi' },
  { name: 'Ferozepur Mandi', lat: 30.9240, lng: 74.6220, address: 'Cantt Area, Ferozepur, Punjab', type: 'APMC Market' },
  { name: 'Bathinda Oil & Grain Mandi', lat: 30.2110, lng: 74.9450, address: 'Mandi Road, Bathinda, Punjab', type: 'Oilseed Market' },
]

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

export default function NearbyMarkets() {
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

  const DEFAULT_POS = { lat: 31.634, lng: 74.872 } // Amritsar APMC

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

  const loadData = useCallback(async (pos) => {
    setPhase('loading')
    setError('')
    setSelectedIdx(null)
    setRouteCoordinates([])
    setRouteInfo(null)
    setRouteInstructions([])
    setIsNavigating(false)

    try {
      let list = []
      try {
        list = await fetchOverpassMarkets(pos.lat, pos.lng)
      } catch (e) {
        console.warn('Overpass API failed, falling back to static regional mandis.', e)
      }

      // If no open-source markets returned, populate with high-fidelity fallback mandis relative to position
      if (list.length === 0) {
        list = PUNJAB_MANDIS.map((m, index) => ({
          id: `fallback-${index}`,
          ...m,
        }))
      }

      // Calculate distances
      const sorted = list.map(m => ({
        ...m,
        dist: haversine(pos.lat, pos.lng, m.lat, m.lng),
      })).sort((a, b) => a.dist - b.dist)

      setMarkets(sorted)
      setPhase('ready')
    } catch (err) {
      setError('Could not retrieve real market coordinates. Using local region fallback.')
      const fallbackList = PUNJAB_MANDIS.map((m, index) => ({
        id: `fallback-${index}`,
        ...m,
        dist: haversine(pos.lat, pos.lng, m.lat, m.lng),
      })).sort((a, b) => a.dist - b.dist)
      setMarkets(fallbackList)
      setPhase('ready')
    }
  }, [])

  const getLocation = useCallback(() => {
    setPhase('locating')
    setError('')
    if (!navigator.geolocation) {
      setUserPos(DEFAULT_POS)
      loadData(DEFAULT_POS)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        loadData(p)
      },
      () => {
        setError('Location access denied — showing default Amritsar region.')
        setUserPos(DEFAULT_POS)
        loadData(DEFAULT_POS)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }, [loadData])

  useEffect(() => {
    getLocation()
  }, [getLocation])

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
      <div className="nm-header-row">
        <div>
          <h1 className="db-page-title">🛒 Nearby Markets</h1>
          <p className="db-page-sub">Real agricultural markets, sabzi mandis, and APMCs — 100% free cardless location search.</p>
        </div>
        <button 
          className="nm-locate-btn" 
          onClick={getLocation} 
          disabled={phase === 'locating' || phase === 'loading'}
        >
          {phase === 'locating' ? '📡 Locating…' : phase === 'loading' ? '🔍 Searching…' : '📍 Refresh Location'}
        </button>
      </div>

      {error && (
        <div className="db-alert yellow" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>
      )}

      <div className="nm-side-by-side-container">
        
        {/* Left Column: Interactive Map */}
        <div className="nm-map-side">
          <div className="nm-map-wrap" style={{ height: '420px', minHeight: '420px', position: 'relative' }}>
            <MapContainer
              center={mapCenter}
              zoom={11}
              style={{ width: '100%', height: '100%', borderRadius: '14px' }}
              zoomControl={true}
            >
              <MapController center={selectedMarket ? [selectedMarket.lat, selectedMarket.lng] : mapCenter} />
              
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Position Marker */}
              {userPos && (
                <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
                  <Popup>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>📍 Your Location</div>
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
                    <div style={{ padding: '0.2rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{m.name}</strong>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', color: '#64748b' }}>{m.address}</p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a' }}>📏 {m.dist} km away</span>
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
