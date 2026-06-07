import { useState, useEffect } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'

const MARKETS = [
  'Amritsar APMC', 'Ludhiana Grain', 'Jalandhar Mandi', 'Patiala Wholesale', 'Ferozepur Mandi', 'Bathinda Oil'
]

const MARKET_COORDS = {
  'Amritsar APMC':    { lat: 31.634, lng: 74.872 },
  'Ludhiana Grain':   { lat: 30.901, lng: 75.857 },
  'Jalandhar Mandi':  { lat: 31.326, lng: 75.576 },
  'Patiala Wholesale':{ lat: 30.340, lng: 76.380 },
  'Ferozepur Mandi':  { lat: 30.924, lng: 74.622 },
  'Bathinda Oil':     { lat: 30.211, lng: 74.945 },
}

/* Build Google Maps truck-route URL (driving = suitable for trucks) */
const truckRouteUrl = (userLat, userLng, destLat, destLng, destName) =>
  `https://www.google.com/maps/dir/?api=1` +
  `&origin=${userLat},${userLng}` +
  `&destination=${encodeURIComponent(destName + ' ' + destLat + ',' + destLng)}` +
  `&travelmode=driving`

const CROPS = [
  {
    name: 'Wheat',      emoji: '🌾', unit: 'qtl',
    prices: [2180, 2205, 2090, 2150, 2125, 2095],
    trend: '+1.2%', trendUp: true,
    recommend: 'hold',
    bestWindow: 'Mar 15 – Apr 10',
    reason: 'Government MSP revision expected in March. Hold for 22–28 days for projected +₹85 premium.',
    currentMSP: 2275,
    forecastPeak: 2290,
    riskLevel: 'Low',
    history7d: [2060, 2070, 2095, 2110, 2125, 2150, 2180],
  },
  {
    name: 'Rice',       emoji: '🍚', unit: 'qtl',
    prices: [3120, 3050, 3150, 3080, 3100, 2980],
    trend: '-0.5%', trendUp: false,
    recommend: 'sell',
    bestWindow: 'Sell within 5 days',
    reason: 'Seasonal surplus is building up. Prices expected to dip 4–6% over the next 3 weeks due to increased procurement.',
    currentMSP: 2300,
    forecastPeak: 3020,
    riskLevel: 'Medium',
    history7d: [3200, 3190, 3175, 3160, 3145, 3130, 3120],
  },
  {
    name: 'Cotton',     emoji: '🪴', unit: 'qtl',
    prices: [6600, 6820, 6400, 6550, 6480, 6720],
    trend: '+2.8%', trendUp: true,
    recommend: 'hold',
    bestWindow: 'Apr 1 – Apr 25',
    reason: 'Export demand from Bangladesh and Vietnam rising strongly. Wait 30–40 days for projected +₹320 gain.',
    currentMSP: 6620,
    forecastPeak: 7100,
    riskLevel: 'Medium',
    history7d: [6200, 6280, 6350, 6430, 6510, 6580, 6600],
  },
  {
    name: 'Maize',      emoji: '🌽', unit: 'qtl',
    prices: [1890, 1940, 1810, 1870, 1850, 1800],
    trend: '+1.8%', trendUp: true,
    recommend: 'sell',
    bestWindow: 'Sell now (peak)',
    reason: 'Ethanol procurement demand at seasonal high. Current price near 3-year peak. Sell now to lock in gains.',
    currentMSP: 1962,
    forecastPeak: 1940,
    riskLevel: 'Low',
    history7d: [1800, 1820, 1840, 1855, 1870, 1885, 1940],
  },
  {
    name: 'Mustard',    emoji: '🌻', unit: 'qtl',
    prices: [5350, 5180, 5410, 5280, 5220, 5490],
    trend: '-1.1%', trendUp: false,
    recommend: 'wait',
    bestWindow: 'Jun 10 – Jun 30',
    reason: 'Import duty on palm oil likely to rise post-May. Domestic mustard oil demand expected to surge. Wait 60–75 days.',
    currentMSP: 5650,
    forecastPeak: 5800,
    riskLevel: 'High',
    history7d: [5600, 5580, 5520, 5490, 5460, 5430, 5350],
  },
]

const recommendConfig = {
  sell:  { label: 'Sell Now',   color: '#22c55e', bg: '#dcfce7',  icon: '🟢' },
  hold:  { label: 'Hold',       color: '#3b82f6', bg: '#dbeafe',  icon: '🔵' },
  wait:  { label: 'Wait',       color: '#f59e0b', bg: '#fef9c3',  icon: '🟡' },
}

const riskColor = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' }

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

const DEFAULT_POS = { lat: 31.634, lng: 74.872 } // Amritsar APMC

export default function MarketPrices() {
  const { farmerCrops, setFarmerCrops } = useFarmvestStore()
  const [activeCrop, setActiveCrop] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [sortedMarkets, setSortedMarkets] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [cropInput, setCropInput] = useState(farmerCrops.join(', '))

  const getLocation = () => {
    setLocating(true)
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.')
      setLocating(false)
      setUserPos(DEFAULT_POS)
      computeDistances(DEFAULT_POS)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        computeDistances(p)
        setLocating(false)
      },
      () => {
        setLocationError('Location access denied — showing default region (Amritsar).')
        setUserPos(DEFAULT_POS)
        computeDistances(DEFAULT_POS)
        setLocating(false)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const computeDistances = (pos) => {
    const list = MARKETS.map((name, idx) => {
      const coords = MARKET_COORDS[name]
      const dist = kmDist(pos.lat, pos.lng, coords.lat, coords.lng)
      return {
        name,
        dist: parseFloat(dist),
        idx
      }
    })
    // Sort by distance (closest first)
    list.sort((a, b) => a.dist - b.dist)
    setSortedMarkets(list)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const orderedMarkets = sortedMarkets.length > 0 
    ? sortedMarkets 
    : MARKETS.map((m, i) => ({ name: m, dist: 0, idx: i }))

  const nearestMarket = orderedMarkets[0]

  // Split crops: farmer's own crops first, then the rest
  const farmerCropNames = farmerCrops.map(f => f.toLowerCase())
  const myCrops   = CROPS.filter(c => farmerCropNames.includes(c.name.toLowerCase()))
  const otherCrops = CROPS.filter(c => !farmerCropNames.includes(c.name.toLowerCase()))
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
          <p className="db-page-sub">Live crop price matrix — your crops shown first.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <button
            className="nm-locate-btn"
            onClick={getLocation}
            disabled={locating}
          >
            {locating ? '📡 Locating…' : '📍 Refresh Location'}
          </button>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              type="text"
              value={cropInput}
              onChange={e => setCropInput(e.target.value)}
              placeholder="Your crops (comma separated)"
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '7px',
                border: '1.5px solid var(--border)',
                background: 'var(--bg2)',
                color: 'var(--text)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                minWidth: '200px'
              }}
            />
            <button
              onClick={handleSaveCrops}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', background: '#22c55e', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
            >Save My Crops</button>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>🌱 Your crops: <strong style={{ color: 'var(--accent)' }}>{farmerCrops.join(', ')}</strong></p>
        </div>
      </div>

      {locationError && (
        <div className="db-alert yellow" style={{ marginBottom: '1.5rem' }}>{locationError}</div>
      )}

      {/* ── 📍 NEAREST MARKET SUMMARY BLOCK ── */}
      <div className="mp-nearest-card-outer" style={{ marginBottom: '1.5rem' }}>
        <div className="mp-nearest-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span className="mp-nearest-badge" style={{ background: '#22c55e', color: '#0f172a', fontWeight: '800', fontSize: '0.62rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', marginRight: '0.5rem' }}>📍 Closest Market Prices</span>
            <h2 className="mp-nearest-title" style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.25rem', display: 'inline-block', margin: '0.25rem 0' }}>{nearestMarket.name}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <p className="mp-nearest-meta" style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
              📏 Just <strong style={{ color: '#22c55e' }}>{nearestMarket.dist} km</strong> away
            </p>
            {userPos && MARKET_COORDS[nearestMarket.name] && (
              <a
                href={truckRouteUrl(userPos.lat, userPos.lng, MARKET_COORDS[nearestMarket.name].lat, MARKET_COORDS[nearestMarket.name].lng, nearestMarket.name)}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: '0.72rem', padding: '0.4rem 0.75rem', borderRadius: '7px', textDecoration: 'none' }}
              >
                🚛 Get Truck Route
              </a>
            )}
          </div>
        </div>

        <div className="mp-nearest-prices-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          {orderedCrops.map(c => {
            const isFarmerCrop = farmerCropNames.includes(c.name.toLowerCase())
            const price = c.prices[nearestMarket.idx]
            const max = Math.max(...c.prices)
            const isBest = price === max
            return (
              <div key={c.name} className="mp-nearest-item" style={{ 
                background: isFarmerCrop ? (isBest ? '#f0fdf4' : '#f8fafc') : (isBest ? '#f0fdf4' : '#fff'),
                border: isFarmerCrop ? `2px solid ${isBest ? '#22c55e' : '#86efac'}` : (isBest ? '2px solid #22c55e' : '2px solid #e2e8f0'),
                borderRadius: '12px', 
                padding: '0.75rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.2rem',
                boxShadow: isFarmerCrop ? '3px 3px 0 0 #86efac' : (isBest ? '3px 3px 0 0 #22c55e' : 'none'),
                order: isFarmerCrop ? 0 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem' }}>{c.emoji}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.55rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>{c.name}</span>
                    {isFarmerCrop && <span style={{ fontSize: '0.5rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '1px 4px', borderRadius: '3px' }}>🌱 My Crop</span>}
                  </div>
                </div>
                <p style={{ margin: '0.25rem 0', fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.1rem', color: isBest ? '#15803d' : '#0f172a' }}>
                  ₹{price.toLocaleString()}
                </p>
                <span style={{ fontSize: '0.6rem', color: isBest ? '#15803d' : '#64748b', fontWeight: '700' }}>
                  {isBest ? '⭐ Best Price!' : `Max: ₹${max}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── PRICE MATRIX TABLE ── */}
      <div className="mp-section-title" style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
        📊 Live Price Matrix (Closest First 📍)
      </div>
      <div className="mp-table-wrap">
        <table className="mp-table">
          <thead>
            <tr>
              <th className="mp-th mp-th-crop">Crop</th>
              {orderedMarkets.map((m, index) => {
                const coords = MARKET_COORDS[m.name]
                const url = userPos && coords
                  ? truckRouteUrl(userPos.lat, userPos.lng, coords.lat, coords.lng, m.name)
                  : null
                return (
                  <th key={m.name} className="mp-th" style={{ background: index === 0 ? 'rgba(34, 197, 94, 0.08)' : 'transparent' }}>
                    <span style={{ display: 'block', fontWeight: '800' }}>{m.name}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>
                      {index === 0 ? '📍 Nearest' : `📏 ${m.dist} km`}
                    </span>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display:'inline-flex', alignItems:'center', gap:'0.2rem', marginTop:'0.3rem', background:'#0f172a', color:'#22c55e', fontSize:'0.58rem', fontWeight:800, padding:'0.2rem 0.4rem', borderRadius:'4px', textDecoration:'none', whiteSpace:'nowrap' }}
                      >🚛 Truck Route</a>
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
              <tr><td colSpan={orderedMarkets.length + 3} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803d', background: '#f0fdf4', borderBottom: '1px solid #86efac' }}>🌱 Your Crops</td></tr>
            )}
            {myCrops.map((crop) => {
              const maxPrice = Math.max(...crop.prices)
              const minPrice = Math.min(...crop.prices)
              const rec = recommendConfig[crop.recommend]
              return (
                <tr
                  key={crop.name}
                  className={`mp-tr ${activeCrop === crop.name ? 'active' : ''}`}
                  onClick={() => setActiveCrop(activeCrop === crop.name ? null : crop.name)}
                  style={{ background: 'rgba(34,197,94,0.04)' }}
                >
                  <td className="mp-td mp-td-name">
                    <span className="mp-crop-emoji">{crop.emoji}</span>
                    <span className="mp-crop-name">{crop.name}</span>
                    <span style={{ marginLeft: '0.3rem', fontSize: '0.55rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '3px' }}>MY CROP</span>
                  </td>
                  {orderedMarkets.map((m, index) => {
                    const price = crop.prices[m.idx]
                    const isBest = price === maxPrice
                    const isWorst = price === minPrice
                    return (
                      <td key={m.name} className={`mp-td mp-price-cell ${isBest ? 'best' : isWorst ? 'worst' : ''}`} style={{ background: index === 0 ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}>
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
              <tr><td colSpan={orderedMarkets.length + 3} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>📊 Other Crops</td></tr>
            )}
            {otherCrops.map((crop) => {
              const maxPrice = Math.max(...crop.prices)
              const minPrice = Math.min(...crop.prices)
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
                  {orderedMarkets.map((m, index) => {
                    const price = crop.prices[m.idx]
                    const isBest = price === maxPrice
                    const isWorst = price === minPrice
                    return (
                      <td
                        key={m.name}
                        className={`mp-td mp-price-cell ${isBest ? 'best' : isWorst ? 'worst' : ''}`}
                        style={{ background: index === 0 ? 'rgba(34, 197, 94, 0.03)' : 'transparent' }}
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

      {/* ── EXPANDED CROP DETAIL ── */}
      {activeCrop && (() => {
        const crop = CROPS.find(c => c.name === activeCrop)
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
                <div className="db-info-row"><span>Current Best Price</span><span className="mp-green-val">₹{Math.max(...crop.prices).toLocaleString()}/qtl</span></div>
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
        🤖 AI Sell Timing Recommendations
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
                  <p className="mp-timing-price">Best: ₹{Math.max(...crop.prices).toLocaleString()}/qtl</p>
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
              <p className="mp-timing-reason">{crop.reason.substring(0, 90)}…</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
