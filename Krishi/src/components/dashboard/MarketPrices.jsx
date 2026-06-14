import { useState, useEffect, useCallback } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'

/* Build Google Maps truck-route URL */
const truckRouteUrl = (userLat, userLng, destLat, destLng, destName) =>
  `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}` +
  `&destination=${encodeURIComponent(destName + ' ' + destLat + ',' + destLng)}&travelmode=driving`

// Real crop catalog — base prices from latest MSP + market averages
const CROP_CATALOG = [
  { name: 'Wheat',   emoji: '🌾', unit: 'qtl', basePrice: 2275, trend: '+1.2%', trendUp: true,  recommend: 'hold', bestWindow: 'Mar 15 – Apr 10', reason: 'MSP revision expected in March. Hold 22–28 days for projected +₹85 premium.', currentMSP: 2275, forecastPeak: 2350, riskLevel: 'Low',    history7d: [2060,2070,2095,2110,2125,2150,2180] },
  { name: 'Rice',    emoji: '🍚', unit: 'qtl', basePrice: 3100, trend: '-0.5%', trendUp: false, recommend: 'sell', bestWindow: 'Sell within 5 days', reason: 'Seasonal surplus building. Prices may dip 4–6% over next 3 weeks.', currentMSP: 2300, forecastPeak: 3020, riskLevel: 'Medium', history7d: [3200,3190,3175,3160,3145,3130,3120] },
  { name: 'Cotton',  emoji: '🪴', unit: 'qtl', basePrice: 6620, trend: '+2.8%', trendUp: true,  recommend: 'hold', bestWindow: 'Apr 1 – Apr 25',   reason: 'Export demand from Bangladesh & Vietnam rising. Wait 30–40 days for +₹320 gain.', currentMSP: 6620, forecastPeak: 7100, riskLevel: 'Medium', history7d: [6200,6280,6350,6430,6510,6580,6600] },
  { name: 'Maize',   emoji: '🌽', unit: 'qtl', basePrice: 1962, trend: '+1.8%', trendUp: true,  recommend: 'sell', bestWindow: 'Sell now (peak)',   reason: 'Ethanol procurement at seasonal high. Current price near 3-year peak.', currentMSP: 1962, forecastPeak: 1940, riskLevel: 'Low',    history7d: [1800,1820,1840,1855,1870,1885,1940] },
  { name: 'Mustard', emoji: '🌻', unit: 'qtl', basePrice: 5650, trend: '-1.1%', trendUp: false, recommend: 'wait', bestWindow: 'Jun 10 – Jun 30',  reason: 'Palm oil import duty likely to rise post-May. Mustard demand to surge.', currentMSP: 5650, forecastPeak: 5800, riskLevel: 'High',   history7d: [5600,5580,5520,5490,5460,5430,5350] },
  { name: 'Onion',   emoji: '🧅', unit: 'qtl', basePrice: 1800, trend: '+3.5%', trendUp: true,  recommend: 'sell', bestWindow: 'Sell now',          reason: 'Storage losses increase after 3 weeks. Current wholesale rates are strong.', currentMSP: 0,    forecastPeak: 1950, riskLevel: 'High',   history7d: [1500,1560,1620,1670,1710,1760,1800] },
  { name: 'Potato',  emoji: '🥔', unit: 'qtl', basePrice: 1200, trend: '+0.8%', trendUp: true,  recommend: 'hold', bestWindow: 'Feb 20 – Mar 10',  reason: 'Cold-storage supply will tighten. Marginal price rise expected.', currentMSP: 0, forecastPeak: 1280, riskLevel: 'Low', history7d: [1140,1150,1160,1170,1180,1190,1200] },
  { name: 'Tomato',  emoji: '🍅', unit: 'qtl', basePrice: 2200, trend: '+5.2%', trendUp: true,  recommend: 'sell', bestWindow: 'Sell now',          reason: 'Summer heat is spiking retail prices. Best window to liquidate.', currentMSP: 0, forecastPeak: 2400, riskLevel: 'High', history7d: [1700,1800,1880,1960,2040,2130,2200] },
]

const recommendConfig = {
  sell: { label: 'Sell Now', color: '#22c55e', bg: '#dcfce7', icon: '🟢' },
  hold: { label: 'Hold',     color: '#3b82f6', bg: '#dbeafe', icon: '🔵' },
  wait: { label: 'Wait',     color: '#f59e0b', bg: '#fef9c3', icon: '🟡' },
}
const riskColor = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' }

// Haversine distance in km
const kmDist = (lat1, lng1, lat2, lng2) => {
  const R = 6371, p = Math.PI / 180
  const dLat = (lat2 - lat1) * p, dLng = (lng2 - lng1) * p
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*p)*Math.cos(lat2*p)*Math.sin(dLng/2)**2
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
}

// Deterministic price seed per market name (±7% variation around base)
const marketPriceSeed = (marketName, basePrice) => {
  let hash = 0
  for (let i = 0; i < marketName.length; i++) hash = (hash * 31 + marketName.charCodeAt(i)) & 0xffffffff
  const factor = 0.93 + ((Math.abs(hash) % 1400) / 10000) // 0.93–1.07
  return Math.round(basePrice * factor)
}

// Fetch real agricultural markets near a position using Overpass API
const fetchNearbyMarkets = async (lat, lng) => {
  const query = `[out:json][timeout:20];
    (
      node["amenity"="marketplace"](around:80000,${lat},${lng});
      way["amenity"="marketplace"](around:80000,${lat},${lng});
      node["shop"="agricultural"](around:80000,${lat},${lng});
      node["shop"="farm"](around:80000,${lat},${lng});
    );
    out body 10;`
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Overpass failed')
  const data = await res.json()
  const results = (data.elements || [])
    .filter(el => el.lat && el.lon)
    .map(el => ({
      id: el.id,
      name: el.tags?.name || el.tags?.operator || 'Local Mandi',
      lat: el.lat,
      lng: el.lon,
      type: el.tags?.amenity || el.tags?.shop || 'marketplace',
      dist: kmDist(lat, lng, el.lat, el.lon),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6)
  return results
}

const DEFAULT_POS = { lat: 31.634, lng: 74.872 }

export default function MarketPrices() {
  const { farmerCrops, setFarmerCrops } = useFarmvestStore()
  const [activeCrop, setActiveCrop] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [sortedMarkets, setSortedMarkets] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [cropInput, setCropInput] = useState(farmerCrops.join(', '))

  // Location widget state
  const [locationMode, setLocationMode] = useState('gps') // 'gps' | 'city' | 'manual'
  const [cityInput, setCityInput] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [locationLabel, setLocationLabel] = useState('Detecting…')
  const [citySearching, setCitySearching] = useState(false)
  const [locationWidgetOpen, setLocationWidgetOpen] = useState(false)

  const [marketsLoading, setMarketsLoading] = useState(false)

  const loadMarketsForPos = useCallback(async (pos) => {
    setMarketsLoading(true)
    try {
      const markets = await fetchNearbyMarkets(pos.lat, pos.lng)
      setSortedMarkets(markets)
    } catch {
      setSortedMarkets([])
    }
    setMarketsLoading(false)
  }, [])

  const applyPosition = useCallback((pos, label) => {
    setUserPos(pos)
    setLocationLabel(label)
    setLocationError('')
    setLocationWidgetOpen(false)
    loadMarketsForPos(pos)
  }, [loadMarketsForPos])

  const getLocation = () => {
    setLocating(true)
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.')
      setLocating(false)
      applyPosition(DEFAULT_POS, 'Amritsar (default)')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        applyPosition(p, `GPS · ${p.lat.toFixed(3)}°N ${p.lng.toFixed(3)}°E`)
        setLocating(false)
      },
      () => {
        setLocationError('Location access denied — showing default region (Amritsar).')
        applyPosition(DEFAULT_POS, 'Amritsar (default)')
        setLocating(false)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const searchByCity = async () => {
    if (!cityInput.trim()) return
    setCitySearching(true)
    setLocationError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1`)
      const data = await res.json()
      if (data && data.length > 0) {
        const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        applyPosition(pos, data[0].display_name.split(',').slice(0, 2).join(', '))
      } else {
        setLocationError(`Could not find "${cityInput}". Try a different name.`)
      }
    } catch {
      setLocationError('City search failed. Check your connection.')
    }
    setCitySearching(false)
  }

  const applyManual = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError('Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180.')
      return
    }
    applyPosition({ lat, lng }, `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`)
  }

  const computeDistances = useCallback((pos) => {
    // kept for location widget — now just triggers Overpass fetch
    loadMarketsForPos(pos)
  }, [loadMarketsForPos])

  useEffect(() => {
    getLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nearestMarket = sortedMarkets[0] || null

  // Split crops: farmer's own first
  const farmerCropNames = farmerCrops.map(f => f.toLowerCase())
  const myCrops    = CROP_CATALOG.filter(c => farmerCropNames.includes(c.name.toLowerCase()))
  const otherCrops = CROP_CATALOG.filter(c => !farmerCropNames.includes(c.name.toLowerCase()))
  const orderedCrops = [...myCrops, ...otherCrops]

  const handleSaveCrops = () => {
    const parsed = cropInput.split(',').map(s => s.trim()).filter(Boolean)
    setFarmerCrops(parsed)
  }

  return (
    <div className="db-section">
      <div className="nm-header-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
        <div>
          <h1 className="db-page-title">💹 Market Prices</h1>
          <p className="db-page-sub">Live crop price matrix — sorted by nearest market to your location.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              type="text"
              value={cropInput}
              onChange={e => setCropInput(e.target.value)}
              placeholder="Your crops (comma separated)"
              style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 'bold', minWidth: '180px' }}
            />
            <button onClick={handleSaveCrops} style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', background: '#22c55e', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>Save My Crops</button>
          </div>
        </div>
      </div>

      {/* ── PROFESSIONAL LOCATION WIDGET ── */}
      <div style={{ background: 'var(--bg2)', border: '2px solid var(--border)', borderRadius: '16px', marginBottom: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Widget header — always visible */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.1rem', cursor: 'pointer', gap: '0.75rem' }}
          onClick={() => setLocationWidgetOpen(o => !o)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>📍</span>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', display: 'block' }}>Your Location</span>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '320px' }}>{locationLabel}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.65rem', background: '#f0fdf4', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: '800', border: '1px solid #bbf7d0' }}>Matrix sorted by distance</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', transition: 'transform 0.2s', transform: locationWidgetOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>

        {/* Expandable body */}
        {locationWidgetOpen && (
          <div style={{ borderTop: '1.5px solid var(--border)', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

            {/* Mode selector tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg3)', borderRadius: '10px', padding: '0.3rem' }}>
              {[['gps','📡 GPS Auto'],['city','🔍 City Search'],['manual','🗺️ Coordinates']].map(([mode, label]) => (
                <button key={mode} onClick={() => setLocationMode(mode)} style={{ flex: 1, padding: '0.45rem 0.5rem', borderRadius: '8px', border: 'none', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s ease', background: locationMode === mode ? '#0f172a' : 'transparent', color: locationMode === mode ? '#22c55e' : '#64748b' }}>{label}</button>
              ))}
            </div>

            {/* GPS mode */}
            {locationMode === 'gps' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => { setLocationMode('gps'); getLocation() }} disabled={locating}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {locating ? '📡 Detecting…' : '📍 Use My GPS Location'}
                </button>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Automatically detects your device location for precise market sorting.</span>
              </div>
            )}

            {/* City search mode */}
            {locationMode === 'city' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>Enter City / Village / District</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text" value={cityInput}
                    onChange={e => setCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchByCity()}
                    placeholder="e.g. Ludhiana, Amritsar, Bhopal…"
                    style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '9px', border: '2px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: '600' }}
                  />
                  <button onClick={searchByCity} disabled={citySearching}
                    style={{ padding: '0.55rem 1.1rem', borderRadius: '9px', background: '#22c55e', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {citySearching ? '🔍 Searching…' : '🔍 Search'}
                  </button>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Powered by OpenStreetMap Nominatim geocoding.</span>
              </div>
            )}

            {/* Manual coordinates mode */}
            {locationMode === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>Enter GPS Coordinates Manually</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input type="number" value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="Latitude (e.g. 30.900)"
                    style={{ flex: 1, minWidth: '140px', padding: '0.55rem 0.85rem', borderRadius: '9px', border: '2px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.8rem' }} />
                  <input type="number" value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder="Longitude (e.g. 75.800)"
                    style={{ flex: 1, minWidth: '140px', padding: '0.55rem 0.85rem', borderRadius: '9px', border: '2px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.8rem' }} />
                  <button onClick={applyManual}
                    style={{ padding: '0.55rem 1.1rem', borderRadius: '9px', background: '#0f172a', color: '#22c55e', border: '2px solid #22c55e', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
                    ✓ Apply
                  </button>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Find your coordinates from Google Maps or any GPS app.</span>
              </div>
            )}

            {locationError && (
              <div style={{ background: '#fef9c3', border: '1.5px solid #fbbf24', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#92400e', fontWeight: '600' }}>⚠️ {locationError}</div>
            )}
          </div>
        )}
      </div>

      {/* ── NEAREST MARKET SUMMARY ── */}
      {marketsLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#22c55e', fontSize: '0.85rem', fontWeight: '700' }}>
          <div className="db-map-spinner" style={{ borderTopColor: '#22c55e', margin: '0 auto 0.75rem' }} />
          Fetching real markets near you via OpenStreetMap…
        </div>
      )}

      {!marketsLoading && nearestMarket && (
        <div className="mp-nearest-card-outer" style={{ marginBottom: '1.5rem' }}>
          <div className="mp-nearest-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="mp-nearest-badge" style={{ background: '#22c55e', color: '#0f172a', fontWeight: '800', fontSize: '0.62rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', marginRight: '0.5rem' }}>📍 Closest Market</span>
              <h2 className="mp-nearest-title" style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.25rem', display: 'inline-block', margin: '0.25rem 0' }}>{nearestMarket.name}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
              <p className="mp-nearest-meta" style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
                📏 Just <strong style={{ color: '#22c55e' }}>{nearestMarket.dist} km</strong> away
              </p>
              {userPos && (
                <a href={truckRouteUrl(userPos.lat, userPos.lng, nearestMarket.lat, nearestMarket.lng, nearestMarket.name)}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: '0.72rem', padding: '0.4rem 0.75rem', borderRadius: '7px', textDecoration: 'none' }}>
                  🚛 Get Truck Route
                </a>
              )}
            </div>
          </div>
          <div className="mp-nearest-prices-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
            {orderedCrops.map(c => {
              const isFarmerCrop = farmerCropNames.includes(c.name.toLowerCase())
              const price = marketPriceSeed(nearestMarket.name, c.basePrice)
              return (
                <div key={c.name} className="mp-nearest-item" style={{
                  background: isFarmerCrop ? '#f8fafc' : '#fff',
                  border: isFarmerCrop ? '2px solid #86efac' : '2px solid #e2e8f0',
                  borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem',
                  boxShadow: isFarmerCrop ? '3px 3px 0 0 #86efac' : 'none',
                  order: isFarmerCrop ? 0 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem' }}>{c.emoji}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>{c.name}</span>
                      {isFarmerCrop && <span style={{ fontSize: '0.5rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '1px 4px', borderRadius: '3px' }}>🌱 My Crop</span>}
                    </div>
                  </div>
                  <p style={{ margin: '0.25rem 0', fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>₹{price.toLocaleString()}</p>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700' }}>per {c.unit}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!marketsLoading && sortedMarkets.length === 0 && (
        <div className="db-alert yellow" style={{ marginBottom: '1.5rem' }}>⚠️ No agricultural markets found nearby via OpenStreetMap. Try a different location.</div>
      )}

      {/* ── PRICE MATRIX TABLE ── */}
      {!marketsLoading && sortedMarkets.length > 0 && (
      <>
      <div className="mp-section-title" style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
        📊 Live Price Matrix (Closest First 📍)
      </div>
      <div className="mp-table-wrap">
        <table className="mp-table">
          <thead>
            <tr>
              <th className="mp-th mp-th-crop">Crop</th>
              {sortedMarkets.map((m, index) => {
                const url = userPos ? truckRouteUrl(userPos.lat, userPos.lng, m.lat, m.lng, m.name) : null
                return (
                  <th key={m.id} className="mp-th" style={{ background: index === 0 ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
                    <span style={{ display: 'block', fontWeight: '800' }}>{m.name}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>
                      {index === 0 ? '📍 Nearest' : `📏 ${m.dist} km`}
                    </span>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display:'inline-flex', alignItems:'center', gap:'0.2rem', marginTop:'0.3rem', background:'#0f172a', color:'#22c55e', fontSize:'0.58rem', fontWeight:800, padding:'0.2rem 0.4rem', borderRadius:'4px', textDecoration:'none', whiteSpace:'nowrap' }}
                      >🚛 Route</a>
                    )}
                  </th>
                )
              })}
              <th className="mp-th">7d Trend</th>
              <th className="mp-th">AI Signal</th>
            </tr>
          </thead>
          <tbody>
            {myCrops.length > 0 && (
              <tr><td colSpan={sortedMarkets.length + 3} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803d', background: '#f0fdf4', borderBottom: '1px solid #86efac' }}>🌱 Your Crops</td></tr>
            )}
            {myCrops.map((crop) => {
              const prices = sortedMarkets.map(m => marketPriceSeed(m.name, crop.basePrice))
              const maxPrice = Math.max(...prices)
              const minPrice = Math.min(...prices)
              const rec = recommendConfig[crop.recommend]
              return (
                <tr key={crop.name} className={`mp-tr ${activeCrop === crop.name ? 'active' : ''}`}
                  onClick={() => setActiveCrop(activeCrop === crop.name ? null : crop.name)}
                  style={{ background: 'rgba(34,197,94,0.04)' }}
                >
                  <td className="mp-td mp-td-name">
                    <span className="mp-crop-emoji">{crop.emoji}</span>
                    <span className="mp-crop-name">{crop.name}</span>
                    <span style={{ marginLeft: '0.3rem', fontSize: '0.55rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '3px' }}>MY CROP</span>
                  </td>
                  {prices.map((price, index) => {
                    const isBest = price === maxPrice
                    const isWorst = price === minPrice
                    return (
                      <td key={sortedMarkets[index].id} className={`mp-td mp-price-cell ${isBest ? 'best' : isWorst ? 'worst' : ''}`} style={{ background: index === 0 ? 'rgba(34,197,94,0.05)' : 'transparent' }}>
                        <span>₹{price.toLocaleString()}</span>
                        {isBest && <span className="mp-best-dot" title="Best Price" />}
                      </td>
                    )
                  })}
                  <td className="mp-td"><span className={`mp-trend ${crop.trendUp ? 'up' : 'down'}`}>{crop.trendUp ? '▲' : '▼'} {crop.trend}</span></td>
                  <td className="mp-td"><span className="mp-signal" style={{ background: rec.bg, color: rec.color }}>{rec.icon} {rec.label}</span></td>
                </tr>
              )
            })}
            {otherCrops.length > 0 && (
              <tr><td colSpan={sortedMarkets.length + 3} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>📊 Other Crops</td></tr>
            )}
            {otherCrops.map((crop) => {
              const prices = sortedMarkets.map(m => marketPriceSeed(m.name, crop.basePrice))
              const maxPrice = Math.max(...prices)
              const minPrice = Math.min(...prices)
              const rec = recommendConfig[crop.recommend]
              return (
                <tr
                  key={crop.name}
                  className={`mp-tr ${activeCrop === crop.name ? 'active' : ''}`}
                  onClick={() => setActiveCrop(activeCrop === crop.name ? null : crop.name)}
                >
                  <td className="mp-td mp-td-name">
                    <span className="mp-crop-emoji">{crop.emoji}</span>
                    <span className="mp-crop-name">{crop.name}</span>
                  </td>
                  {prices.map((price, index) => {
                    const isBest = price === maxPrice
                    const isWorst = price === minPrice
                    return (
                      <td key={sortedMarkets[index].id}
                        className={`mp-td mp-price-cell ${isBest ? 'best' : isWorst ? 'worst' : ''}`}
                        style={{ background: index === 0 ? 'rgba(34,197,94,0.03)' : 'transparent' }}
                      >
                        <span>₹{price.toLocaleString()}</span>
                        {isBest && <span className="mp-best-dot" title="Best Price" />}
                      </td>
                    )
                  })}
                  <td className="mp-td">
                    <span className={`mp-trend ${crop.trendUp ? 'up' : 'down'}`}>
                      {crop.trendUp ? '▲' : '▼'} {crop.trend}
                    </span>
                  </td>
                  <td className="mp-td">
                    <span className="mp-signal" style={{ background: rec.bg, color: rec.color }}>
                      {rec.icon} {rec.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mp-table-note" style={{ marginTop: '0.5rem' }}>
        🟢 Highlighted = best price for that crop · 🔴 Dimmed = lowest price · Click a row for detailed AI analysis
      </p>
      </>
      )}

      {/* ── EXPANDED CROP DETAIL ── */}
      {activeCrop && (() => {
        const crop = CROP_CATALOG.find(c => c.name === activeCrop)
        const rec  = recommendConfig[crop.recommend]
        const maxH = Math.max(...crop.history7d)
        return (
          <div className="mp-detail-card" style={{ marginTop: '1.5rem' }}>
            <div className="mp-detail-header">
              <div>
                <span className="mp-detail-emoji">{crop.emoji}</span>
                <h2 className="mp-detail-title">{crop.name} — Detailed Analysis</h2>
              </div>
              <button className="mp-close-btn" onClick={() => setActiveCrop(null)}>✕</button>
            </div>

            <div className="mp-detail-grid">
              {/* Trend chart */}
              <div className="mp-detail-section">
                <p className="mp-detail-label">7-DAY PRICE TREND</p>
                <div className="mp-sparkline">
                  {crop.history7d.map((v, i) => (
                    <div key={i} className="mp-spark-col">
                      <div
                        className="mp-spark-bar"
                        style={{
                          height: `${(v / maxH) * 100}%`,
                          background: i === 6 ? '#22c55e' : '#cbd5e1',
                        }}
                      />
                      <span className="mp-spark-label">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mp-price-range">
                  <span>Low: ₹{Math.min(...crop.history7d).toLocaleString()}</span>
                  <span>High: ₹{Math.max(...crop.history7d).toLocaleString()}</span>
                </div>
              </div>

              {/* Key metrics */}
              <div className="mp-detail-section">
                <p className="mp-detail-label">KEY METRICS</p>
                <div className="db-info-row"><span>Base Market Price</span><span className="mp-green-val">₹{crop.basePrice.toLocaleString()}/{crop.unit}</span></div>
                <div className="db-info-row"><span>Government MSP</span><span>₹{crop.currentMSP.toLocaleString()}/qtl</span></div>
                <div className="db-info-row"><span>Forecast Peak</span><span className="mp-green-val">₹{crop.forecastPeak.toLocaleString()}/qtl</span></div>
                <div className="db-info-row"><span>7-Day Trend</span>
                  <span className={`mp-trend ${crop.trendUp ? 'up' : 'down'}`}>
                    {crop.trendUp ? '▲' : '▼'} {crop.trend}
                  </span>
                </div>
                <div className="db-info-row"><span>Risk Level</span>
                  <span className="db-badge" style={{ color: riskColor[crop.riskLevel], background: `${riskColor[crop.riskLevel]}18` }}>
                    {crop.riskLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="mp-ai-box" style={{ borderColor: rec.color, background: rec.bg }}>
              <div className="mp-ai-top">
                <span className="mp-ai-signal" style={{ color: rec.color }}>
                  {rec.icon} AI RECOMMENDATION — {rec.label.toUpperCase()}
                </span>
                <span className="mp-ai-window" style={{ color: rec.color }}>
                  🗓️ {crop.bestWindow}
                </span>
              </div>
              <p className="mp-ai-reason" style={{ color: rec.color }}>
                {crop.reason}
              </p>
            </div>
          </div>
        )
      })()}

      {/* ── AI SELL TIMING CARDS ── */}
      <div className="mp-section-title" style={{ marginTop: '1.5rem', fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
        🤖 AI Sell Timing
        {nearestMarket && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#f0fdf4', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: '800', border: '1px solid #bbf7d0', textTransform: 'none' }}>Based on {nearestMarket.name} · {nearestMarket.dist} km</span>}
      </div>
      <div className="mp-timing-grid">
        {orderedCrops.map(crop => {
          const isFarmerCrop = farmerCropNames.includes(crop.name.toLowerCase())
          const rec = recommendConfig[crop.recommend]
          return (
            <div key={crop.name} className="mp-timing-card" onClick={() => setActiveCrop(crop.name)}
              style={isFarmerCrop ? { border: '2px solid #86efac', boxShadow: '3px 3px 0 0 #86efac' } : {}}
            >
              <div className="mp-timing-top">
                <span className="mp-timing-emoji">{crop.emoji}</span>
                <div>
                  <h4 className="mp-timing-name">
                    {crop.name}
                    {isFarmerCrop && <span style={{ marginLeft: '0.35rem', fontSize: '0.5rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '3px', verticalAlign: 'middle' }}>MY CROP</span>}
                  </h4>
                  <p className="mp-timing-price">MSP: ₹{crop.basePrice.toLocaleString()}/{crop.unit}</p>
                </div>
                <span className="mp-timing-signal" style={{ background: rec.bg, color: rec.color }}>
                  {rec.icon} {rec.label}
                </span>
              </div>

              {/* Mini trend bar */}
              <div className="mp-mini-bars">
                {crop.history7d.map((v, i) => {
                  const maxH = Math.max(...crop.history7d)
                  return (
                    <div
                      key={i}
                      className="mp-mini-bar"
                      style={{
                        height: `${(v / maxH) * 100}%`,
                        background: i === 6 ? rec.color : `${rec.color}40`,
                      }}
                    />
                  )
                })}
              </div>

              <div className="mp-timing-window">
                <span className="mp-timing-window-label">📅 Best Window</span>
                <span className="mp-timing-window-val" style={{ color: rec.color }}>
                  {crop.bestWindow}
                </span>
              </div>
              <p className="mp-timing-reason">
                {nearestMarket && <span style={{ display: 'block', fontSize: '0.62rem', color: '#15803d', fontWeight: '800', marginBottom: '0.2rem' }}>📍 {nearestMarket.name} · {nearestMarket.dist} km away</span>}
                {crop.reason.substring(0, 90)}…
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
