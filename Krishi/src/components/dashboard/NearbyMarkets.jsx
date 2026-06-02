import { useState, useEffect, useMemo } from 'react'
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
const marketIcon = (color = '#22c55e', best = false) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:${best ? '20' : '14'}px;
      height:${best ? '20' : '14'}px;
      background:${color};
      border:2.5px solid #0f172a;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [best ? 20 : 14, best ? 20 : 14],
    iconAnchor: [best ? 10 : 7, best ? 10 : 7],
  })

// User location icon
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;
    background:#3b82f6;
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(59,130,246,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// Generate mock markets seeded around user position
const generateMarkets = (lat, lng) => [
  { id: 1, name: 'Amritsar APMC Mandi',   lat: lat + 0.11, lng: lng + 0.09, open: true,  wheat: 2180, rice: 3120, cotton: 6600, maize: 1890, mustard: 5350, profit: 'High'   },
  { id: 2, name: 'Ludhiana Grain Market', lat: lat - 0.14, lng: lng + 0.21, open: true,  wheat: 2205, rice: 3050, cotton: 6820, maize: 1940, mustard: 5180, profit: 'Highest' },
  { id: 3, name: 'Jalandhar Veg Market',  lat: lat + 0.07, lng: lng - 0.18, open: false, wheat: 2090, rice: 3150, cotton: 6400, maize: 1810, mustard: 5410, profit: 'Medium' },
  { id: 4, name: 'Patiala Wholesale Hub', lat: lat - 0.22, lng: lng - 0.09, open: true,  wheat: 2150, rice: 3080, cotton: 6550, maize: 1870, mustard: 5280, profit: 'Medium' },
  { id: 5, name: 'Ferozepur Mandi',       lat: lat + 0.19, lng: lng + 0.28, open: true,  wheat: 2125, rice: 3100, cotton: 6480, maize: 1850, mustard: 5220, profit: 'Low'    },
  { id: 6, name: 'Bathinda Oil Mandi',    lat: lat - 0.09, lng: lng - 0.28, open: false, wheat: 2095, rice: 2980, cotton: 6720, maize: 1800, mustard: 5490, profit: 'Medium' },
]

// Haversine approx distance in km
const kmDist = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

// Recenter map component
function Recenter({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 12) }, [center, map])
  return null
}

const profitColors = {
  Highest: '#22c55e',
  High:    '#84cc16',
  Medium:  '#f59e0b',
  Low:     '#94a3b8',
}

export default function NearbyMarkets() {
  const [userPos, setUserPos] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [locating, setLocating] = useState(false)
  const [markets, setMarkets] = useState([])
  const [selectedCrop, setSelectedCrop] = useState('wheat')
  const [nearbyOnly, setNearbyOnly] = useState(true)

  const CROPS = ['wheat', 'rice', 'cotton', 'maize', 'mustard']

  const DEFAULT_POS = { lat: 31.634, lng: 74.872 } // Amritsar fallback
  const MAX_NEARBY_KM = 60 // Only show markets within this radius

  const loadMarkets = (pos) => {
    const all = generateMarkets(pos.lat, pos.lng).map(m => ({
      ...m,
      dist: kmDist(pos.lat, pos.lng, m.lat, m.lng),
    }))
    // Filter to nearby markets only; fall back to all if none qualify
    const nearby = all.filter(m => parseFloat(m.dist) <= MAX_NEARBY_KM)
    const mkts = nearby.length >= 2 ? nearby : all
    setMarkets(mkts)
    setNearbyOnly(nearby.length >= 2)
  }

  const getLocation = () => {
    setLocating(true)
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.')
      setLocating(false)
      const pos = DEFAULT_POS
      setUserPos(pos)
      loadMarkets(pos)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        loadMarkets(p)
        setLocating(false)
      },
      () => {
        setLocationError('Location access denied — showing default region (Amritsar).')
        const p = DEFAULT_POS
        setUserPos(p)
        loadMarkets(p)
        setLocating(false)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  // Load default on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive best market from current crop selection (avoids setState-in-effect)
  const bestMarket = useMemo(() => {
    if (!markets.length) return null
    return [...markets].sort((a, b) => b[selectedCrop] - a[selectedCrop])[0]
  }, [selectedCrop, markets])

  const center = userPos ? [userPos.lat, userPos.lng] : [DEFAULT_POS.lat, DEFAULT_POS.lng]

  return (
    <div className="db-section">
      <div className="nm-header-row">
        <div>
          <h1 className="db-page-title">🛒 Nearby Markets</h1>
          <p className="db-page-sub">Real-time location-aware market finder with profitable route mapping.</p>
        </div>
        <button
          className="nm-locate-btn"
          onClick={getLocation}
          disabled={locating}
        >
          {locating ? '📡 Locating…' : '📍 Refresh Location'}
        </button>
      </div>

      {locationError && (
        <div className="db-alert yellow">{locationError}</div>
      )}

      {/* Proximity notice */}
      <div className={`db-alert ${nearbyOnly ? 'green' : 'yellow'}`} style={{ marginBottom: '0.5rem' }}>
        {nearbyOnly
          ? `📍 Showing ${markets.length} markets within 60 km of your location — sorted nearest first.`
          : `🌐 No markets found within 60 km. Showing all ${markets.length} available markets.`}
      </div>

      {/* Crop selector for route */}
      <div className="nm-crop-row" style={{ marginBottom: '1.5rem' }}>
        <span className="nm-crop-label">Show best market for:</span>
        <div className="nm-crop-chips">
          {CROPS.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCrop(c)}
              className={`nm-crop-chip ${selectedCrop === c ? 'active' : ''}`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Split side-by-side layout */}
      <div className="nm-side-by-side-container">
        
        {/* Left column: Map wrapper */}
        <div className="nm-map-side">
          <div className="nm-map-wrap">
            {userPos && (
              <MapContainer
                center={center}
                zoom={11}
                className="nm-map"
                zoomControl={true}
                style={{ height: '480px' }}
              >
                <Recenter center={center} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User position */}
                <Marker position={center} icon={userIcon}>
                  <Popup>
                    <div className="nm-popup">
                      <strong>📍 Your Location</strong>
                      <br />
                      <small>{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</small>
                    </div>
                  </Popup>
                </Marker>

                {/* Grey lines to all markets */}
                {markets.map(m => (
                  <Polyline
                    key={`line-${m.id}`}
                    positions={[[userPos.lat, userPos.lng], [m.lat, m.lng]]}
                    pathOptions={{ color: '#94a3b8', weight: 1.5, dashArray: '5,5', opacity: 0.5 }}
                  />
                ))}

                {/* Green highlighted "most profitable" route */}
                {bestMarket && (
                  <Polyline
                    positions={[
                      [userPos.lat, userPos.lng],
                      [(userPos.lat + bestMarket.lat) / 2 + 0.04, (userPos.lng + bestMarket.lng) / 2],
                      [bestMarket.lat, bestMarket.lng]
                    ]}
                    pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.9 }}
                  />
                )}

                {/* Market markers */}
                {markets.map(m => (
                  <Marker
                    key={m.id}
                    position={[m.lat, m.lng]}
                    icon={marketIcon(profitColors[m.profit] || '#94a3b8', bestMarket?.id === m.id)}
                  >
                    <Popup>
                      <div className="nm-popup">
                        <strong>{m.name}</strong>
                        <br />
                        <small>🌾 Wheat: ₹{m.wheat}/qtl</small>
                        <br />
                        <small>🌾 {selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)}: ₹{m[selectedCrop]}/qtl</small>
                        <br />
                        <small>📏 {m.dist} km away</small>
                        <br />
                        <small style={{ color: m.open ? '#15803d' : '#dc2626' }}>
                          {m.open ? '🟢 Open Now' : '🔴 Closed'}
                        </small>
                        {bestMarket?.id === m.id && (
                          <div style={{ marginTop: 4, fontWeight: 700, color: '#15803d', fontSize: '0.75rem' }}>
                            ⭐ Best price for {selectedCrop}!
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}

            {/* Legend */}
            <div className="nm-legend">
              <div className="nm-legend-item">
                <span className="nm-legend-dot" style={{ background: '#22c55e' }} />
                <span>Best Route ({selectedCrop})</span>
              </div>
              <div className="nm-legend-item">
                <span className="nm-legend-dot" style={{ background: '#22c55e', width: 10, height: 10, border: '2px solid #0f172a' }} />
                <span>Highest Profit Market</span>
              </div>
              <div className="nm-legend-item">
                <span className="nm-legend-dot" style={{ background: '#3b82f6' }} />
                <span>Your Location</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Distances list */}
        <div className="nm-list-side">
          {/* Best market highlight inside column */}
          {bestMarket && (
            <div className="nm-best-card" style={{ marginBottom: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
              <div className="nm-best-left">
                <span className="nm-best-tag">⭐ Most Profitable for {selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)}</span>
                <h3 className="nm-best-name" style={{ fontSize: '1rem' }}>{bestMarket.name}</h3>
                <p className="nm-best-meta">{bestMarket.dist} km away · {bestMarket.open ? '🟢 Open' : '🔴 Closed'}</p>
              </div>
              <div className="nm-best-price">
                <p className="nm-best-price-val" style={{ fontSize: '1.4rem' }}>₹{bestMarket[selectedCrop]}</p>
                <p className="nm-best-price-label">per quintal</p>
              </div>
            </div>
          )}

          {/* Scrollable list of markets with distance and prices */}
          <div className="nm-markets-scroll-list">
            {[...markets]
              .sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist))
              .map(m => (
                <div key={m.id} className={`nm-market-list-item ${bestMarket?.id === m.id ? 'best' : ''}`}>
                  <div className="nm-item-header">
                    <div className="nm-item-title-section">
                      <h4 className="nm-item-name">{m.name}</h4>
                      <div className="nm-item-distance-row">
                        <span className="nm-distance-badge">📏 {m.dist} km away</span>
                        <span className={`nm-open-badge ${m.open ? 'open' : 'closed'}`} style={{
                          color: m.open ? '#22c55e' : '#ef4444',
                          fontWeight: '800',
                          fontSize: '0.65rem'
                        }}>
                          {m.open ? '🟢 Open' : '🔴 Closed'}
                        </span>
                      </div>
                    </div>
                    <span className="nm-item-profit-badge" style={{ 
                      background: `${profitColors[m.profit]}18`, 
                      color: profitColors[m.profit],
                      border: `1.5px solid ${profitColors[m.profit]}`
                    }}>
                      {m.profit}
                    </span>
                  </div>

                  <div className="nm-item-prices">
                    {CROPS.map(c => (
                      <div key={c} className={`nm-item-price-chip ${c === selectedCrop ? 'highlight' : ''}`}>
                        <span className="nm-item-crop">{c}</span>
                        <span className="nm-item-val">₹{m[c]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  )
}
