import { useState, useEffect } from 'react'
import { X, ArrowRight, User, Mail, Lock, ShieldCheck, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import { AuthAPI, TokenStore } from '../../services/api'
import { supabase } from '../../services/supabase'

/**
 * AuthModal
 *
 * LOGIN tab:
 *   Email + Password → POST /auth/login (our backend, unchanged)
 *
 * REGISTER (Get Started) tab:
 *   Step 1 — Full Name + Email + Password → supabase.auth.signInWithOtp({ email })
 *   Step 2 — 6-digit OTP from email      → supabase.auth.verifyOtp(...)
 *   Step 3 — Send verified token to backend → POST /auth/register/supabase → JWT
 *
 * Supabase sends the OTP email — no SMTP config needed, works everywhere.
 */
export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language, setUser } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab)

  // Shared fields
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)

  // OTP step
  const [step,      setStep]      = useState(1)   // 1 = form, 2 = otp entry
  const [code,      setCode]      = useState('')
  const [countdown, setCountdown] = useState(0)

  // UI
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // Escape key closes modal
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

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const resetAll = () => {
    setName(''); setEmail(''); setPassword('')
    setCode(''); setStep(1); setCountdown(0)
    setError(''); setSuccess(''); setShowPw(false)
  }

  const switchTab = (newTab) => { setTab(newTab); resetAll() }

  // Helper — set user state from backend response
  const applyUserSession = (data) => {
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
  }

  // ── LOGIN: Email + Password ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!email.trim())    { setError('Please enter your email address.'); return }
    if (!password.trim()) { setError('Please enter your password.'); return }

    setLoading(true)
    try {
      const data = await AuthAPI.login({ email: email.trim(), password })
      applyUserSession(data)
      if (onSuccess) onSuccess('dashboard')
    } catch (err) {
      setError(err?.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── REGISTER Step 1: Send OTP via Supabase ─────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!name.trim())        { setError('Please enter your full name.'); return }
    if (!email.trim())       { setError('Please enter your email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    // Guard: Supabase not configured (missing env vars)
    if (!supabase) {
      setError('Email verification is not configured yet. Please contact support or try again later.')
      return
    }

    setLoading(true)
    try {
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          // Tell Supabase not to redirect — we handle everything ourselves
          emailRedirectTo: undefined,
        },
      })

      if (sbError) {
        // Rate limit message from Supabase is "For security purposes, you can only request this after X seconds"
        setError(sbError.message || 'Failed to send verification code. Please try again.')
        return
      }

      setSuccess(`Verification code sent to ${email.trim()}. Check your inbox.`)
      setStep(2)
      setCountdown(60)
    } catch (err) {
      setError('Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── REGISTER Step 1b: Resend OTP ──────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || loading) return
    if (!supabase) { setError('Email verification is not configured.'); return }
    setError(''); setSuccess('')
    setLoading(true)
    try {
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      })
      if (sbError) {
        setError(sbError.message || 'Resend failed. Please try again.')
        return
      }
      setSuccess('New code sent! Check your inbox.')
      setCountdown(60)
    } catch (err) {
      setError('Resend failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── REGISTER Step 2: Verify OTP and create account ────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')

    if (code.trim().length !== 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    if (!supabase) {
      setError('Email verification is not configured. Please contact support.')
      return
    }

    setLoading(true)
    try {
      // Step A: Verify the OTP with Supabase
      const { data: sbData, error: sbError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type:  'email',
      })

      if (sbError || !sbData?.session?.access_token) {
        setError(sbError?.message || 'Invalid or expired code. Please try again.')
        return
      }

      // Step B: Send verified Supabase token to our backend to create the account
      const data = await AuthAPI.registerSupabase({
        supabase_token: sbData.session.access_token,
        full_name:      name.trim(),
        password,
      })

      applyUserSession(data)
      if (onSuccess) onSuccess('dashboard')
    } catch (err) {
      setError(err?.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal-box">

        {/* Close button */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="auth-modal-logo">
          <div className="auth-logo-icon">K</div>
          <span className="auth-logo-text">Krishi<span className="auth-logo-accent"> AI</span></span>
        </div>

        {/* Tabs — only shown on Step 1 */}
        {step === 1 && (
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
        )}

        <div className="auth-form-wrap">

          {/* ════════════════════════════════════════════
              LOGIN TAB
          ════════════════════════════════════════════ */}
          {tab === 'login' && (
            <>
              <p className="auth-form-subtitle">
                Welcome back! Sign in with your email and password.
              </p>

              {error   && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <form onSubmit={handleLogin} className="auth-form" noValidate>
                {/* Email */}
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

                {/* Password */}
                <div className="auth-field">
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      className="auth-pw-toggle"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
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
                <button className="auth-switch-btn" onClick={() => switchTab('register')}>
                  Create one →
                </button>
              </p>
            </>
          )}

          {/* ════════════════════════════════════════════
              REGISTER TAB — STEP 1: Details + send OTP
          ════════════════════════════════════════════ */}
          {tab === 'register' && step === 1 && (
            <>
              <p className="auth-form-subtitle">
                Create your account. We'll send a 6-digit code to verify your email.
              </p>

              {error   && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <form onSubmit={handleSendOTP} className="auth-form" noValidate>
                {/* Full Name */}
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

                {/* Email */}
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

                {/* Password */}
                <div className="auth-field">
                  <label htmlFor="reg-password" className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="reg-password"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      className="auth-pw-toggle"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span className="auth-field-hint">Must be at least 6 characters</span>
                </div>

                <button id="btn-register-submit" type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Sending code…</span>
                    : <span className="auth-loading-row">Send Verification Code <ArrowRight size={15} /></span>}
                </button>
              </form>

              <p className="auth-switch-text">
                Already have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchTab('login')}>Sign in →</button>
              </p>
            </>
          )}

          {/* ════════════════════════════════════════════
              REGISTER TAB — STEP 2: OTP entry
          ════════════════════════════════════════════ */}
          {tab === 'register' && step === 2 && (
            <div className="otp-step">
              <div className="otp-step-icon">
                <ShieldCheck size={34} strokeWidth={1.5} />
              </div>
              <h3 className="otp-step-title">Check your inbox</h3>
              <p className="otp-step-sub">
                We sent a 6-digit code to:<br />
                <strong>{email}</strong>
              </p>

              {success && (
                <div className="auth-success" style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.82rem' }}>
                  {success}
                </div>
              )}
              {error && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

              <form onSubmit={handleVerifyOTP} className="auth-form" style={{ marginTop: '1.25rem' }} noValidate>
                <div className="auth-field">
                  <label htmlFor="otp-code" className="auth-label">6-Digit Verification Code</label>
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
                      style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.3rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <button id="btn-otp-verify" type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Verifying…</span>
                    : <span className="auth-loading-row">Verify &amp; Create Account <ArrowRight size={15} /></span>}
                </button>
              </form>

              {/* Resend */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '1rem' }}>
                <button
                  className="auth-switch-btn"
                  disabled={countdown > 0 || loading}
                  onClick={handleResend}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: countdown > 0 ? 0.5 : 1 }}
                >
                  <RefreshCw size={13} />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>

              <button
                className="auth-switch-btn"
                style={{ marginTop: '1rem', display: 'block', marginInline: 'auto' }}
                onClick={() => { setStep(1); setCode(''); setError(''); setSuccess('') }}
              >
                ← Back to edit details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
