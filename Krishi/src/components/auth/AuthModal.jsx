import { useState, useEffect } from 'react'
import { X, ArrowRight, User, Mail, ShieldCheck, RefreshCw } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import { AuthAPI, TokenStore } from '../../services/api'

export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language, setUser } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab)

  // Step 1 — collect email (and name for registration)
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')

  // Step 2 — OTP entry
  const [otpSent, setOtpSent]   = useState(false)
  const [code, setCode]         = useState('')
  const [countdown, setCountdown] = useState(0)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

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

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const switchTab = (newTab) => {
    setTab(newTab)
    setError('')
    setSuccess('')
    setName('')
    setEmail('')
    setCode('')
    setOtpSent(false)
    setCountdown(0)
  }

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (tab === 'register' && !name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const purpose = tab === 'register' ? 'registration' : 'login'
      await AuthAPI.sendOTP({ email: email.trim(), purpose, full_name: name.trim() || undefined })

      setOtpSent(true)
      setCountdown(60)
      setSuccess(`A 6-digit code has been sent to ${email.trim()}.`)
    } catch (err) {
      const msg = err?.detail || err?.message || 'Failed to send verification code. Please try again.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1b: Resend OTP ───────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const purpose = tab === 'register' ? 'registration' : 'login'
      await AuthAPI.sendOTP({ email: email.trim(), purpose, full_name: name.trim() || undefined })
      setCountdown(60)
      setSuccess('A new code has been sent to your inbox.')
    } catch (err) {
      const msg = err?.detail || err?.message || 'Resend failed. Try again.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')

    if (!code.trim() || code.trim().length !== 6) {
      setError('Please enter the 6-digit code.')
      return
    }

    setLoading(true)
    try {
      const purpose = tab === 'register' ? 'registration' : 'login'
      const data = await AuthAPI.verifyOTP({
        email:     email.trim(),
        code:      code.trim(),
        purpose,
        full_name: name.trim() || undefined,
      })

      TokenStore.set(data.access_token, data.refresh_token)

      setUser({
        id:            data.user.id,
        name:          data.user.full_name,
        email:         data.user.email || '',
        phone:         data.user.phone || '',
        avatar:        data.user.full_name?.slice(0, 2).toUpperCase() || '??',
        emailVerified: data.user.email_verified,
        phoneVerified: data.user.phone_verified,
        createdAt:     data.user.created_at,
      })

      if (onSuccess) onSuccess('dashboard')
    } catch (err) {
      const msg = err?.detail || err?.message || 'Invalid or expired code. Please try again.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

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

        {/* Tabs — hidden once OTP is sent */}
        {!otpSent && (
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
          {/* ── Step 1: Enter email ── */}
          {!otpSent ? (
            <>
              <p className="auth-form-subtitle">
                {tab === 'login'
                  ? 'Enter your email — we\'ll send you a 6-digit sign-in code.'
                  : 'Create your account. We\'ll verify your email with a code.'}
              </p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSendOTP} className="auth-form" noValidate>
                {tab === 'register' && (
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
                )}

                <div className="auth-field">
                  <label htmlFor="auth-email" className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input"
                      autoFocus={tab === 'login'}
                    />
                  </div>
                </div>

                <button id="btn-auth-submit" type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Sending code…</span>
                    : <span className="auth-loading-row">Send Verification Code <ArrowRight size={15} /></span>}
                </button>
              </form>

              <p className="auth-switch-text">
                {tab === 'login' ? (
                  <>
                    No account?{' '}
                    <button className="auth-switch-btn" onClick={() => switchTab('register')}>Create one →</button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button className="auth-switch-btn" onClick={() => switchTab('login')}>Sign in →</button>
                  </>
                )}
              </p>
            </>
          ) : (
            /* ── Step 2: Enter OTP code ── */
            <div className="otp-step">
              <div className="otp-step-icon">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <h3 className="otp-step-title">Check your inbox</h3>
              <p className="otp-step-sub">
                We sent a 6-digit code to:<br />
                <strong>{email}</strong>
              </p>

              {success && <div className="auth-success" style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.82rem' }}>{success}</div>}
              {error && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

              <form onSubmit={handleVerifyOTP} className="auth-form" style={{ marginTop: '1.25rem' }} noValidate>
                <div className="auth-field">
                  <label htmlFor="otp-code" className="auth-label">6-Digit Code</label>
                  <div className="auth-input-wrap">
                    <ShieldCheck size={16} className="auth-input-icon" />
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="123456"
                      required
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      className="auth-input"
                      autoFocus
                      style={{ letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.25rem' }}
                    />
                  </div>
                </div>

                <button id="btn-otp-verify" type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Verifying…</span>
                    : <span className="auth-loading-row">Verify & Sign In <ArrowRight size={15} /></span>}
                </button>
              </form>

              {/* Resend */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '1rem' }}>
                <button
                  className="auth-switch-btn"
                  disabled={countdown > 0 || loading}
                  onClick={handleResend}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={13} />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>

              <button
                className="auth-switch-btn"
                style={{ marginTop: '1.25rem', display: 'block', marginInline: 'auto' }}
                onClick={() => { setOtpSent(false); setCode(''); setError(''); setSuccess('') }}
              >
                ← Change email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
