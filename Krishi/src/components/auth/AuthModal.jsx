import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ArrowRight, User, Mail, Lock, Eye, EyeOff, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import { AuthAPI, TokenStore } from '../../services/api'

// ── OTP digit-box sub-component ───────────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...value]
      if (next[i]) {
        next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        refs[i - 1].current?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft' && i > 0) { refs[i - 1].current?.focus(); return }
    if (e.key === 'ArrowRight' && i < 5) { refs[i + 1].current?.focus(); return }
  }

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    if (!char) return
    const next = [...value.padEnd(6, ' ').split('').slice(0, 6)]
    next[i] = char
    onChange(next.join('').replace(/ /g, ''))
    if (i < 5) refs[i + 1].current?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    refs[focusIdx].current?.focus()
  }

  return (
    <div className="otp-boxes" onPaste={handlePaste}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`otp-box${value[i] ? ' otp-box--filled' : ''}`}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          autoFocus={i === 0}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language, setUser } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab)

  // Registration steps: 'form' | 'otp' | 'done'
  const [regStep, setRegStep] = useState('form')

  // Form fields
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp]           = useState('')

  // UI state
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  // Resend countdown (seconds)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // Keyboard escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [countdown])

  const startCountdown = () => setCountdown(60)

  const switchTab = (newTab) => {
    setTab(newTab)
    setRegStep('form')
    setError(''); setSuccess('')
    setName(''); setEmail(''); setPassword('')
    setShowPass(false); setOtp('')
    setCountdown(0)
  }

  const applyUser = (profile) => {
    setUser({
      id:            profile.id,
      name:          profile.full_name,
      email:         profile.email || '',
      phone:         profile.phone || '',
      avatar:        profile.full_name?.slice(0, 2).toUpperCase() || '??',
      emailVerified: profile.email_verified,
      phoneVerified: profile.phone_verified,
      createdAt:     profile.created_at,
    })
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!password)     { setError('Please enter your password.'); return }

    setLoading(true)
    try {
      const data = await AuthAPI.loginPassword(email.trim(), password)
      TokenStore.set(data.access_token, data.refresh_token)
      applyUser(data.user || await AuthAPI.getMe())
      onSuccess('dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  // ── REGISTER STEP 1 — send OTP ────────────────────────────────────────────
  const handleRegisterSend = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!name.trim())              { setError('Please enter your full name.'); return }
    if (!email.trim())             { setError('Please enter your email address.'); return }
    if (!password)                 { setError('Please enter a password.'); return }
    if (password.length < 6)       { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      await AuthAPI.registerSendOTP(name.trim(), email.trim(), password)
      setRegStep('otp')
      setOtp('')
      startCountdown()
      setSuccess('')
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── REGISTER STEP 2 — verify OTP ─────────────────────────────────────────
  const handleRegisterVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.length < 6) { setError('Please enter the complete 6-digit code.'); return }

    setLoading(true)
    try {
      const data = await AuthAPI.registerConfirmOTP(email.trim(), otp)
      TokenStore.set(data.access_token, data.refresh_token)
      applyUser(data.user || await AuthAPI.getMe())
      setRegStep('done')
      setTimeout(() => onSuccess('dashboard'), 1400)
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── RESEND OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || loading) return
    setError(''); setSuccess('')
    setLoading(true)
    try {
      await AuthAPI.registerSendOTP(name.trim(), email.trim(), password)
      setOtp('')
      startCountdown()
      setSuccess('A new code has been sent to your email.')
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  // ── Auto-submit when all 6 digits filled ─────────────────────────────────
  useEffect(() => {
    if (regStep === 'otp' && otp.length === 6 && !loading) {
      handleRegisterVerify({ preventDefault: () => {} })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal-box">

        {/* Close */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="auth-modal-logo">
          <div className="auth-logo-icon">K</div>
          <span className="auth-logo-text">Krishi<span className="auth-logo-accent"> AI</span></span>
        </div>

        {/* Tabs — hidden during OTP / done steps */}
        {regStep === 'form' && (
          <div className="auth-tab-bar">
            <button className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
              {t('login', 'Sign In')}
            </button>
            <button className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>
              {t('getStarted', 'Get Started')}
            </button>
          </div>
        )}

        <div className="auth-form-wrap">

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <>
              <p className="auth-form-subtitle">Welcome back! Sign in to your account.</p>
              {error   && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <form onSubmit={handleLogin} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="login-email" className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="login-password"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button id="btn-login-submit" type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Signing in…</span>
                    : <span className="auth-loading-row">Sign In <ArrowRight size={15} /></span>}
                </button>
              </form>

              <p className="auth-switch-text">
                No account?{' '}
                <button className="auth-switch-btn" onClick={() => switchTab('register')}>Create one →</button>
              </p>
            </>
          )}

          {/* ── REGISTER — STEP 1: form ── */}
          {tab === 'register' && regStep === 'form' && (
            <>
              <p className="auth-form-subtitle">Create your Krishi AI account. We'll verify your email with an OTP.</p>
              {error   && <div className="auth-error">{error}</div>}

              <form onSubmit={handleRegisterSend} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="reg-name" className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Ramesh Kumar"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="auth-input"
                      autoFocus
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
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
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
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button id="btn-register-submit" type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Sending OTP…</span>
                    : <span className="auth-loading-row">Send Verification Code <ArrowRight size={15} /></span>}
                </button>
              </form>

              <p className="auth-switch-text">
                Already have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchTab('login')}>Sign in →</button>
              </p>
            </>
          )}

          {/* ── REGISTER — STEP 2: OTP verification ── */}
          {tab === 'register' && regStep === 'otp' && (
            <div className="otp-step">
              <div className="otp-step-icon">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <h3 className="otp-step-title">Check your inbox</h3>
              <p className="otp-step-sub">
                We sent a 6-digit code to<br />
                <strong>{email}</strong>
              </p>

              {error   && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <form onSubmit={handleRegisterVerify} className="auth-form" noValidate>
                <OTPInput value={otp} onChange={setOtp} />

                <button id="btn-otp-verify" type="submit" className="auth-submit-btn" disabled={loading || otp.length < 6}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Verifying…</span>
                    : <span className="auth-loading-row">Verify &amp; Create Account <ShieldCheck size={15} /></span>}
                </button>
              </form>

              <div className="otp-resend-row">
                <button
                  className={`otp-resend-btn${countdown > 0 ? ' otp-resend-btn--wait' : ''}`}
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                >
                  <RefreshCw size={13} />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
                <button className="auth-switch-btn" onClick={() => { setRegStep('form'); setError(''); setOtp('') }}>
                  ← Change details
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTER — STEP 3: success ── */}
          {tab === 'register' && regStep === 'done' && (
            <div className="otp-step otp-step--done">
              <div className="otp-step-icon otp-step-icon--green">
                <CheckCircle2 size={40} strokeWidth={1.5} />
              </div>
              <h3 className="otp-step-title">Account created!</h3>
              <p className="otp-step-sub">Welcome to Krishi AI, <strong>{name}</strong>. Redirecting you…</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
