import { useState, lazy, Suspense } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import MarketPrices from './MarketPrices'

// Lazy-load map component (avoids SSR issues, faster initial load)
const NearbyMarkets = lazy(() => import('./NearbyMarkets'))

const NAV_ITEMS = [
  { id: 'dashboard',      icon: '📊', label: 'Dashboard'               },
  { id: 'topo',           icon: '🗺️',  label: 'Topographical Conditions' },
  { id: 'plant',          icon: '🌿', label: 'Plant Scanner'            },
  { id: 'security',       icon: '🛡️',  label: 'Crop Security'           },
  { id: 'government',     icon: '🏛️',  label: 'Government Supports'     },
  { id: 'markets',        icon: '🛒', label: 'Nearby Markets'          },
  { id: 'market-prices',  icon: '💹', label: 'Market Prices'           },
  { id: 'history',        icon: '📅', label: 'Crop History'            },
]

export default function Dashboard() {
  const { user, setView, theme } = useFarmvestStore()
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className={`db-root ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="db-sidebar">
        <div className="db-user-card">
          <div className="db-avatar">{user.avatar}</div>
          <div className="db-user-info">
            <p className="db-user-name">{user.name}</p>
            <p className="db-user-email">{user.email}</p>
          </div>
        </div>

        <nav className="db-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              id={`sidebar-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`db-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            >
              <span className="db-nav-icon">{item.icon}</span>
              <span className="db-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="db-logout-btn" onClick={() => setView('home')}>
          <span>🚪</span> Log Out
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="db-main">

        {/* ── 1. DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div className="db-section">
            <h1 className="db-page-title">Good morning, {user.name.split(' ')[0]} 👋</h1>
            <p className="db-page-sub">Here's a real-time overview of your farm operations.</p>

            <div className="db-stats-grid">
              {[
                { icon: '🌡️', label: 'Soil Temperature',  value: '24°C',     color: 'green'  },
                { icon: '💧', label: 'Soil Moisture',     value: '67%',      color: 'blue'   },
                { icon: '☀️', label: 'UV Index',          value: '6 (High)', color: 'yellow' },
                { icon: '🌬️', label: 'Wind Speed',        value: '12 km/h',  color: 'purple' },
              ].map(s => (
                <div key={s.label} className={`db-stat-card db-stat-${s.color}`}>
                  <span className="db-stat-icon">{s.icon}</span>
                  <p className="db-stat-value">{s.value}</p>
                  <p className="db-stat-label">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="db-grid-2">
              <div className="db-card">
                <h2 className="db-card-title">🛰️ Satellite Status</h2>
                <div className="db-info-row"><span>Uplink</span><span className="db-badge green">SECURE SAT-5</span></div>
                <div className="db-info-row"><span>Last Sync</span><span>2 min ago</span></div>
                <div className="db-info-row"><span>Coverage</span><span>99.7%</span></div>
                <div className="db-info-row"><span>Orbit Type</span><span>Geo-synchronous</span></div>
              </div>
              <div className="db-card">
                <h2 className="db-card-title">⚠️ Alerts</h2>
                <div className="db-alert yellow">🌧️ Light rain expected in 3 hours — defer fertilisation</div>
                <div className="db-alert green">✅ Nitrogen levels optimal across all sectors</div>
                <div className="db-alert red">🔴 Sector C-4 moisture below threshold — irrigation needed</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. TOPOGRAPHICAL CONDITIONS ── */}
        {activeTab === 'topo' && (
          <div className="db-section">
            <h1 className="db-page-title">🗺️ Topographical Conditions</h1>
            <p className="db-page-sub">Real-time satellite land surface analysis and soil topography.</p>

            <div className="db-stats-grid">
              {[
                { icon: '⛰️', label: 'Elevation',      value: '342 m',  color: 'green'  },
                { icon: '📐', label: 'Slope Gradient', value: '3.2°',   color: 'yellow' },
                { icon: '🌊', label: 'Drainage Index', value: 'Good',   color: 'blue'   },
                { icon: '🪨', label: 'Soil Type',      value: 'Loamy',  color: 'purple' },
              ].map(s => (
                <div key={s.label} className={`db-stat-card db-stat-${s.color}`}>
                  <span className="db-stat-icon">{s.icon}</span>
                  <p className="db-stat-value">{s.value}</p>
                  <p className="db-stat-label">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="db-grid-2">
              <div className="db-card">
                <h2 className="db-card-title">🧪 Soil Chemical Profile</h2>
                {[
                  { name: 'Nitrogen (N)',   pct: 72, color: '#22c55e' },
                  { name: 'Phosphorus (P)', pct: 54, color: '#3b82f6' },
                  { name: 'Potassium (K)',  pct: 88, color: '#f59e0b' },
                  { name: 'pH Level',      pct: 65, color: '#a855f7' },
                ].map(n => (
                  <div key={n.name} className="db-bar-row">
                    <div className="db-bar-header"><span>{n.name}</span><span>{n.pct}%</span></div>
                    <div className="db-bar-track">
                      <div className="db-bar-fill" style={{ width: `${n.pct}%`, background: n.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="db-card">
                <h2 className="db-card-title">📍 Terrain Analysis</h2>
                <div className="db-info-row"><span>Land Surface</span><span>Semi-arid plateau</span></div>
                <div className="db-info-row"><span>Water Retention</span><span>Moderate</span></div>
                <div className="db-info-row"><span>Erosion Risk</span><span className="db-badge yellow">Medium</span></div>
                <div className="db-info-row"><span>NDVI Score</span><span className="db-badge green">0.68 — Healthy</span></div>
                <div className="db-info-row"><span>Crop Suitability</span><span className="db-badge green">96%</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. PLANT SCANNER ── */}
        {activeTab === 'plant' && (
          <div className="db-section">
            <h1 className="db-page-title">🌿 Plant Scanner</h1>
            <p className="db-page-sub">AI-powered multi-spectral leaf and crop health analysis.</p>

            <div className="db-stats-grid">
              {[
                { icon: '🍃', label: 'Chlorophyll',    value: 'High',      color: 'green'  },
                { icon: '🦠', label: 'Disease Risk',   value: 'Low',       color: 'blue'   },
                { icon: '🌾', label: 'Growth Stage',   value: 'Tillering', color: 'yellow' },
                { icon: '📈', label: 'Yield Forecast', value: '+18.5%',    color: 'purple' },
              ].map(s => (
                <div key={s.label} className={`db-stat-card db-stat-${s.color}`}>
                  <span className="db-stat-icon">{s.icon}</span>
                  <p className="db-stat-value">{s.value}</p>
                  <p className="db-stat-label">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="db-grid-2">
              <div className="db-card">
                <h2 className="db-card-title">🔬 Scan Results — Sector A</h2>
                <div className="db-info-row"><span>Crop Type</span><span>Wheat (Triticum)</span></div>
                <div className="db-info-row"><span>Leaf Area Index</span><span>3.8</span></div>
                <div className="db-info-row"><span>Stem Health</span><span className="db-badge green">Normal</span></div>
                <div className="db-info-row"><span>Root Depth Est.</span><span>42 cm</span></div>
                <div className="db-info-row"><span>Water Stress</span><span className="db-badge yellow">Mild</span></div>
                <div className="db-info-row"><span>Pest Probability</span><span className="db-badge green">2% — Negligible</span></div>
              </div>
              <div className="db-card">
                <h2 className="db-card-title">💊 AI Recommendations</h2>
                <div className="db-alert green">✅ Apply 20kg/acre urea supplement in Sector A within 48h</div>
                <div className="db-alert yellow">⚠️ Monitor Sector B for early blight — re-scan in 72h</div>
                <div className="db-alert blue">💧 Increase drip irrigation frequency to every 18 hours</div>
                <div className="db-alert green">✅ Optimal window for top-dressing: 6–9 AM tomorrow</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. CROP SECURITY ── */}
        {activeTab === 'security' && (
          <div className="db-section">
            <h1 className="db-page-title">🛡️ Crop Security</h1>
            <p className="db-page-sub">Pest detection, disease surveillance, and weather threat monitoring.</p>

            <div className="db-stats-grid">
              {[
                { icon: '🐛', label: 'Pest Risk',       value: 'Low',    color: 'green'  },
                { icon: '🍄', label: 'Fungal Risk',     value: 'Medium', color: 'yellow' },
                { icon: '🌪️', label: 'Weather Threat', value: 'None',   color: 'blue'   },
                { icon: '🔒', label: 'Security Score',  value: '91/100', color: 'purple' },
              ].map(s => (
                <div key={s.label} className={`db-stat-card db-stat-${s.color}`}>
                  <span className="db-stat-icon">{s.icon}</span>
                  <p className="db-stat-value">{s.value}</p>
                  <p className="db-stat-label">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="db-grid-2">
              <div className="db-card">
                <h2 className="db-card-title">🐞 Detected Threats</h2>
                {[
                  { name: 'Aphid Colonies',  level: 'Low',   badge: 'green'  },
                  { name: 'Powdery Mildew',  level: 'Watch', badge: 'yellow' },
                  { name: 'Stem Borer',      level: 'None',  badge: 'green'  },
                  { name: 'Root Rot',        level: 'None',  badge: 'green'  },
                  { name: 'Locust Activity', level: 'None',  badge: 'green'  },
                ].map(t => (
                  <div key={t.name} className="db-info-row">
                    <span>{t.name}</span>
                    <span className={`db-badge ${t.badge}`}>{t.level}</span>
                  </div>
                ))}
              </div>
              <div className="db-card">
                <h2 className="db-card-title">📋 Security Actions</h2>
                <div className="db-alert yellow">⚠️ Spray neem-based pesticide in Row 12–18 by Friday</div>
                <div className="db-alert blue">🌧️ Post-rain fungicide application recommended</div>
                <div className="db-alert green">✅ Perimeter traps checked — no locust activity detected</div>
                <div className="db-info-row" style={{ marginTop: '0.75rem' }}><span>Last Drone Sweep</span><span>Today 06:15 AM</span></div>
                <div className="db-info-row"><span>Next Sweep</span><span>Today 06:15 PM</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. GOVERNMENT SUPPORTS ── */}
        {activeTab === 'government' && (
          <div className="db-section">
            <h1 className="db-page-title">🏛️ Government Supports</h1>
            <p className="db-page-sub">Active subsidies, schemes, and agricultural grants available to you.</p>

            <div className="db-schemes-grid">
              {[
                { name: 'PM-KISAN Yojana',      desc: 'Direct income support of ₹6,000/year to eligible farmer families.', status: 'Active',    badge: 'green',  amount: '₹6,000 / yr'   },
                { name: 'Soil Health Card',      desc: 'Free soil testing and nutrient recommendations for every farm.', status: 'Eligible',  badge: 'blue',   amount: 'Free'           },
                { name: 'PM Fasal Bima Yojana', desc: 'Crop insurance covering natural disasters, pests and diseases.',  status: 'Apply Now', badge: 'yellow', amount: '₹800 Premium'   },
                { name: 'eNAM Online Market',   desc: 'Unified national agriculture market connecting farmers to buyers.', status: 'Active',    badge: 'green',  amount: 'Free Access'    },
                { name: 'Kisan Credit Card',    desc: 'Short-term credit up to ₹3 lakh at 7% interest for farm inputs.', status: 'Eligible',  badge: 'blue',   amount: 'Up to ₹3L'     },
                { name: 'Paramparagat Krishi',  desc: 'Financial support for conversion to certified organic farming.', status: 'Apply Now', badge: 'yellow', amount: '₹50,000 grant'  },
              ].map(scheme => (
                <div key={scheme.name} className="db-scheme-card">
                  <div className="db-scheme-top">
                    <h3 className="db-scheme-name">{scheme.name}</h3>
                    <span className={`db-badge ${scheme.badge}`}>{scheme.status}</span>
                  </div>
                  <p className="db-scheme-desc">{scheme.desc}</p>
                  <div className="db-scheme-footer">
                    <span className="db-scheme-amount">{scheme.amount}</span>
                    <button className="db-scheme-btn">View Details →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. NEARBY MARKETS (with map) ── */}
        {activeTab === 'markets' && (
          <Suspense fallback={
            <div className="db-section">
              <div className="db-map-loading">
                <div className="db-map-spinner" />
                <p>Loading map…</p>
              </div>
            </div>
          }>
            <NearbyMarkets />
          </Suspense>
        )}

        {/* ── 7. MARKET PRICES ── */}
        {activeTab === 'market-prices' && <MarketPrices />}

        {/* ── 8. CROP HISTORY ── */}
        {activeTab === 'history' && (
          <div className="db-section">
            <h1 className="db-page-title">📅 Crop History</h1>
            <p className="db-page-sub">Your full seasonal cultivation log and yield performance.</p>

            <div className="db-history-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Crop</th>
                    <th>Area (acres)</th>
                    <th>Yield (qtl)</th>
                    <th>Revenue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { season: 'Rabi 2025–26', crop: 'Wheat',   area: '12', yield: '380', revenue: '₹80,750',  ok: true  },
                    { season: 'Kharif 2025',  crop: 'Rice',    area: '8',  yield: '220', revenue: '₹68,200',  ok: true  },
                    { season: 'Rabi 2024–25', crop: 'Mustard', area: '5',  yield: '90',  revenue: '₹46,800',  ok: true  },
                    { season: 'Kharif 2024',  crop: 'Cotton',  area: '10', yield: '150', revenue: '₹97,500',  ok: false },
                    { season: 'Rabi 2023–24', crop: 'Wheat',   area: '12', yield: '410', revenue: '₹87,125',  ok: true  },
                    { season: 'Kharif 2023',  crop: 'Maize',   area: '6',  yield: '180', revenue: '₹32,760',  ok: true  },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td>{r.season}</td>
                      <td><strong>{r.crop}</strong></td>
                      <td>{r.area}</td>
                      <td>{r.yield}</td>
                      <td className="db-revenue">{r.revenue}</td>
                      <td><span className={`db-badge ${r.ok ? 'green' : 'yellow'}`}>{r.ok ? 'Harvested' : 'Partial ⚠️'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="db-grid-2" style={{ marginTop: '0.5rem' }}>
              <div className="db-card">
                <h2 className="db-card-title">📊 Cumulative Summary</h2>
                <div className="db-info-row"><span>Total Seasons</span><span><strong>6</strong></span></div>
                <div className="db-info-row"><span>Total Area</span><span><strong>53 acres</strong></span></div>
                <div className="db-info-row"><span>Total Yield</span><span><strong>1,430 qtl</strong></span></div>
                <div className="db-info-row"><span>Total Revenue</span><span className="db-revenue"><strong>₹4,13,135</strong></span></div>
                <div className="db-info-row"><span>Avg Yield / Acre</span><span><strong>26.9 qtl</strong></span></div>
              </div>
              <div className="db-card">
                <h2 className="db-card-title">🌱 Best Performing Crop</h2>
                <div className="db-info-row"><span>Crop</span><span><strong>Wheat</strong></span></div>
                <div className="db-info-row"><span>Avg Yield</span><span><strong>395 qtl / season</strong></span></div>
                <div className="db-info-row"><span>Revenue per Acre</span><span><strong>₹7,032</strong></span></div>
                <div className="db-info-row"><span>Seasons Grown</span><span><strong>2</strong></span></div>
                <div className="db-alert green" style={{ marginTop: '0.75rem' }}>
                  ✅ Recommended for next Rabi season based on soil profile
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="db-mobile-bar">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={`mob-tab-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`db-mob-btn ${activeTab === item.id ? 'active' : ''}`}
          >
            <span className="db-mob-icon">{item.icon}</span>
            <span className="db-mob-label">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button
          id="mob-tab-logout"
          className="db-mob-btn db-mob-logout"
          onClick={() => setView('home')}
        >
          <span className="db-mob-icon">🚪</span>
          <span className="db-mob-label">Exit</span>
        </button>
      </nav>
    </div>
  )
}
