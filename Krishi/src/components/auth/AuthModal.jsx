import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, ArrowRight, Mail, Lock, User, Phone } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'


export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language, setUser } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab) // 'login' | 'register'

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // ── Register state ──
  const [regStep, setRegStep] = useState(1) // 1: details, 2: OTP verification
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)
  
  // Two genuine OTP codes required by the backend
  const [regEmailOtp, setRegEmailOtp] = useState('')
  const [regPhoneOtp, setRegPhoneOtp] = useState('')
  

  const [otpTimer, setOtpTimer] = useState(60)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  const modalRef = useRef(null)

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // OTP countdown timer
  useEffect(() => {
    let interval = null
    if (regStep === 2 && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(p => p - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [regStep, otpTimer])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Tab switch resets errors
  const switchTab = (t) => {
    setTab(t)
    setLoginError('')
    setRegError('')
    setRegStep(1)
  }

  // Helper to get/save mock users
  const getUsers = () => JSON.parse(localStorage.getItem('krishi_users') || '[]')
  const saveUser = (u) => {
    const users = getUsers()
    users.push(u)
    localStorage.setItem('krishi_users', JSON.stringify(users))
  }

  // ── Login submit (Mock Backend) ──
  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter your email and password.')
      return
    }
    
    setLoginLoading(true)
    setTimeout(() => {
      const users = getUsers()
      const found = users.find(u => u.email === loginEmail && u.password === loginPassword)
      
      if (found) {
        setUser({
          id: found.id,
          name: found.name,
          email: found.email,
          phone: found.phone,
          avatar: found.avatar || '👨‍🌾',
          createdAt: found.createdAt
        })
        onSuccess('dashboard')
      } else if (loginEmail === 'admin@krishi.ai' && loginPassword === 'password') {
        const adminUser = {
          id: 1,
          name: 'Farmer Admin',
          email: 'admin@krishi.ai',
          phone: '+91 99999 99999',
          avatar: '👨‍🌾',
          createdAt: new Date().toISOString()
        }
        setUser(adminUser)
        onSuccess('dashboard')
      } else {
        setLoginError('Invalid email or password. (Hint: Register or use admin@krishi.ai / password)')
      }
      setLoginLoading(false)
    }, 800)
  }

  // ── Register step 1: trigger simulated OTP codes ──
  const handleRegDetails = (e) => {
    e.preventDefault()
    setRegError('')
    
    if (!regName || !regEmail || !regPhone || !regPassword) {
      setRegError('Please fill in all fields.')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.')
      return
    }

    setRegLoading(true)
    setTimeout(() => {
      const users = getUsers()
      if (users.some(u => u.email === regEmail)) {
        setRegError('Email already registered.')
        setRegLoading(false)
        return
      }

      alert(`[Mock Backend] OTP sent!\nEmail OTP: 123456\nSMS OTP: 654321`)
      setOtpTimer(60)
      setRegStep(2)
      setRegLoading(false)
    }, 1000)
  }

  // ── Register step 2: verify simulated OTPs & create user ──
  const handleVerifyOtp = (e) => {
    e.preventDefault()
    setRegError('')
    
    if (!regEmailOtp || !regPhoneOtp) {
      setRegError('Please enter both verification codes.')
      return
    }

    setRegLoading(true)
    setTimeout(() => {
      if (regEmailOtp !== '123456' || regPhoneOtp !== '654321') {
        setRegError('Invalid verification codes. (Use Email OTP: 123456, SMS/Mobile OTP: 654321)')
        setRegLoading(false)
        return
      }

      const initials = regName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      const newUser = {
        id: Date.now(),
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        avatar: initials || '👨‍🌾',
        createdAt: new Date().toISOString()
      }
      saveUser(newUser)
      setUser({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      })
      onSuccess('dashboard')
      setRegLoading(false)
    }, 1200)
  }

  // Resend verification codes (Mock)
  const handleResendOtp = () => {
    setRegError('')
    setRegLoading(true)
    setTimeout(() => {
      alert(`[Mock Backend] Resent OTP!\nEmail OTP: 123456\nSMS OTP: 654321`)
      setOtpTimer(60)
      setRegError('New genuine verification codes dispatched!')
      setRegLoading(false)
    }, 800)
  }

  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal-box" ref={modalRef}>

        {/* Close button */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="auth-modal-logo">
          <div className="auth-logo-icon">K</div>
          <span className="auth-logo-text">Krishi<span className="auth-logo-accent"> AI</span></span>
        </div>

        {/* Tabs */}
        <div className="auth-tab-bar">
          <button
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            {t('login', 'Sign In')}
          </button>
          <button
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            {t('getStarted', 'Get Started')}
          </button>
        </div>

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <div className="auth-form-wrap">
            <p className="auth-form-subtitle">
              Welcome back! Sign in to your agritech operator dashboard.
            </p>

            {loginError && <div className="auth-error">{loginError}</div>}

            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <button type="button" className="auth-link-btn">Forgot password?</button>
                </div>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="login-password"
                    type={showLoginPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="auth-input"
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowLoginPw(p => !p)}
                  >
                    {showLoginPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="auth-submit-btn"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <span className="auth-loading-row">
                    <span className="auth-spinner" /> Authenticating…
                  </span>
                ) : (
                  <span className="auth-loading-row">
                    Sign In <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>

            <p className="auth-switch-text">
              No account?{' '}
              <button className="auth-switch-btn" onClick={() => switchTab('register')}>
                Create one →
              </button>
            </p>
          </div>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <div className="auth-form-wrap">

            {/* Step indicator */}
            <div className="auth-steps">
              <div className={`auth-step-dot ${regStep >= 1 ? 'done' : ''}`}>1</div>
              <div className="auth-step-line" />
              <div className={`auth-step-dot ${regStep >= 2 ? 'done' : ''}`}>2</div>
            </div>

            <p className="auth-form-subtitle">
              {regStep === 1
                ? 'Create your genuine Krishi AI operator account.'
                : `Enter the genuine OTPs sent to ${regEmail} and ${regPhone}`}
            </p>

            {regError && <div className="auth-error">{regError}</div>}

            {/* ── STEP 1: Details ── */}
            {regStep === 1 && (
              <form onSubmit={handleRegDetails} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="reg-name" className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Alex Mercer"
                      required
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-email" className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-phone" className="auth-label">Mobile Number</label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      id="reg-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      required
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-password" className="auth-label">Create Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="reg-password"
                      type={showRegPw ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      required
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowRegPw(p => !p)}
                    >
                      {showRegPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-reg-send-otp"
                  type="submit"
                  className="auth-submit-btn"
                  disabled={regLoading}
                >
                  {regLoading ? (
                    <span className="auth-loading-row">
                      <span className="auth-spinner" /> Dispatching OTPs…
                    </span>
                  ) : (
                    <span className="auth-loading-row">
                      Send Verification OTPs <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {regStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                

                <div className="auth-field">
                  <label htmlFor="email-otp-input" className="auth-label">Email Verification Code</label>
                  <input
                    id="email-otp-input"
                    type="text"
                    placeholder="6-digit Email code"
                    maxLength={6}
                    required
                    value={regEmailOtp}
                    onChange={e => setRegEmailOtp(e.target.value)}
                    className="auth-input auth-otp-input"
                    style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="phone-otp-input" className="auth-label">Mobile/SMS Verification Code</label>
                  <input
                    id="phone-otp-input"
                    type="text"
                    placeholder="6-digit Mobile code"
                    maxLength={6}
                    required
                    value={regPhoneOtp}
                    onChange={e => setRegPhoneOtp(e.target.value)}
                    className="auth-input auth-otp-input"
                    style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
                  />
                </div>

                <div className="auth-otp-footer">
                  <span className="auth-otp-timer">
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0 || regLoading}
                    className={`auth-link-btn ${otpTimer > 0 ? 'disabled' : ''}`}
                  >
                    Resend OTPs
                  </button>
                </div>

                <button
                  id="btn-verify-otp"
                  type="submit"
                  className="auth-submit-btn"
                  disabled={regLoading}
                >
                  {regLoading ? (
                    <span className="auth-loading-row">
                      <span className="auth-spinner" /> Verifying…
                    </span>
                  ) : (
                    <span className="auth-loading-row">
                      Verify & Create Account <ArrowRight size={15} />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => { setRegStep(1); setRegError('') }}
                  disabled={regLoading}
                >
                  ← Back to operator details
                </button>
              </form>
            )}

            <p className="auth-switch-text">
              Already have an account?{' '}
              <button className="auth-switch-btn" onClick={() => switchTab('login')}>
                Sign in →
              </button>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
