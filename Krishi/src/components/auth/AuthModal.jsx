import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, ArrowRight, Mail, Lock, User, Phone, RefreshCw } from 'lucide-react'
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

  // OTP-login sub-mode
  const [loginMode, setLoginMode]         = useState('password') // 'password' | 'otp'
  const [otpLoginPhone, setOtpLoginPhone] = useState('')
  const [otpLoginCode, setOtpLoginCode]   = useState('')
  const [otpLoginSent, setOtpLoginSent]   = useState(false)

  // ── Register state ───────────────────────────────────────────────────────
  const [regStep, setRegStep]         = useState(1) // 1: details  2: OTP verify
  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPhone, setRegPhone]       = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPw, setShowRegPw]     = useState(false)
  const [regEmailOtp, setRegEmailOtp] = useState('')
  const [regPhoneOtp, setRegPhoneOtp] = useState('')
  const [otpTimer, setOtpTimer]       = useState(60)
  const [regLoading, setRegLoading]   = useState(false)
  const [regError, setRegError]       = useState('')

  // ── Forgot password state ─────────────────────────────────────────────
  const [showForgot, setShowForgot]         = useState(false)
  const [forgotContact, setForgotContact]   = useState('')
  const [forgotCode, setForgotCode]         = useState('')
  const [forgotNewPw, setForgotNewPw]       = useState('')
  const [forgotStep, setForgotStep]         = useState(1) // 1: request  2: confirm
  const [forgotLoading, setForgotLoading]   = useState(false)
  const [forgotError, setForgotError]       = useState('')
  const [forgotSuccess, setForgotSuccess]   = useState('')

  const modalRef = useRef(null)

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // ── OTP countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    let iv = null
    if (regStep === 2 && otpTimer > 0) iv = setInterval(() => setOtpTimer(p => p - 1), 1000)
    return () => clearInterval(iv)
  }, [regStep, otpTimer])

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

  // ── OTP LOGIN: send ──────────────────────────────────────────────────────
  const handleSendLoginOTP = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!otpLoginPhone) { setLoginError('Please enter your phone number.'); return }
    setLoginLoading(true)
    try {
      await AuthAPI.sendOTP('sms', otpLoginPhone, 'login')
      setOtpLoginSent(true)
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  // ── OTP LOGIN: verify ────────────────────────────────────────────────────
  const handleLoginOTP = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!otpLoginCode) { setLoginError('Enter the 6-digit code.'); return }
    setLoginLoading(true)
    try {
      const tokens = await AuthAPI.loginOTP('sms', otpLoginPhone, otpLoginCode)
      await afterLogin(tokens)
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  // ── REGISTER step 1: submit details → backend sends OTPs ────────────────
  const handleRegDetails = async (e) => {
    e.preventDefault()
    setRegError('')
    if (!regName || !regEmail || !regPhone) {
      setRegError('Please fill in all fields.'); return
    }
    setRegLoading(true)
    try {
      await AuthAPI.register(regName, regEmail, regPhone)
      setOtpTimer(60)
      setRegStep(2)
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  // ── REGISTER step 2: verify email OTP → login ────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setRegError('')
    if (!regEmailOtp) { setRegError('Please enter the email verification code.'); return }
    setRegLoading(true)
    try {
      // Verify the email OTP (registration purpose)
      const tokens = await AuthAPI.verifyOTP('email', regEmail, regEmailOtp, 'registration')
      await afterLogin(tokens)
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  // ── RESEND OTPs ──────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setRegError('')
    setRegLoading(true)
    try {
      await AuthAPI.sendOTP('email', regEmail, 'registration')
      if (regPhone) await AuthAPI.sendOTP('sms', regPhone, 'registration')
      setOtpTimer(60)
      setRegError('') // clear any prev
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
            {/* Mode toggle */}
            <div className="auth-mode-toggle">
              <button className={`auth-mode-btn ${loginMode === 'password' ? 'active' : ''}`}
                onClick={() => setLoginMode('password')}>Password</button>
              <button className={`auth-mode-btn ${loginMode === 'otp' ? 'active' : ''}`}
                onClick={() => { setLoginMode('otp'); setLoginError('') }}>OTP Login</button>
            </div>

            {loginError && <div className="auth-error">{loginError}</div>}

            {/* ── Password login ── */}
            {loginMode === 'password' && (
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
            )}

            {/* ── OTP login ── */}
            {loginMode === 'otp' && (
              <form onSubmit={otpLoginSent ? handleLoginOTP : handleSendLoginOTP} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Mobile Number</label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input type="tel" placeholder="+919876543210" required value={otpLoginPhone}
                      onChange={e => setOtpLoginPhone(e.target.value)} className="auth-input"
                      disabled={otpLoginSent} />
                  </div>
                </div>
                {otpLoginSent && (
                  <div className="auth-field">
                    <label className="auth-label">SMS OTP Code</label>
                    <input type="text" placeholder="6-digit code" maxLength={6} required
                      value={otpLoginCode} onChange={e => setOtpLoginCode(e.target.value)}
                      className="auth-input auth-otp-input"
                      style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} />
                  </div>
                )}
                <button type="submit" className="auth-submit-btn" disabled={loginLoading}>
                  {loginLoading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> {otpLoginSent ? 'Verifying…' : 'Sending OTP…'}</span>
                    : <span className="auth-loading-row">{otpLoginSent ? 'Verify & Sign In' : 'Send OTP'} <ArrowRight size={15} /></span>}
                </button>
                {otpLoginSent && (
                  <button type="button" className="auth-back-btn"
                    onClick={() => { setOtpLoginSent(false); setOtpLoginCode('') }}>
                    ← Change Number
                  </button>
                )}
              </form>
            )}

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
              {regStep === 1
                ? 'Create your Krishi AI account.'
                : `Enter the verification code sent to ${regEmail}`}
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
                  <label htmlFor="reg-phone" className="auth-label">Mobile Number <span style={{fontSize:'11px',color:'#86efac'}}>(E.164: +91…)</span></label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input id="reg-phone" type="tel" placeholder="+919876543210" required
                      value={regPhone} onChange={e => setRegPhone(e.target.value)} className="auth-input" />
                  </div>
                </div>

                <button id="btn-reg-send-otp" type="submit" className="auth-submit-btn" disabled={regLoading}>
                  {regLoading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Creating account…</span>
                    : <span className="auth-loading-row">Send Verification OTP <ArrowRight size={15} /></span>}
                </button>
              </form>
            )}

            {/* ── Step 2: OTP ── */}
            {regStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="email-otp-input" className="auth-label">Email Verification Code</label>
                  <input id="email-otp-input" type="text" placeholder="6-digit code" maxLength={6} required
                    value={regEmailOtp} onChange={e => setRegEmailOtp(e.target.value)}
                    className="auth-input auth-otp-input"
                    style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} />
                </div>

                <div className="auth-otp-footer">
                  <span className="auth-otp-timer">{otpTimer > 0 ? `Resend in ${otpTimer}s` : ''}</span>
                  <button type="button" onClick={handleResendOtp}
                    disabled={otpTimer > 0 || regLoading}
                    className={`auth-link-btn ${otpTimer > 0 ? 'disabled' : ''}`}>
                    <RefreshCw size={12} style={{ marginRight: 4 }} /> Resend OTP
                  </button>
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
