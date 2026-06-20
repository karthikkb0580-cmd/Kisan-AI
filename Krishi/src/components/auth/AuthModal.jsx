import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, ArrowRight, Mail, Lock, User, Shield } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import { AuthAPI, TokenStore } from '../../services/api'

export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language, setUser } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab)

  // ── Login state ──────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw]     = useState(false)
  const [loginLoading, setLoginLoading]   = useState(false)
  const [loginError, setLoginError]       = useState('')

  // ── Register state ───────────────────────────────────────────────────────
  const [regStep, setRegStep]         = useState(1) // 1: details  2: verify
  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')

  const [regPassword, setRegPassword] = useState('')
  const [showRegPw, setShowRegPw]     = useState(false)
  const [totpCode, setTotpCode]       = useState('')
  const [totpData, setTotpData]       = useState(null)
  const [regLoading, setRegLoading]   = useState(false)
  const [regError, setRegError]       = useState('')

  // ── Forgot password state ─────────────────────────────────────────────
  const [showForgot, setShowForgot]         = useState(false)
  const [forgotContact, setForgotContact]   = useState('')
  const [forgotCode, setForgotCode]         = useState('')
  const [forgotNewPw, setForgotNewPw]       = useState('')
  const [forgotStep, setForgotStep]         = useState(1)
  const [forgotLoading, setForgotLoading]   = useState(false)
  const [forgotError, setForgotError]       = useState('')
  const [forgotSuccess, setForgotSuccess]   = useState('')

  const modalRef = useRef(null)

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // ── Keyboard / scroll locks ──────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const switchTab = (t) => {
    setTab(t); setLoginError(''); setRegError('')
    setRegStep(1); setShowForgot(false)
    setTotpData(null); setTotpCode('')
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const storeUser = (profile) => {
    setUser({
      id:            profile.id,
      name:          profile.full_name,
      email:         profile.email || '',
      phone:         profile.phone || '',
      avatar:        profile.profile_photo_url || profile.full_name.slice(0, 2).toUpperCase(),
      emailVerified: profile.email_verified,
      phoneVerified: profile.phone_verified,
      createdAt:     profile.created_at,
    })
  }

  const afterLogin = async (tokens) => {
    TokenStore.set(tokens.access_token, tokens.refresh_token)
    const profile = await AuthAPI.getMe()
    storeUser(profile)
    onSuccess('dashboard')
  }

  // ── PASSWORD LOGIN ───────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail || !loginPassword) { setLoginError('Please enter email and password.'); return }
    setLoginLoading(true)
    try {
      const tokens = await AuthAPI.loginPassword(loginEmail, loginPassword)
      await afterLogin(tokens)
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  // ── REGISTER step 1: submit details → backend sends email OTP ────────────
  const handleRegDetails = async (e) => {
    e.preventDefault()
    setRegError('')
    if (!regName || !regEmail || !regPassword) {
      setRegError('Please fill in all fields (including password).'); return
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters long.'); return
    }
    setRegLoading(true)
    try {
      const data = await AuthAPI.register(regName, regEmail, undefined, regPassword)
      // data: { contact, channel, method, detail }
      setTotpData(data)
      setRegStep(2)
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  // ── REGISTER step 2: verify email OTP code → create account ──────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setRegError('')
    if (!totpCode || totpCode.length !== 6) {
      setRegError('Please enter the 6-digit verification code.'); return
    }
    setRegLoading(true)
    try {
      const tokens = await AuthAPI.verifyOTP('email', totpData.contact, totpCode, 'registration')
      await afterLogin(tokens)
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
  const handleForgotRequest = async (e) => {
    e.preventDefault()
    setForgotError(''); setForgotSuccess('')
    if (!forgotContact) { setForgotError('Enter your email address.'); return }
    setForgotLoading(true)
    try {
      await AuthAPI.requestReset('email', forgotContact)
      setForgotStep(2)
      setForgotSuccess('OTP sent to your email.')
    } catch (err) {
      setForgotError(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotConfirm = async (e) => {
    e.preventDefault()
    setForgotError(''); setForgotSuccess('')
    if (!forgotCode || !forgotNewPw) { setForgotError('Fill in all fields.'); return }
    setForgotLoading(true)
    try {
      await AuthAPI.confirmReset('email', forgotContact, forgotCode, forgotNewPw)
      setForgotSuccess('Password reset! Please sign in.')
      setTimeout(() => { setShowForgot(false); setForgotStep(1) }, 2000)
    } catch (err) {
      setForgotError(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal-box" ref={modalRef}>

        {/* Close */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        {/* Logo */}
        <div className="auth-modal-logo">
          <div className="auth-logo-icon">K</div>
          <span className="auth-logo-text">Krishi<span className="auth-logo-accent"> AI</span></span>
        </div>

        {/* Tabs */}
        <div className="auth-tab-bar">
          <button className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
            {t('login', 'Sign In')}
          </button>
          <button className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>
            {t('getStarted', 'Get Started')}
          </button>
        </div>

        {/* ══ FORGOT PASSWORD ══════════════════════════════════════════════ */}
        {showForgot && (
          <div className="auth-form-wrap">
            <p className="auth-form-subtitle">Reset your password via email OTP.</p>
            {forgotError   && <div className="auth-error">{forgotError}</div>}
            {forgotSuccess && <div className="auth-success">{forgotSuccess}</div>}

            {forgotStep === 1 && (
              <form onSubmit={handleForgotRequest} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input type="email" placeholder="you@example.com" required value={forgotContact}
                      onChange={e => setForgotContact(e.target.value)} className="auth-input" />
                  </div>
                </div>
                <button type="submit" className="auth-submit-btn" disabled={forgotLoading}>
                  {forgotLoading ? <span className="auth-loading-row"><span className="auth-spinner" /> Sending…</span>
                    : <span className="auth-loading-row">Send Reset OTP <ArrowRight size={15} /></span>}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleForgotConfirm} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">OTP Code</label>
                  <input type="text" placeholder="6-digit code" maxLength={6} required value={forgotCode}
                    onChange={e => setForgotCode(e.target.value)}
                    className="auth-input auth-otp-input"
                    style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} />
                </div>
                <div className="auth-field">
                  <label className="auth-label">New Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input type="password" placeholder="Min 8 chars" required value={forgotNewPw}
                      onChange={e => setForgotNewPw(e.target.value)} className="auth-input" />
                  </div>
                </div>
                <button type="submit" className="auth-submit-btn" disabled={forgotLoading}>
                  {forgotLoading ? <span className="auth-loading-row"><span className="auth-spinner" /> Resetting…</span>
                    : <span className="auth-loading-row">Reset Password <ArrowRight size={15} /></span>}
                </button>
              </form>
            )}

            <button className="auth-back-btn" onClick={() => setShowForgot(false)}>← Back to Sign In</button>
          </div>
        )}

        {/* ══ LOGIN ══════════════════════════════════════════════════════════ */}
        {!showForgot && tab === 'login' && (
          <div className="auth-form-wrap">
            {loginError && <div className="auth-error">{loginError}</div>}

            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input id="login-email" type="email" placeholder="you@example.com" required
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="auth-input" />
                </div>
              </div>
              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <button type="button" className="auth-link-btn"
                    onClick={() => setShowForgot(true)}>Forgot password?</button>
                </div>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="login-password" type={showLoginPw ? 'text' : 'password'}
                    placeholder="••••••••" required value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)} className="auth-input" />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowLoginPw(p => !p)}>
                    {showLoginPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button id="btn-login-submit" type="submit" className="auth-submit-btn" disabled={loginLoading}>
                {loginLoading
                  ? <span className="auth-loading-row"><span className="auth-spinner" /> Authenticating…</span>
                  : <span className="auth-loading-row">Sign In <ArrowRight size={15} /></span>}
              </button>
            </form>

            <p className="auth-switch-text">
              No account?{' '}
              <button className="auth-switch-btn" onClick={() => switchTab('register')}>Create one →</button>
            </p>
          </div>
        )}

        {/* ══ REGISTER ═══════════════════════════════════════════════════════ */}
        {!showForgot && tab === 'register' && (
          <div className="auth-form-wrap">
            {/* Step indicator */}
            <div className="auth-steps">
              <div className={`auth-step-dot ${regStep >= 1 ? 'done' : ''}`}>1</div>
              <div className="auth-step-line" />
              <div className={`auth-step-dot ${regStep >= 2 ? 'done' : ''}`}>2</div>
            </div>

            <p className="auth-form-subtitle">
              {regStep === 1 && 'Create your Krishi AI account.'}
              {regStep === 2 && 'Enter the 6-digit code sent to your email.'}
            </p>

            {regError && <div className="auth-error">{regError}</div>}

            {/* ── Step 1: Details ── */}
            {regStep === 1 && (
              <form onSubmit={handleRegDetails} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="reg-name" className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input id="reg-name" type="text" placeholder="Ramesh Kumar" required
                      value={regName} onChange={e => setRegName(e.target.value)} className="auth-input" />
                  </div>
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-email" className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input id="reg-email" type="email" placeholder="you@example.com" required
                      value={regEmail} onChange={e => setRegEmail(e.target.value)} className="auth-input" />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-password" className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input id="reg-password" type={showRegPw ? 'text' : 'password'} placeholder="Min 8 characters" required
                      value={regPassword} onChange={e => setRegPassword(e.target.value)} className="auth-input" />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowRegPw(p => !p)}>
                      {showRegPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button id="btn-reg-send-otp" type="submit" className="auth-submit-btn" disabled={regLoading}>
                  {regLoading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Sending OTP…</span>
                    : <span className="auth-loading-row">Send Verification OTP <ArrowRight size={15} /></span>}
                </button>
              </form>
            )}

            {/* ── Step 2: Enter OTP code ── */}
            {regStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="auth-totp-hint">
                  <Shield size={28} className="auth-totp-hint-icon" />
                  <p>Open your email inbox and enter the <strong>6-digit verification code</strong> for <em>Krishi AI</em>.</p>
                </div>

                <div className="auth-field">
                  <label htmlFor="otp-code-input" className="auth-label">Verification Code</label>
                  <input
                    id="otp-code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="auth-input auth-otp-input"
                    style={{ textAlign: 'center', letterSpacing: '8px', fontWeight: 'bold', fontSize: '1.5rem' }}
                    autoFocus
                  />
                </div>

                <button id="btn-verify-otp" type="submit" className="auth-submit-btn" disabled={regLoading}>
                  {regLoading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Verifying…</span>
                    : <span className="auth-loading-row">Verify & Create Account <ArrowRight size={15} /></span>}
                </button>

                <button type="button" className="auth-back-btn"
                  onClick={() => { setRegStep(1); setRegError('') }} disabled={regLoading}>
                  ← Back to details
                </button>
              </form>
            )}

            <p className="auth-switch-text">
              Already have an account?{' '}
              <button className="auth-switch-btn" onClick={() => switchTab('login')}>Sign in →</button>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
