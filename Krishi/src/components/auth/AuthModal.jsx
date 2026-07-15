import { useState, useEffect, useRef } from 'react'
import {
  X, ArrowRight, User, Mail, Lock,
  ShieldCheck, Eye, EyeOff, RefreshCw
} from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import { AuthAPI, TokenStore } from '../../services/api'
import { supabase, supabaseConfigured } from '../../services/supabase'

/**
 * AuthModal — Professional Supabase Email OTP Authentication
 *
 * PRIMARY flow  (when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set):
 *   Step 1 → supabase.auth.signInWithOtp({ email }) — Supabase sends the email
 *   Step 2 → supabase.auth.verifyOtp({ email, token }) — verifies OTP
 *   Step 3 → POST /auth/register/supabase { supabase_token, full_name, password }
 *            Backend decodes Supabase JWT → creates account → returns our JWT
 *
 * FALLBACK flow (when Supabase is not configured):
 *   Step 1 → POST /auth/register/send-otp  — backend sends OTP via Gmail/Resend
 *   Step 2 → POST /auth/register/verify    — verifies OTP, creates account
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
  const [step,      setStep]      = useState(1)  // 1=form  2=otp  3=done
  const [code,      setCode]      = useState('')
  const [countdown, setCountdown] = useState(0)
  const otpRef = useRef(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  // Password strength
  const pwScore = !password ? 0
    : password.length < 6  ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password) ? 4 : 3
  const pwLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwScore]
  const pwColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a'][pwScore]

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // Escape closes modal
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

  // Countdown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-focus OTP input
  useEffect(() => {
    if (step === 2) setTimeout(() => otpRef.current?.focus(), 120)
  }, [step])

  const resetAll = () => {
    setName(''); setEmail(''); setPassword(''); setShowPw(false)
    setCode(''); setStep(1); setCountdown(0)
    setError(''); setSuccess('')
  }
  const switchTab = (t) => { setTab(t); resetAll() }

  const applySession = (data) => {
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

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email.trim())    { setError('Please enter your email address.'); return }
    if (!password.trim()) { setError('Please enter your password.'); return }
    setLoading(true)
    try {
      const data = await AuthAPI.login({ email: email.trim(), password })
      applySession(data)
      onSuccess?.('dashboard')
    } catch (err) {
      setError(err?.message || 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  // ── REGISTER Step 1 ─────────────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!name.trim())        { setError('Please enter your full name.'); return }
    if (!email.trim())       { setError('Please enter your email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      if (supabaseConfigured) {
        // ── PRIMARY: Supabase OTP ──────────────────────────────────────────
        const { error: sbErr } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo:  undefined,
          },
        })
        if (sbErr) {
          setError(sbErr.message || 'Failed to send verification code.')
          return
        }
      } else {
        // ── FALLBACK: Backend OTP (Gmail / Resend) ─────────────────────────
        await AuthAPI.registerSendOTP({
          full_name: name.trim(),
          email:     email.trim(),
          password,
        })
      }
      setSuccess(`Verification code sent to ${email.trim()}. Check your inbox.`)
      setStep(2)
      setCountdown(60)
    } catch (err) {
      setError(err?.message || 'Failed to send verification code. Please try again.')
    } finally { setLoading(false) }
  }

  // ── REGISTER Resend ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || loading) return
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (supabaseConfigured) {
        const { error: sbErr } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true },
        })
        if (sbErr) { setError(sbErr.message || 'Resend failed.'); return }
      } else {
        await AuthAPI.registerSendOTP({
          full_name: name.trim(),
          email:     email.trim(),
          password,
        })
      }
      setSuccess('New code sent! Check your inbox.')
      setCountdown(60)
    } catch (err) {
      setError(err?.message || 'Resend failed. Please try again.')
    } finally { setLoading(false) }
  }

  // ── REGISTER Step 2: Verify OTP ─────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (code.trim().length !== 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }
    setLoading(true)
    try {
      if (supabaseConfigured) {
        // ── PRIMARY: Supabase verify → backend register ────────────────────
        const { data: sbData, error: sbErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type:  'email',
        })
        if (sbErr || !sbData?.session?.access_token) {
          setError(sbErr?.message || 'Invalid or expired code. Please try again.')
          return
        }
        const data = await AuthAPI.registerSupabase({
          supabase_token: sbData.session.access_token,
          full_name:      name.trim(),
          password,
        })
        applySession(data)
      } else {
        // ── FALLBACK: Backend verify ───────────────────────────────────────
        const data = await AuthAPI.registerVerify({
          email: email.trim(),
          code:  code.trim(),
        })
        applySession(data)
      }
      onSuccess?.('dashboard')
    } catch (err) {
      setError(err?.message || 'Verification failed. Please try again.')
    } finally { setLoading(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="auth-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
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

        {/* Tabs — Step 1 only */}
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

          {/* ══════════════════════ LOGIN ══════════════════════ */}
          {tab === 'login' && (
            <>
              <p className="auth-form-subtitle">
                Welcome back — sign in with your email and password.
              </p>
              {error   && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <form onSubmit={handleLogin} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="login-email" className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="login-email" type="email" placeholder="you@example.com"
                      autoComplete="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input" autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="login-password" type={showPw ? 'text' : 'password'}
                      placeholder="••••••••" autoComplete="current-password"
                      required value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input" style={{ paddingRight: '2.5rem' }}
                    />
                    <button type="button" className="auth-pw-toggle"
                      onClick={() => setShowPw(v => !v)} tabIndex={-1}>
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

          {/* ══════════════════════ REGISTER — Step 1 ══════════════════════ */}
          {tab === 'register' && step === 1 && (
            <>
              <p className="auth-form-subtitle">
                Create your account — we'll send a 6-digit verification code to your email.
              </p>

              {error   && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <form onSubmit={handleSendOTP} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="reg-name" className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="reg-name" type="text" placeholder="Ramesh Kumar"
                      autoComplete="name" required value={name}
                      onChange={e => setName(e.target.value)}
                      className="auth-input" autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-email" className="auth-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="reg-email" type="email" placeholder="you@example.com"
                      autoComplete="email" required value={email}
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
                      id="reg-password" type={showPw ? 'text' : 'password'}
                      placeholder="Min. 6 characters" autoComplete="new-password"
                      required minLength={6} value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input" style={{ paddingRight: '2.5rem' }}
                    />
                    <button type="button" className="auth-pw-toggle"
                      onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {password.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                        {[1,2,3,4].map(n => (
                          <div key={n} style={{
                            flex: 1, height: '3px', borderRadius: '99px',
                            background: n <= pwScore ? pwColor : 'var(--border, #e2e8f0)',
                            transition: 'background 0.25s ease',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: pwColor }}>
                        {pwLabel}
                      </span>
                    </div>
                  )}
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

          {/* ══════════════════════ REGISTER — Step 2: OTP ══════════════════ */}
          {tab === 'register' && step === 2 && (
            <div className="otp-step">
              <div className="otp-step-icon">
                <ShieldCheck size={34} strokeWidth={1.5} />
              </div>
              <h3 className="otp-step-title">Check your inbox</h3>
              <p className="otp-step-sub">
                We sent a 6-digit verification code to:<br />
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
                  <label htmlFor="otp-code" className="auth-label">6-Digit Code</label>
                  <div className="auth-input-wrap">
                    <ShieldCheck size={16} className="auth-input-icon" />
                    <input
                      id="otp-code" ref={otpRef}
                      type="text" inputMode="numeric"
                      pattern="[0-9]{6}" maxLength={6}
                      placeholder="123456" required value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="auth-input"
                      style={{ letterSpacing: '0.35em', textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}
                    />
                  </div>

                  {/* Progress dots */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '7px', marginTop: '10px' }}>
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        width: '9px', height: '9px', borderRadius: '50%',
                        background: i < code.length ? '#22c55e' : 'var(--border, #334155)',
                        transition: 'background 0.18s ease',
                        boxShadow: i < code.length ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                      }} />
                    ))}
                  </div>
                </div>

                <button
                  id="btn-otp-verify" type="submit" className="auth-submit-btn"
                  disabled={loading || code.length !== 6}
                >
                  {loading
                    ? <span className="auth-loading-row"><span className="auth-spinner" /> Verifying…</span>
                    : <span className="auth-loading-row">Verify &amp; Create Account <ArrowRight size={15} /></span>}
                </button>
              </form>

              {/* Resend */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
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
