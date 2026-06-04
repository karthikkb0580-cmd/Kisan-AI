import { useState, useEffect, lazy, Suspense } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import MarketPrices from './MarketPrices'
import CropScanner from './CropScanner'
import CropSecurity from './CropSecurity'
import FarmTraining from './FarmTraining'

const NearbyMarkets = lazy(() => import('./NearbyMarkets'))
const TopographicalConditions = lazy(() => import('./TopographicalConditions'))

const NAV_ITEMS = [
  { id: 'dashboard',     icon: '📊', label: 'Dashboard' },
  { id: 'topo',          icon: '🗺️', label: 'Topographical' },
  { id: 'crop',          icon: '🌿', label: 'Crop Scanner' },
  { id: 'security',      icon: '🛡️', label: 'Crop Security' },
  { id: 'training',      icon: '🎓', label: 'Farm Training' },
  { id: 'government',    icon: '🏛️', label: 'Gov. Supports' },
  { id: 'markets',       icon: '🛒', label: 'Nearby Markets' },
  { id: 'market-prices', icon: '💹', label: 'Market Prices' },
  { id: 'history',       icon: '📅', label: 'Crop History' },
  { id: 'settings',      icon: '⚙️', label: 'Settings' },
]

const SEED_REMINDERS = [
  { id: 1, disease: '🌾 Wheat — 2nd Irrigation', treatment: 'Apply 200 L water per acre', dosage: 'Today 06:00 AM', urgency: 'urgent', status: 'pending' },
  { id: 2, disease: '🍚 Rice — Spray Tricyclazole 75%', treatment: 'Tricyclazole 75% WP — 120 g/acre', dosage: 'Tomorrow', urgency: 'warning', status: 'pending' },
  { id: 3, disease: '🌻 Mustard — Boron foliar spray', treatment: '0.5% Borax solution at early flower', dosage: 'In 3 days', urgency: 'info', status: 'pending' },
]

const URGENCY = {
  urgent:  { bg: 'var(--urg-urgent-bg)', color: 'var(--urg-urgent)', border: 'var(--urg-urgent-border)', dot: 'var(--urg-urgent)' },
  warning: { bg: 'var(--urg-warn-bg)', color: 'var(--urg-warn)', border: 'var(--urg-warn-border)', dot: 'var(--urg-warn)' },
  info:    { bg: 'var(--urg-info-bg)', color: 'var(--urg-info)', border: 'var(--urg-info-border)', dot: 'var(--urg-info)' },
}

function MapLoading() {
  return (
    <div className="db-section" style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'300px',gap:'.75rem' }}>
      <div className="db-map-spinner" style={{ borderTopColor:'var(--accent)' }} />
      <strong style={{ fontSize:'.8rem',color:'var(--accent)' }}>Loading map…</strong>
    </div>
  )
}

export default function Dashboard() {
  const { user, setView, theme } = useFarmvestStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [time, setTime] = useState(new Date())
  const [treatments, setTreatments] = useState(SEED_REMINDERS)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const mainEl = document.querySelector('.db-main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [activeTab])

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
  const fmtDate = (d) => d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  const handleTreatmentSelected = (reminder) => {
    setTreatments(prev => {
      if (prev.find(t => t.id === reminder.id)) return prev
      return [{ ...reminder, urgency: reminder.urgency || reminder.severityLevel || 'info' }, ...prev]
    })
  }
  const markStatus = (id, status) => setTreatments(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  const removeTreatment = (id) => setTreatments(prev => prev.filter(t => t.id !== id))
  const refreshTreatments = () => { setTreatments(SEED_REMINDERS); setTime(new Date()) }

  const activeTreatments = treatments.filter(t => t.status !== 'done' && t.status !== 'skipped')
  const completedTreatments = treatments.filter(t => t.status === 'done' || t.status === 'skipped')

  const switchTab = (id) => { setActiveTab(id); setSidebarOpen(false) }

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Are you absolutely sure you want to delete your operator account? This action is permanent and all your diagnostics data will be lost."
    );
    if (!confirmDelete) return;

    // Delete user from localStorage mock DB
    const users = JSON.parse(localStorage.getItem('krishi_users') || '[]')
    const filtered = users.filter(u => u.id !== user.id)
    localStorage.setItem('krishi_users', JSON.stringify(filtered))

    // Wipe session logs
    localStorage.removeItem('krishi_scan_logs')

    alert("👋 Account permanently deleted. Thank you for using Krishi AI.");
    setView('home');
  };

  return (
    <div className={`db-root ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="db-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="db-user-card">
          <div className="db-avatar">{user.avatar}</div>
          <div className="db-user-info">
            <p className="db-user-name">{user.name}</p>
            <p className="db-user-email">{user.email}</p>
          </div>
        </div>
        <nav className="db-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.id} id={`sidebar-${item.id}`} onClick={() => switchTab(item.id)}
              className={`db-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              title={item.label}>
              <span className="db-nav-icon">{item.icon}</span>
              <span className="db-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="db-logout-btn" onClick={() => setView('home')}>
          <span>🚪</span> Log Out
        </button>
      </aside>

      {/* MAIN */}
      <main className="db-main">

        {/* Mobile top bar with hamburger */}
        <div className="db-topbar">
          <button className="db-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="db-topbar-title">
            {NAV_ITEMS.find(n => n.id === activeTab)?.icon}{' '}
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </span>
        </div>

        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="db-section">
            <div className="dash-clock-bar">
              <div>
                <h1 className="db-page-title" style={{ margin:0 }}>
                  Good {time.getHours() < 12 ? 'morning' : time.getHours() < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋
                </h1>
                <p className="db-page-sub" style={{ margin:0 }}>Real-time overview of your farm operations.</p>
              </div>
              <div className="dash-clock-widget">
                <span className="dash-clock-time">{fmt(time)}</span>
                <span className="dash-clock-date">{fmtDate(time)}</span>
              </div>
            </div>

            <div className="db-stats-grid">
              {[
                { icon:'🌡️', label:'Soil Temperature', value:'24°C', color:'green' },
                { icon:'💧', label:'Soil Moisture', value:'67%', color:'blue' },
                { icon:'☀️', label:'UV Index', value:'6 (High)', color:'yellow' },
                { icon:'🌬️', label:'Wind Speed', value:'12 km/h', color:'purple' },
              ].map(s => (
                <div key={s.label} className={`db-stat-card db-stat-${s.color}`}>
                  <span className="db-stat-icon">{s.icon}</span>
                  <p className="db-stat-value">{s.value}</p>
                  <p className="db-stat-label">{s.label}</p>
                </div>
              ))}
            </div>

            {/* TREATMENTS PANEL */}
            <div className="dash-treatments-panel">
              <div className="dash-treatments-header">
                <div>
                  <span className="dash-treatments-title">💊 Crop Treatments &amp; Reminders</span>
                  <span className="dash-treatments-count">{activeTreatments.length} active</span>
                </div>
                <div className="dash-treatments-header-btns">
                  <button className="db-refresh-btn" onClick={refreshTreatments}>🔄 Refresh</button>
                  <button className="dash-treatments-reset" onClick={() => setTreatments(SEED_REMINDERS)}>Reset</button>
                </div>
              </div>

              {activeTreatments.length === 0 && (
                <div className="dash-treatments-empty">
                  <span>✅</span><p>All treatments complete. Add new ones from Crop Scanner or Topographical.</p>
                </div>
              )}

              <div className="dash-treatments-list">
                {activeTreatments.map(t => {
                  const s = URGENCY[t.urgency] || URGENCY.info
                  return (
                    <div key={t.id} className="dash-treat-item" style={{ background:s.bg, borderColor:s.border }}>
                      <div className="dash-treat-dot" style={{ background:s.dot }} />
                      <div className="dash-treat-body">
                        <p className="dash-treat-disease">{t.disease}</p>
                        <p className="dash-treat-action">{t.treatment}</p>
                        {t.dosage && <p className="dash-treat-dosage" style={{ color:s.color }}>📏 {t.dosage}</p>}
                      </div>
                      <div className="dash-treat-btns">
                        <button className="dash-treat-btn dash-treat-btn--done" onClick={() => markStatus(t.id,'done')} title="Done">✅</button>
                        <button className="dash-treat-btn dash-treat-btn--skip" onClick={() => markStatus(t.id,'skipped')} title="Skip">❌</button>
                        <button className="dash-treat-btn dash-treat-btn--del" onClick={() => removeTreatment(t.id)} title="Remove">🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {completedTreatments.length > 0 && (
                <details className="dash-completed-details">
                  <summary className="dash-completed-summary">📂 Completed / Skipped ({completedTreatments.length})</summary>
                  <div className="dash-completed-list">
                    {completedTreatments.map(t => (
                      <div key={t.id} className={`dash-completed-item dash-completed-item--${t.status}`}>
                        <span>{t.status === 'done' ? '✅' : '❌'}</span>
                        <div>
                          <p className="dash-completed-disease">{t.disease}</p>
                          <p className="dash-completed-action">{t.treatment}</p>
                        </div>
                        <button className="dash-completed-undo" onClick={() => markStatus(t.id,'pending')}>Undo</button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
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
                <div className="db-alert yellow">🌧️ Light rain expected — defer fertilisation</div>
                <div className="db-alert green">✅ Nitrogen levels optimal across all sectors</div>
                <div className="db-alert red">🔴 Sector C-4 moisture below threshold</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'topo' && <Suspense fallback={<MapLoading />}><TopographicalConditions onTreatmentSelected={handleTreatmentSelected} /></Suspense>}
        {activeTab === 'crop' && <CropScanner onTreatmentSelected={handleTreatmentSelected} />}
        {activeTab === 'security' && <CropSecurity />}
        {activeTab === 'training' && <FarmTraining />}

        {activeTab === 'government' && (
          <div className="db-section">
            <h1 className="db-page-title">🏛️ Government Supports</h1>
            <p className="db-page-sub">Active subsidies, schemes, and agricultural grants.</p>
            <div className="db-schemes-grid">
              {[
                { name:'PM-KISAN Yojana', desc:'Direct income support of ₹6,000/year.', status:'Active', badge:'green', amount:'₹6,000/yr' },
                { name:'Soil Health Card', desc:'Free soil testing and nutrient recommendations.', status:'Eligible', badge:'blue', amount:'Free' },
                { name:'PM Fasal Bima Yojana', desc:'Crop insurance covering natural disasters.', status:'Apply Now', badge:'yellow', amount:'₹800 Premium' },
                { name:'eNAM Online Market', desc:'Unified national agriculture market.', status:'Active', badge:'green', amount:'Free Access' },
                { name:'Kisan Credit Card', desc:'Short-term credit up to ₹3 lakh at 7%.', status:'Eligible', badge:'blue', amount:'Up to ₹3L' },
                { name:'Paramparagat Krishi', desc:'Support for conversion to organic farming.', status:'Apply Now', badge:'yellow', amount:'₹50,000 grant' },
              ].map(s => (
                <div key={s.name} className="db-scheme-card">
                  <div className="db-scheme-top"><h3 className="db-scheme-name">{s.name}</h3><span className={`db-badge ${s.badge}`}>{s.status}</span></div>
                  <p className="db-scheme-desc">{s.desc}</p>
                  <div className="db-scheme-footer"><span className="db-scheme-amount">{s.amount}</span><button className="db-scheme-btn">View Details →</button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'markets' && <Suspense fallback={<MapLoading />}><NearbyMarkets /></Suspense>}
        {activeTab === 'market-prices' && <MarketPrices />}

        {activeTab === 'history' && (
          <div className="db-section">
            <h1 className="db-page-title">📅 Crop History</h1>
            <p className="db-page-sub">Seasonal cultivation log and yield performance.</p>
            <div className="db-history-table-wrap">
              <table className="db-table">
                <thead><tr><th>Season</th><th>Crop</th><th>Area</th><th>Yield</th><th>Revenue</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    { season:'Rabi 2025–26', crop:'Wheat', area:'12', yield:'380', revenue:'₹80,750', ok:true },
                    { season:'Kharif 2025', crop:'Rice', area:'8', yield:'220', revenue:'₹68,200', ok:true },
                    { season:'Rabi 2024–25', crop:'Mustard', area:'5', yield:'90', revenue:'₹46,800', ok:true },
                    { season:'Kharif 2024', crop:'Cotton', area:'10', yield:'150', revenue:'₹97,500', ok:false },
                  ].map((r,i) => (
                    <tr key={i}><td>{r.season}</td><td><strong>{r.crop}</strong></td><td>{r.area}</td><td>{r.yield}</td><td className="db-revenue">{r.revenue}</td><td><span className={`db-badge ${r.ok?'green':'yellow'}`}>{r.ok?'Harvested':'Partial ⚠️'}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="db-section">
            <h1 className="db-page-title">⚙️ Settings</h1>
            <p className="db-page-sub">Manage your security profiles, data, and agricultural node controls.</p>

            <div className="db-card" style={{ maxWidth: '600px' }}>
              <h2 className="db-card-title">👤 Operator Profile</h2>
              <div className="db-info-row"><span>Operator Name</span><strong>{user.name}</strong></div>
              <div className="db-info-row"><span>Operator Email</span><strong>{user.email}</strong></div>
              <div className="db-info-row"><span>Helpline Node</span><strong>{user.phone}</strong></div>
              <div className="db-info-row"><span>Registered Date</span><span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'Active Session'}</span></div>
            </div>

            <div className="db-card" style={{ maxWidth: '600px', border: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                ⚠️ Danger Zone
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                Uprooting your operator profile is permanent. All leaf scans, custom treatments, and dashboard reminders will be wiped instantly from the databases.
              </p>
              <button 
                onClick={handleDeleteAccount}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.target.style.background = '#dc2626'}
                onMouseOut={(e) => e.target.style.background = '#ef4444'}
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* No bottom bar — collapsible sidebar handles all mobile navigation */}
    </div>
  )
}
