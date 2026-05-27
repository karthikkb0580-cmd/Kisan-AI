import { useState } from 'react'

const MARKETS = [
  'Amritsar APMC', 'Ludhiana Grain', 'Jalandhar Mandi', 'Patiala Wholesale', 'Ferozepur Mandi', 'Bathinda Oil'
]

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

export default function MarketPrices() {
  const [activeCrop, setActiveCrop] = useState(null)

  return (
    <div className="db-section">
      <h1 className="db-page-title">💹 Market Prices</h1>
      <p className="db-page-sub">Live crop price matrix across nearby markets with AI-driven sell timing recommendations.</p>

      {/* ── PRICE MATRIX TABLE ── */}
      <div className="mp-section-title">📊 Price Matrix — All Markets</div>
      <div className="mp-table-wrap">
        <table className="mp-table">
          <thead>
            <tr>
              <th className="mp-th mp-th-crop">Crop</th>
              {MARKETS.map(m => (
                <th key={m} className="mp-th">{m}</th>
              ))}
              <th className="mp-th">7d Trend</th>
              <th className="mp-th">AI Signal</th>
            </tr>
          </thead>
          <tbody>
            {CROPS.map((crop) => {
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
                  {crop.prices.map((p, i) => (
                    <td
                      key={i}
                      className={`mp-td mp-price-cell ${p === maxPrice ? 'best' : p === minPrice ? 'worst' : ''}`}
                    >
                      <span>₹{p.toLocaleString()}</span>
                      {p === maxPrice && <span className="mp-best-dot" title="Best Price" />}
                    </td>
                  ))}
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
      <p className="mp-table-note">
        🟢 Highlighted = best price for that crop · 🔴 Dimmed = lowest price · Click a row for detailed AI analysis
      </p>

      {/* ── EXPANDED CROP DETAIL ── */}
      {activeCrop && (() => {
        const crop = CROPS.find(c => c.name === activeCrop)
        const rec  = recommendConfig[crop.recommend]
        const maxH = Math.max(...crop.history7d)
        return (
          <div className="mp-detail-card">
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
      <div className="mp-section-title">🤖 AI Sell Timing Recommendations</div>
      <div className="mp-timing-grid">
        {CROPS.map(crop => {
          const rec = recommendConfig[crop.recommend]
          return (
            <div key={crop.name} className="mp-timing-card" onClick={() => setActiveCrop(crop.name)}>
              <div className="mp-timing-top">
                <span className="mp-timing-emoji">{crop.emoji}</span>
                <div>
                  <h4 className="mp-timing-name">{crop.name}</h4>
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
