import { useState, useEffect, lazy, Suspense } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import MarketPrices from './MarketPrices'
import CropScanner from './CropScanner'
import CropSecurity from './CropSecurity'
import FarmTraining from './FarmTraining'

// Lazy-load heavy map components
const NearbyMarkets = lazy(() => import('./NearbyMarkets'))
const TopographicalConditions = lazy(() => import('./TopographicalConditions'))

const NAV_ITEMS = [
  { id: 'dashboard',     icon: '📊', label: 'Dashboard'               },
  { id: 'topo',          icon: '🗺️',  label: 'Topographical Conditions' },
  { id: 'crop',          icon: '🌿', label: 'Crop Scanner'            },
  { id: 'security',      icon: '🛡️',  label: 'Crop Security'           },
  { id: 'training',      icon: '🎓', label: 'Farm Training'           },
  { id: 'government',    icon: '🏛️',  label: 'Government Supports'     },
  { id: 'markets',       icon: '🛒', label: 'Nearby Markets'          },
  { id: 'market-prices', icon: '💹', label: 'Market Prices'           },
  { id: 'history',       icon: '📅', label: 'Crop History'            },
]

const CROP_REMINDERS = [
  { id: 1, crop: '🌾 Wheat', action: 'Apply 2nd irrigation', due: 'Today 06:00 AM', urgency: 'urgent',   note: 'Crown root initiation stage — do not delay.' },
  { id: 2, crop: '🍚 Rice',  action: 'Spray Tricyclazole 75%', due: 'Tomorrow',    urgency: 'warning',  note: 'Blast disease risk high due to humid conditions.' },
  { id: 3, crop: '🌻 Mustard', action: 'Boron foliar spray', due: 'In 3 days',    urgency: 'info',     note: '0.5% Borax solution at early flowering stage.' },
  { id: 4, crop: '🪴 Cotton', action: 'Harvest 3rd picking', due: 'In 5 days',    urgency: 'info',     note: 'Check for fully opened bolls in Field B.' },
  { id: 5, crop: '🐄 Cow',   action: 'FMD Vaccination due', due: 'In 7 days',    urgency: 'warning',  note: 'Schedule vet visit — 6-month booster cycle.' },
]

const urgencyStyle = {
  urgent:  { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', dot: '#dc2626' },
  warning: { bg: '#fef9c3', color: '#b45309', border: '#fcd34d', dot: '#f59e0b' },
  info:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
}

function MapLoading() {
  return (
    <div className="db-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '0.75rem', color: '#22c55e' }}>
      <div className="db-map-spinner" style={{ borderTopColor: '#22c55e' }} />
      <strong style={{ fontSize: '0.8rem' }}>Loading map…</strong>
    </div>
  )
}

export default function Dashboard() {
  const { user, setView, theme } = useFarmvestStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [time, setTime] = useState(new Date())
  const [dismissedReminders, setDismissedReminders] = useState([])

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const fmtDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const activeReminders = CROP_REMINDERS.filter(r => !dismissedReminders.includes(r.id))

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
            {/* Live Clock Header */}
            <div className="dash-clock-bar">
              <div>
                <h1 className="db-page-title" style={{ margin: 0 }}>
                  Good {time.getHours() < 12 ? 'morning' : time.getHours() < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋
                </h1>
                <p className="db-page-sub" style={{ margin: 0 }}>Here's a real-time overview of your farm operations.</p>
              </div>
              <div className="dash-clock-widget">
                <span className="dash-clock-time">{fmt(time)}</span>
                <span className="dash-clock-date">{fmtDate(time)}</span>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="db-stats-grid" style={{ marginTop: '1.25rem' }}>
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

            {/* ── CROP REMINDERS PANEL ── */}
            {activeReminders.length > 0 && (
              <div className="dash-reminders-panel">
                <div className="dash-reminders-header">
                  <span className="dash-reminders-title">⏰ Upcoming Crop Treatments & Reminders</span>
                  <span className="dash-reminders-count">{activeReminders.length} pending</span>
                </div>
                <div className="dash-reminders-list">
                  {activeReminders.map(r => {
                    const s = urgencyStyle[r.urgency]
                    return (
                      <div key={r.id} className="dash-reminder-item" style={{ background: s.bg, borderColor: s.border }}>
                        <div className="dash-reminder-dot" style={{ background: s.dot }} />
                        <div className="dash-reminder-body">
                          <div className="dash-reminder-row">
                            <span className="dash-reminder-crop">{r.crop}</span>
                            <span className="dash-reminder-action">{r.action}</span>
                            <span className="dash-reminder-due" style={{ color: s.color }}>📅 {r.due}</span>
                          </div>
                          <p className="dash-reminder-note" style={{ color: s.color }}>{r.note}</p>
                        </div>
                        <button
                          className="dash-reminder-dismiss"
                          onClick={() => setDismissedReminders(prev => [...prev, r.id])}
                          title="Dismiss"
                        >✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
          <Suspense fallback={<MapLoading />}>
            <TopographicalConditions />
          </Suspense>
        )}

        {/* ── 3. CROP SCANNER ── */}
        {activeTab === 'crop' && <CropScanner />}

        {/* ── 4. CROP SECURITY ── */}
        {activeTab === 'security' && <CropSecurity />}

        {/* ── 5. FARM TRAINING ── */}
        {activeTab === 'training' && <FarmTraining />}

        {/* ── 6. GOVERNMENT SUPPORTS ── */}
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

        {/* ── 7. NEARBY MARKETS ── */}
        {activeTab === 'markets' && (
          <Suspense fallback={<MapLoading />}>
            <NearbyMarkets />
          </Suspense>
        )}

        {/* ── 8. MARKET PRICES ── */}
        {activeTab === 'market-prices' && <MarketPrices />}

        {/* ── 9. CROP HISTORY ── */}
        {activeTab === 'history' && (
          <div className="db-section">
            <h1 className="db-page-title">📅 Crop History</h1>
            <p className="db-page-sub">Your full seasonal cultivation log and yield performance.</p>

            <div className="db-history-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Season</th><th>Crop</th><th>Area (acres)</th>
                    <th>Yield (qtl)</th><th>Revenue</th><th>Status</th>
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
