import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AIAPI } from '../../services/api'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

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
    if (center) map.setView(center, zoom || map.getZoom(), { animate: true, duration: 0.5 })
  }, [center, zoom, map])
  return null
}

// Smooth-follow controller for navigation mode
function NavFollowController({ pos, active }) {
  const map = useMap()
  useEffect(() => {
    if (active && pos) map.setView(pos, 15, { animate: true, duration: 0.6 })
  }, [pos, active, map])
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
  const { farmerCrops, language } = useFarmvestStore()
  const t = useCallback((key, fallback) => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback || key
  }, [language])
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [userPos, setUserPos] = useState(null)
  const [markets, setMarkets] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeSegments, setRouteSegments] = useState([]) // [{coords, color}]
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeInstructions, setRouteInstructions] = useState([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [cropGrown, setCropGrown] = useState(farmerCrops[0] || 'Wheat')
  const [tileLayer, setTileLayer] = useState('roads')
  const [showTraffic, setShowTraffic] = useState(true)
  // Navigation mode state
  const [navMode, setNavMode] = useState(false)         // fullscreen nav overlay
  const [vehiclePos, setVehiclePos] = useState(null)    // [lat, lng] of animated vehicle
  const [navStepIdx, setNavStepIdx] = useState(0)       // current route step index
  const [navCoordIdx, setNavCoordIdx] = useState(0)     // current coord index along route
  const [navRunning, setNavRunning] = useState(false)   // animation playing
  const navTimerRef = useCallback(() => {}, [])
  const [navETA, setNavETA] = useState(0)               // remaining minutes

  const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY
  const hasTomTom = TOMTOM_KEY && TOMTOM_KEY !== 'your_tomtom_api_key_here'

  // Vehicle icon for navigation
  const vehicleIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:#3b82f6;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 6px rgba(59,130,246,0.35),0 3px 10px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;line-height:1;
    ">🚜</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

  // Smart multilingual speech
  const speakStep = useCallback((text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.92
    utter.pitch = 1.05
    // Pick a voice matching the browser language
    const lang = navigator.language || 'en-IN'
    const voices = window.speechSynthesis.getVoices()
    const match = voices.find(v => v.lang.startsWith(lang.slice(0,2))) ||
                  voices.find(v => v.lang.startsWith('en')) ||
                  voices[0]
    if (match) utter.voice = match
    utter.lang = match?.lang || lang
    window.speechSynthesis.speak(utter)
  }, [])

  // Preload voices (Chrome needs this)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
  }, [])

  const ALL_KNOWN_CROPS = ['Wheat', 'Rice', 'Cotton', 'Maize', 'Mustard', 'Tomato', 'Potato', 'Onion', 'Soybean', 'Apple', 'Grape']
  const otherCrops = ALL_KNOWN_CROPS.filter(c => !farmerCrops.includes(c))

  const DEFAULT_POS = { lat: 31.634, lng: 74.872 }

  const [mapDraggedCenter, setMapDraggedCenter] = useState(null)
  const [locationLabel, setLocationLabel] = useState('Detecting…')
  const [locationMode, setLocationMode] = useState('gps')
  const [locationWidgetOpen, setLocationWidgetOpen] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [citySearching, setCitySearching] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')

  const showSearchHere = useMemo(() => {
    if (!mapDraggedCenter || !userPos) return false
    const dist = haversine(userPos.lat, userPos.lng, mapDraggedCenter.lat, mapDraggedCenter.lng)
    return dist > 1.0
  }, [mapDraggedCenter, userPos])

  // Transport cost estimate: ₹15/km mini-truck, ₹22/km medium, ₹30/km large
  const transportCost = useCallback((distKm) => {
    const d = parseFloat(distKm)
    if (isNaN(d)) return null
    return { mini: Math.round(d * 15), medium: Math.round(d * 22), large: Math.round(d * 30) }
  }, [])

  // Time-of-day traffic advisory
  const trafficAdvisory = () => {
    const h = new Date().getHours()
    if (h >= 8 && h < 10) return { level: 'High', color: '#ef4444', tip: 'Morning rush — depart before 7AM or after 10AM' }
    if (h >= 17 && h < 20) return { level: 'High', color: '#ef4444', tip: 'Evening rush — delay trip by 1–2 hours' }
    if (h >= 10 && h < 17) return { level: 'Low', color: '#22c55e', tip: 'Good time to travel — roads are clear' }
    return { level: 'Low', color: '#22c55e', tip: 'Off-peak hours — minimal traffic expected' }
  }

  const searchByCity = async () => {
    if (!cityInput.trim()) return
    setCitySearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1`)
      const data = await res.json()
      if (data && data.length > 0) {
        const p = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        const label = data[0].display_name.split(',').slice(0, 2).join(', ')
        setLocationLabel(label)
        setUserPos(p)
        setLocationWidgetOpen(false)
        loadData(p, cropGrown)
      } else {
        setError(`Could not find "${cityInput}". Try a different name.`)
      }
    } catch { setError('City search failed.') }
    setCitySearching(false)
  }

  const applyManualCoords = () => {
    const lat = parseFloat(manualLat), lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Invalid coordinates.')
      return
    }
    setLocationLabel(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`)
    setUserPos({ lat, lng })
    setLocationWidgetOpen(false)
    loadData({ lat, lng }, cropGrown)
  }

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

  // Speed → traffic color
  const speedToColor = (kmh) => {
    if (kmh >= 60) return '#22c55e'   // green: free flow
    if (kmh >= 30) return '#f59e0b'   // amber: moderate
    return '#ef4444'                   // red: congested
  }

  // Load routing from OSRM
  const getOSRMRoute = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&annotations=true`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const allCoords = route.geometry.coordinates.map(c => [c[1], c[0]])
        const distanceKm = (route.distance / 1000).toFixed(1)
        const durationMin = Math.round(route.duration / 60)

        // Build per-step color segments from OSRM steps
        const segments = []
        if (route.legs?.[0]?.steps) {
          let segStart = 0
          const totalCoords = allCoords.length
          const steps = route.legs[0].steps
          steps.forEach((step, si) => {
            const speedKmh = step.duration > 0
              ? (step.distance / 1000) / (step.duration / 3600)
              : 80
            const color = speedToColor(speedKmh)
            const fraction = step.distance / route.distance
            const segLen = Math.max(2, Math.round(fraction * totalCoords))
            const segEnd = Math.min(segStart + segLen, totalCoords)
            if (segEnd > segStart) {
              segments.push({ coords: allCoords.slice(segStart, segEnd + 1), color })
              segStart = segEnd
            }
          })
          if (segStart < totalCoords - 1) {
            segments.push({ coords: allCoords.slice(segStart), color: '#22c55e' })
          }
        } else {
          segments.push({ coords: allCoords, color: '#22c55e' })
        }

        let instructions = []
        if (route.legs?.[0]?.steps) {
          instructions = route.legs[0].steps.map(step => {
            const { maneuver, name, distance } = step
            let text = ''
            if (maneuver.type === 'depart') text = `Head ${maneuver.modifier || 'straight'}`
            else if (maneuver.type === 'arrive') text = 'You will arrive at your destination'
            else if (maneuver.type === 'turn') text = `Turn ${maneuver.modifier || ''}`.trim()
            else text = `Continue ${maneuver.modifier || 'straight'}`
            if (name) text += ` onto ${name}`
            if (distance > 0) text += distance > 1000 ? ` for ${(distance/1000).toFixed(1)} km` : ` for ${Math.round(distance)} m`
            return text
          })
        }

        return { coords: allCoords, segments, distance: `${distanceKm} km`, duration: `${durationMin} mins`, instructions }
      }
    } catch { return null }
    return null
  }

  const loadData = useCallback(async (pos, currentCrop = '') => {
    setPhase('loading')
    setError('')
    setSelectedIdx(null)
    setRouteCoordinates([])
    setRouteSegments([])
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
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocationLabel(`GPS · ${p.lat.toFixed(3)}°N ${p.lng.toFixed(3)}°E`)
        setUserPos(p)
        loadData(p, cropGrown)
      },
      () => {
        setError('Location access denied — showing default Amritsar region.')
        setLocationLabel('Amritsar (default)')
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
      setRouteSegments([])
      setRouteInfo(null)
      setRouteInstructions([])
      setIsNavigating(false)
      return
    }
    const market = markets[selectedIdx]
    if (!market) return
    const load = async () => {
      const result = await getOSRMRoute(userPos, market)
      if (result) {
        setRouteCoordinates(result.coords)
        setRouteSegments(result.segments || [])
        setRouteInfo({ distance: result.distance, duration: result.duration })
        setRouteInstructions(result.instructions)
      } else {
        setRouteCoordinates([[userPos.lat, userPos.lng], [market.lat, market.lng]])
        setRouteSegments([{ coords: [[userPos.lat, userPos.lng], [market.lat, market.lng]], color: '#f59e0b' }])
        setRouteInfo({ distance: `${market.dist} km`, duration: `${Math.round(market.dist * 1.5)} mins` })
        setRouteInstructions([`Head directly towards ${market.name} for ${market.dist} km`])
      }
      setIsNavigating(false)
      setCurrentStep(0)
    }
    load()
  }, [selectedIdx, userPos, markets])

  const speakInstruction = useCallback((text) => {
    speakStep(text)
  }, [speakStep])

  // ── Immersive Navigation ──────────────────────────────────────────
  const startNavigation = () => {
    if (!routeCoordinates.length || !routeInstructions.length) return
    const market = markets[selectedIdx]
    setNavMode(true)
    setNavRunning(true)
    setNavStepIdx(0)
    setNavCoordIdx(0)
    setVehiclePos(routeCoordinates[0])
    const totalMin = routeInfo ? parseInt(routeInfo.duration) : 30
    setNavETA(totalMin)
    speakStep(`Navigation started. Heading to ${market?.name}. ${routeInstructions[0]}`)
  }

  const stopNavigation = () => {
    setNavMode(false)
    setNavRunning(false)
    setVehiclePos(null)
    setNavCoordIdx(0)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  // Animate vehicle along route
  useEffect(() => {
    if (!navRunning || !routeCoordinates.length) return
    const totalCoords = routeCoordinates.length
    const totalMin = routeInfo ? parseInt(routeInfo.duration) : 30
    // Move one coord every ~(totalDuration/totalCoords) ms, min 120ms
    const stepMs = Math.max(120, Math.round((totalMin * 60 * 1000) / totalCoords / 30))
    const interval = setInterval(() => {
      setNavCoordIdx(prev => {
        const next = prev + 1
        if (next >= totalCoords) {
          clearInterval(interval)
          setNavRunning(false)
          speakStep('You have arrived at your destination. Journey complete.')
          return prev
        }
        setVehiclePos(routeCoordinates[next])
        // Update ETA
        const remaining = Math.round(totalMin * (1 - next / totalCoords))
        setNavETA(remaining)
        // Announce next instruction at matching step boundary
        if (routeInstructions.length > 1) {
          const stepSize = Math.floor(totalCoords / routeInstructions.length)
          const stepNum = Math.floor(next / stepSize)
          if (next % stepSize === 0 && stepNum < routeInstructions.length) {
            setNavStepIdx(stepNum)
            speakStep(routeInstructions[stepNum])
          }
        }
        return next
      })
    }, stepMs)
    return () => clearInterval(interval)
  }, [navRunning, routeCoordinates, routeInstructions, routeInfo, speakStep])

  const startVoiceNavigation = () => startNavigation()

  const nextStep = () => {
    if (currentStep < routeInstructions.length - 1) {
      const nextIdx = currentStep + 1
      setCurrentStep(nextIdx)
      speakStep(routeInstructions[nextIdx])
    } else {
      speakStep('You have arrived at your destination.')
      setIsNavigating(false)
    }
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

      {/* ══ IMMERSIVE NAVIGATION OVERLAY — rendered via portal to overlay ALL content ══ */}
      {navMode && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0f172a',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Top HUD */}
          <div style={{ background: 'rgba(15,23,42,0.97)', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={stopNavigation}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>
              ❌ Exit
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', color: '#64748b' }}>Navigating to</div>
              <div style={{ fontWeight: '900', color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedMarket?.name}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#22c55e', lineHeight: 1 }}>{navETA}<span style={{ fontSize: '0.7rem', marginLeft: '3px' }}>min</span></div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{routeInfo?.distance}</div>
            </div>
          </div>

          {/* Current step card */}
          <div style={{ background: '#1e293b', padding: '0.85rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
              {navStepIdx % 2 === 0 ? '➡️' : '↪️'}
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Step {navStepIdx + 1} of {routeInstructions.length}</div>
              <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: '700', lineHeight: 1.4 }}>{routeInstructions[navStepIdx] || 'Follow the route'}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: '4px', background: '#1e293b' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#22c55e,#3b82f6)', width: `${Math.round((navCoordIdx / Math.max(routeCoordinates.length - 1, 1)) * 100)}%`, transition: 'width 0.3s ease' }} />
          </div>

          {/* Full-screen map */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer
              center={vehiclePos || mapCenter}
              zoom={15}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <NavFollowController pos={vehiclePos} active={navRunning} />
              {tileLayer === 'roads' && <TileLayer attribution='&copy; CARTO &copy; OSM' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />}
              {tileLayer === 'street' && <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
              {tileLayer === 'satellite' && <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />}
              {showTraffic && hasTomTom && <TileLayer url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`} opacity={0.75} zIndex={500} />}
              {routeSegments.map((seg, i) => <Polyline key={i} positions={seg.coords} pathOptions={{ color: seg.color, weight: 8, opacity: 0.9, lineCap: 'round' }} />)}
              <Polyline positions={routeCoordinates} pathOptions={{ color: '#fff', weight: 3, opacity: 0.5, dashArray: '8 16', className: 'route-flow' }} />
              {vehiclePos && <Marker position={vehiclePos} icon={vehicleIcon} />}
              {selectedMarket && <Marker position={[selectedMarket.lat, selectedMarket.lng]} icon={marketIcon('#22c55e', true)} />}
            </MapContainer>

            {/* Pause/Resume */}
            <button onClick={() => setNavRunning(r => !r)}
              style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1000, background: navRunning ? '#f59e0b' : '#22c55e', color: '#fff', border: 'none', borderRadius: '50%', width: '52px', height: '52px', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              {navRunning ? '⏸️' : '▶️'}
            </button>
          </div>
        </div>
      , document.body)}
      <div className="nm-header-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 className="db-page-title">{t('nearbyMarkets', '🛒 Nearby Markets')}</h1>
          <p className="db-page-sub">{t('nearbyMarketsSub', 'Real agricultural markets, sabzi mandis, and APMCs — click map or drag pin to search!')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={cropGrown} onChange={(e) => setCropGrown(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 'bold', minWidth: '200px', cursor: 'pointer' }}>
            <optgroup label={t('priorityCrops', 'Your Priority Crops')}>{farmerCrops.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
            <optgroup label={t('otherCrops', 'Other Crops')}>{otherCrops.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
          </select>
          <button className="nm-locate-btn" onClick={handleAnalyze} disabled={phase === 'locating' || phase === 'loading'} style={{ background: '#22c55e', color: 'white' }}>
            {phase === 'locating' ? t('locating', '📡 Locating…') : phase === 'loading' ? t('analyzing', '🔍 Analyzing…') : t('analyzeMarkets', '✨ Analyze Markets')}
          </button>
        </div>
      </div>

      {/* ── LOCATION WIDGET ── */}
      <div style={{ background: 'var(--bg2)', border: '2px solid var(--border)', borderRadius: '14px', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', cursor: 'pointer', gap: '0.5rem' }}
          onClick={() => setLocationWidgetOpen(o => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📍</span>
            <div>
              <span style={{ fontSize: '0.58rem', fontWeight: '900', textTransform: 'uppercase', color: '#64748b', display: 'block' }}>{t('searchLocation', 'Search Location')}</span>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{locationLabel}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', background: '#f0fdf4', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: '800', border: '1px solid #bbf7d0' }}>{t('autoSorted', 'Markets auto-sorted by distance')}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', transform: locationWidgetOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
          </div>
        </div>
        {locationWidgetOpen && (
          <div style={{ borderTop: '1.5px solid var(--border)', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg3)', borderRadius: '9px', padding: '0.25rem' }}>
              {[['gps', t('gps', '📡 GPS')],['city', t('city', '🔍 City')],['manual', t('coords', '🗺️ Coords')]].map(([m, l]) => (
                <button key={m} onClick={() => setLocationMode(m)}
                   style={{ flex: 1, padding: '0.4rem', borderRadius: '7px', border: 'none', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer', background: locationMode === m ? '#0f172a' : 'transparent', color: locationMode === m ? '#22c55e' : '#64748b' }}>{l}</button>
              ))}
            </div>
            {locationMode === 'gps' && (
              <button onClick={() => { getLocation(); setLocationWidgetOpen(false) }} disabled={phase === 'locating'}
                style={{ padding: '0.55rem 1rem', borderRadius: '9px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}>
                {phase === 'locating' ? t('locating', '📡 Detecting…') : t('useGps', '📍 Use My GPS Location')}
              </button>
            )}
            {locationMode === 'city' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchByCity()}
                  placeholder={t('cityPlaceholder', 'City / village / district…')}
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.78rem' }} />
                <button onClick={searchByCity} disabled={citySearching}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#22c55e', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {citySearching ? '🔍…' : t('search', '🔍 Search')}
                </button>
              </div>
            )}
            {locationMode === 'manual' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input type="number" value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder={t('latitude', 'Latitude')}
                  style={{ flex: 1, minWidth: '120px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.78rem' }} />
                <input type="number" value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder={t('longitude', 'Longitude')}
                  style={{ flex: 1, minWidth: '120px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.78rem' }} />
                <button onClick={applyManualCoords}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#0f172a', color: '#22c55e', border: '2px solid #22c55e', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}>{t('apply', '✓ Apply')}</button>
              </div>
            )}
          </div>
        )}
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
              <style>{`
                @keyframes routeFlow { to { stroke-dashoffset: -24; } }
                .route-flow { animation: routeFlow 0.8s linear infinite; }
              `}</style>
              <MapController center={selectedMarket ? [selectedMarket.lat, selectedMarket.lng] : mapCenter} />
              <MapEvents onMapClick={handleMapClick} onMapMove={handleMapMove} />

              {/* Tile layer */}
              {tileLayer === 'roads' && (
                <TileLayer
                  attribution='&copy; <a href="https://carto.com">CARTO</a> &copy; OpenStreetMap contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
              )}
              {tileLayer === 'street' && (
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
              {tileLayer === 'satellite' && (
                <TileLayer
                  attribution='&copy; Esri &mdash; Source: Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              )}

              {/* — TomTom Real-Time Traffic Flow overlay — */}
              {showTraffic && hasTomTom && (
                <TileLayer
                  key={`tt-flow-${TOMTOM_KEY}`}
                  attribution='Traffic &copy; <a href="https://www.tomtom.com">TomTom</a>'
                  url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
                  opacity={0.75}
                  zIndex={500}
                />
              )}
              {/* TomTom Traffic Incidents overlay */}
              {showTraffic && hasTomTom && (
                <TileLayer
                  key={`tt-inc-${TOMTOM_KEY}`}
                  attribution=''
                  url={`https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
                  opacity={0.9}
                  zIndex={501}
                />
              )}

              {/* Map controls: tile switcher + traffic toggle */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[['roads','🛣️ Roads'],['street','🗺️ Street'],['satellite','🛰️ Satellite']].map(([key, label]) => (
                  <button key={key} onClick={() => setTileLayer(key)}
                    style={{ padding: '4px 8px', background: tileLayer === key ? '#0f172a' : 'rgba(255,255,255,0.9)', color: tileLayer === key ? '#22c55e' : '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                    {label}
                  </button>
                ))}
                <button onClick={() => setShowTraffic(t => !t)}
                  style={{ padding: '4px 8px', background: showTraffic && hasTomTom ? '#ef4444' : 'rgba(255,255,255,0.9)', color: showTraffic && hasTomTom ? '#fff' : '#64748b', border: `1px solid ${showTraffic && hasTomTom ? '#ef4444' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', marginTop: '4px' }}>
                  {showTraffic && hasTomTom ? '🚦 Traffic ON' : '🚦 Traffic OFF'}
                </button>
              </div>

              {/* Traffic legend (only when live traffic is on) */}
              {showTraffic && hasTomTom && (
                <div style={{ position: 'absolute', bottom: '70px', left: '10px', zIndex: 1000, background: 'rgba(15,23,42,0.88)', borderRadius: '10px', padding: '0.5rem 0.75rem', fontSize: '0.62rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontWeight: '900', marginBottom: '3px', color: '#fbbf24' }}>🚦 Live Traffic</div>
                  {[['#22c55e','Free flow'],['#a3e635','Slow (80%)'],['#fbbf24','Very slow (60%)'],['#f97316','Congested (40%)'],['#ef4444','Gridlock']].map(([c,l]) => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '20px', height: '5px', background: c, borderRadius: '3px', display: 'inline-block' }} />
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Setup prompt if no TomTom key */}
              {showTraffic && !hasTomTom && (
                <div style={{ position: 'absolute', bottom: '70px', left: '10px', zIndex: 1000, background: 'rgba(15,23,42,0.92)', borderRadius: '12px', padding: '0.65rem 0.85rem', fontSize: '0.68rem', color: '#fff', maxWidth: '220px', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: '900', color: '#fbbf24', marginBottom: '4px' }}>🚦 Enable Live Traffic</div>
                  <div style={{ color: '#cbd5e1', marginBottom: '6px' }}>Get a <strong style={{ color: '#22c55e' }}>free TomTom API key</strong> (50k tiles/day, no credit card):</div>
                  <a href="https://developer.tomtom.com" target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: '#22c55e', color: '#0f172a', fontWeight: '900', padding: '4px 8px', borderRadius: '7px', textDecoration: 'none', textAlign: 'center', fontSize: '0.65rem' }}>
                    → developer.tomtom.com
                  </a>
                  <div style={{ color: '#94a3b8', marginTop: '5px', fontSize: '0.6rem' }}>Then add to .env: <code style={{ color: '#a78bfa' }}>VITE_TOMTOM_KEY=your_key</code></div>
                </div>
              )}

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

              {/* Traffic-coloured route segments */}
              {routeSegments.map((seg, i) => (
                <Polyline key={`seg-${i}`}
                  positions={seg.coords}
                  pathOptions={{ color: seg.color, weight: 7, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
                />
              ))}
              {/* Animated flow overlay */}
              {routeCoordinates.length > 0 && (
                <Polyline
                  positions={routeCoordinates}
                  pathOptions={{ color: '#fff', weight: 3, opacity: 0.6, dashArray: '8 16', className: 'route-flow' }}
                />
              )}
              {/* Vehicle marker (visible when nav running from main map) */}
              {vehiclePos && !navMode && <Marker position={vehiclePos} icon={vehicleIcon} />}
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontWeight: 'bold', flexWrap: 'wrap' }}>
                      <span>🚛 Road: {routeInfo.distance}</span>
                      <span style={{ color: '#22c55e' }}>⏱ {routeInfo.duration}</span>
                    </div>
                    {(() => {
                      const cost = transportCost(parseFloat(routeInfo.distance))
                      const traffic = trafficAdvisory()
                      return cost ? (
                        <>
                          <div style={{ fontSize: '0.72rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.4rem', textAlign: 'left' }}>
                            <div style={{ fontWeight: '800', color: '#fbbf24', marginBottom: '0.3rem' }}>💰 Transport Cost Estimate</div>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.45rem', borderRadius: '5px' }}>Mini ₹{cost.mini.toLocaleString()}</span>
                              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.45rem', borderRadius: '5px' }}>Medium ₹{cost.medium.toLocaleString()}</span>
                              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.45rem', borderRadius: '5px' }}>Large ₹{cost.large.toLocaleString()}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.4rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: traffic.color, flexShrink: 0 }} />
                            <span><strong style={{ color: traffic.color }}>Traffic: {traffic.level}</strong> — {traffic.tip}</span>
                          </div>
                        </>
                      ) : null
                    })()}
                    {routeInstructions.length > 0 && (
                      <button onClick={startNavigation}
                        style={{ background: 'linear-gradient(135deg,#22c55e,#3b82f6)', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(34,197,94,0.45)', animation: 'pulse 2s infinite' }}>
                        🚀 Start Navigation
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
