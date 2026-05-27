import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, ArrowRight, ShieldCheck, Mail, Lock, User } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab) // 'login' | 'register'

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // ── Register state ──
  const [regStep, setRegStep] = useState(1) // 1: details, 2: OTP
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)
  const [regOtp, setRegOtp] = useState('')
  const [simOtp, setSimOtp] = useState('')
  const [otpTimer, setOtpTimer] = useState(60)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  const modalRef = useRef(null)

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // OTP countdown
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

  // ── Login submit ──
  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter your email and password.')
      return
    }
    setLoginLoading(true)
    setTimeout(() => {
      setLoginLoading(false)
      onSuccess('dashboard')
    }, 1800)
  }

  // ── Register step 1: send OTP ──
  const handleRegDetails = (e) => {
    e.preventDefault()
    setRegError('')
    if (!regName || !regEmail || !regPassword) {
      setRegError('Please fill in all fields.')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.')
      return
    }
    setRegLoading(true)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setSimOtp(code)
    setOtpTimer(60)
    setTimeout(() => {
      setRegLoading(false)
      setRegStep(2)
    }, 1400)
  }

  // ── Register step 2: verify OTP ──
  const handleVerifyOtp = (e) => {
    e.preventDefault()
    setRegError('')
    if (regOtp.trim() !== simOtp) {
      setRegError('Incorrect OTP. Please check the code shown below.')
      return
    }
    setRegLoading(true)
    setTimeout(() => {
      setRegLoading(false)
      onSuccess('dashboard')
    }, 1600)
  }

  const handleResendOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setSimOtp(code)
    setOtpTimer(60)
    setRegError('')
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
              Welcome back! Sign in to your agritech dashboard.
            </p>

            {/* Demo hint */}
            <div className="auth-hint-box">
              <ShieldCheck size={14} className="auth-hint-icon" />
              <span>Demo: <strong>demo@gmail.com</strong> / <strong>123456</strong></span>
            </div>

            {loginError && <div className="auth-error">{loginError}</div>}

            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">Email</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="demo@gmail.com"
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
                    placeholder="123456"
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
                    <span className="auth-spinner" /> Syncing node…
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
                ? 'Create your Krishi AI operator account.'
                : `Enter the 6-digit code sent to ${regEmail}`}
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
                  <label htmlFor="reg-email" className="auth-label">Email</label>
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
                  <label htmlFor="reg-password" className="auth-label">Password</label>
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
                      <span className="auth-spinner" /> Sending OTP…
                    </span>
                  ) : (
                    <span className="auth-loading-row">
                      Send OTP <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {regStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                {/* Simulated OTP display */}
                <div className="auth-otp-display">
                  <span className="auth-otp-label">
                    <span className="auth-otp-pulse" /> Sat-Link OTP
                  </span>
                  <span className="auth-otp-code">{simOtp}</span>
                  <span className="auth-otp-hint">
                    (This is your simulated verification code — copy it above)
                  </span>
                </div>

                <div className="auth-field">
                  <label htmlFor="otp-input" className="auth-label">Enter OTP</label>
                  <input
                    id="otp-input"
                    type="text"
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                    value={regOtp}
                    onChange={e => setRegOtp(e.target.value)}
                    className="auth-input auth-otp-input"
                  />
                </div>

                <div className="auth-otp-footer">
                  <span className="auth-otp-timer">
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0}
                    className={`auth-link-btn ${otpTimer > 0 ? 'disabled' : ''}`}
                  >
                    Resend OTP
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
                      Verify & Continue <ArrowRight size={15} />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => { setRegStep(1); setRegError('') }}
                >
                  ← Back to details
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
