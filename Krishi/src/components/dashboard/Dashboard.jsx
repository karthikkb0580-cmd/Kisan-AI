import { useState, useEffect, lazy, Suspense } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { UsersAPI, AuthAPI } from '../../services/api'
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
  const { user, setUser, setView, theme } = useFarmvestStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [time, setTime] = useState(new Date())
  const [treatments, setTreatments] = useState(SEED_REMINDERS)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Settings states
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoSuccess, setPhotoSuccess] = useState('')

  const [secChannel, setSecChannel] = useState('email')
  const [secContact, setSecContact] = useState('')
  const [secOtpCode, setSecOtpCode] = useState('')
  const [secOtpSent, setSecOtpSent] = useState(false)
  const [secLoading, setSecLoading] = useState(false)
  const [secError, setSecError] = useState('')
  const [secSuccess, setSecSuccess] = useState('')

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

  // Helper to render user avatars
  const renderAvatar = (avatar, name) => {
    if (typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:'))) {
      return <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
    }
    return avatar || (name ? name.slice(0, 2).toUpperCase() : 'U')
  }

  // Handle secondary contact verification OTP send
  const handleSendVerifyOTP = async (e) => {
    e.preventDefault()
    setSecError('')
    setSecSuccess('')
    if (!secContact) { setSecError('Please enter contact info.'); return }
    setSecLoading(true)
    try {
      await UsersAPI.sendContactVerifyOTP(secChannel, secContact)
      setSecOtpSent(true)
      setSecSuccess(`Verification OTP sent successfully to ${secContact}. Check your inbox or Python terminal window.`)
    } catch (err) {
      setSecError(err.message || 'Failed to send OTP')
    } finally {
      setSecLoading(false)
    }
  }

  // Handle secondary contact verification OTP confirm
  const handleConfirmVerifyOTP = async (e) => {
    e.preventDefault()
    setSecError('')
    setSecSuccess('')
    if (!secOtpCode) { setSecError('Please enter the verification code.'); return }
    setSecLoading(true)
    try {
      await UsersAPI.confirmContactVerifyOTP(secChannel, secContact, secOtpCode)
      
      // Update profile locally by fetching fresh details
      const fresh = await AuthAPI.getMe()
      setUser({
        id:            fresh.id,
        name:          fresh.full_name,
        email:         fresh.email || '',
        phone:         fresh.phone || '',
        avatar:        fresh.profile_photo_url || fresh.full_name.slice(0, 2).toUpperCase(),
        emailVerified: fresh.email_verified,
        phoneVerified: fresh.phone_verified,
        createdAt:     fresh.created_at,
      })

      setSecSuccess('Secondary contact verified and linked successfully!')
      setSecContact('')
      setSecOtpCode('')
      setSecOtpSent(false)
    } catch (err) {
      setSecError(err.message || 'Invalid code')
    } finally {
      setSecLoading(false)
    }
  }

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setPhotoSuccess('')
    setPhotoLoading(true)
    try {
      const res = await UsersAPI.uploadPhoto(file)
      setUser({ ...user, avatar: res.profile_photo_url })
      setPhotoSuccess('Profile photo uploaded and updated successfully!')
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo')
    } finally {
      setPhotoLoading(false)
    }
  }

  return (
    <div className={`db-root ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="db-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="db-user-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
          <div className="db-avatar" style={{ width: '40px', height: '40px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderAvatar(user?.avatar, user?.name)}
          </div>
          <div className="db-user-info">
            <p className="db-user-name">{user?.name}</p>
            <p className="db-user-email" style={{ fontSize: '0.7rem' }}>{user?.email || user?.phone}</p>
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
                  Good {time.getHours() < 12 ? 'morning' : time.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Operator Details & Photo Card */}
              <div className="db-card">
                <h2 className="db-card-title">👤 Operator Profile</h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--accent)', background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderAvatar(user?.avatar, user?.name)}
                  </div>
                  <div>
                    <label style={{ display: 'inline-block', background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', fontSize: '0.72rem', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}>
                      📷 {photoLoading ? 'Uploading…' : 'Upload New Photo'}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={photoLoading} />
                    </label>
                    {photoError && <p style={{ color: '#ef4444', fontSize: '0.68rem', margin: '0.2rem 0 0' }}>{photoError}</p>}
                    {photoSuccess && <p style={{ color: '#22c55e', fontSize: '0.68rem', margin: '0.2rem 0 0' }}>{photoSuccess}</p>}
                  </div>
                </div>

                <div className="db-info-row"><span>Operator Name</span><strong>{user?.name}</strong></div>
                <div className="db-info-row">
                  <span>Operator Email</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong>{user?.email || 'Not Linked'}</strong>
                    {user?.emailVerified ? <span style={{ color: '#22c55e', fontSize: '0.68rem' }}>🟢 Verified</span> : user?.email ? <span style={{ color: '#ef4444', fontSize: '0.68rem' }}>🔴 Unverified</span> : null}
                  </div>
                </div>
                <div className="db-info-row">
                  <span>Helpline Node</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong>{user?.phone || 'Not Linked'}</strong>
                    {user?.phoneVerified ? <span style={{ color: '#22c55e', fontSize: '0.68rem' }}>🟢 Verified</span> : user?.phone ? <span style={{ color: '#ef4444', fontSize: '0.68rem' }}>🔴 Unverified</span> : null}
                  </div>
                </div>
                <div className="db-info-row"><span>Registered Date</span><span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'Active Session'}</span></div>
              </div>

              {/* Secure OTP-Verified Contact Card */}
              <div className="db-card" style={{ border: '2.5px solid var(--accent)', boxShadow: '4px 4px 0px 0px var(--accent)' }}>
                <h2 className="db-card-title" style={{ color: 'var(--accent)' }}>🔑 Verify Secondary Contact</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  Add or update secondary email or phone nodes with a secure OTP check to receive automated crop disease alert callbacks.
                </p>

                {secError && <div className="db-alert red" style={{ marginBottom: '0.75rem', fontSize: '0.72rem' }}>⚠️ {secError}</div>}
                {secSuccess && <div className="db-alert green" style={{ marginBottom: '0.75rem', fontSize: '0.72rem' }}>🟢 {secSuccess}</div>}

                <form onSubmit={secOtpSent ? handleConfirmVerifyOTP : handleSendVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!secOtpSent ? (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text2)' }}>Verification Channel</label>
                        <select 
                          value={secChannel} 
                          onChange={(e) => setSecChannel(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          <option value="email">📧 Email Node</option>
                          <option value="sms">📱 Mobile Node (E.164: +91…)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text2)' }}>Contact Address / Phone</label>
                        <input 
                          type={secChannel === 'email' ? 'email' : 'tel'} 
                          placeholder={secChannel === 'email' ? 'helper@domain.com' : '+919876543210'} 
                          required 
                          value={secContact}
                          onChange={(e) => setSecContact(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.75rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text2)' }}>6-Digit Verification Code</label>
                      <input 
                        type="text" 
                        placeholder="123456" 
                        maxLength={6} 
                        required 
                        value={secOtpCode}
                        onChange={(e) => setSecOtpCode(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', letterSpacing: '4px', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={secLoading} 
                    className="scanner-btn" 
                    style={{ background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', padding: '0.6rem', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {secLoading ? 'Processing…' : secOtpSent ? 'Verify & Link Contact' : 'Send Verification OTP'}
                  </button>

                  {secOtpSent && (
                    <button 
                      type="button" 
                      onClick={() => setSecOtpSent(false)} 
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px' }}
                    >
                      ← Change Contact Info
                    </button>
                  )}
                </form>
              </div>
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
