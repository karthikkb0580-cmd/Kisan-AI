import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, User, Phone, Shield } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import { AuthAPI, TokenStore } from '../../services/api'
import firebase, { auth } from '../../services/firebase'

export default function AuthModal({ initialTab = 'login', onClose, onSuccess }) {
  const { language, setUser } = useFarmvestStore()
  const [tab, setTab] = useState(initialTab) // 'login' or 'register'

  // States
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState(1) // 1: phone / details, 2: verify OTP
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)

  const recaptchaVerifierRef = useRef(null)

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

  // Clean up recaptcha widget on tab switch or close
  const switchTab = (newTab) => {
    setTab(newTab)
    setStep(1)
    setError('')
    setOtpCode('')
    setConfirmationResult(null)
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      } catch (e) {
        console.warn(e)
      }
    }
  }

  // Format phone number to standard international format (defaults to +91 for India if no country code provided)
  const formatPhoneNumber = (num) => {
    let clean = num.replace(/\D/g, '')
    if (clean.length === 10) {
      return `+91${clean}`
    }
    if (num.startsWith('+')) {
      return num
    }
    return `+${clean}`
  }

  // ── SEND OTP ─────────────────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!phoneNumber) {
      setError('Please enter your phone number.')
      return
    }
    if (tab === 'register' && !name) {
      setError('Please enter your full name.')
      return
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)
    setLoading(true)

    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new firebase.auth.RecaptchaVerifier(
          'recaptcha-container',
          {
            size: 'invisible',
            callback: () => {
              // recaptcha solved
            },
            'expired-callback': () => {
              setError('Recaptcha expired. Please try again.')
            }
          }
        )
      }

      const result = await auth.signInWithPhoneNumber(formattedPhone, recaptchaVerifierRef.current)
      setConfirmationResult(result)
      setStep(2)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to send OTP. Please check your number.')
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
          recaptchaVerifierRef.current = null
        } catch (verifierError) {
          console.warn('Recaptcha clear error:', verifierError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // ── VERIFY OTP & SIGN IN/UP ──────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.')
      return
    }
    setLoading(true)

    try {
      const userCredential = await confirmationResult.confirm(otpCode)
      const firebaseUser = userCredential.user
      const cleanPhone = firebaseUser.phoneNumber

      // Authenticate with local DB
      const tokens = await AuthAPI.loginFirebase(cleanPhone, tab === 'register' ? name : undefined)
      
      TokenStore.set(tokens.access_token, tokens.refresh_token)
      const profile = await AuthAPI.getMe()
      
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

      onSuccess('dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Verification failed. Please check the code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal-box">

        {/* Invisible Recaptcha container required by Firebase */}
        <div id="recaptcha-container"></div>

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

        <div className="auth-form-wrap">
          {/* Step indicator */}
          <div className="auth-steps">
            <div className={`auth-step-dot ${step >= 1 ? 'done' : ''}`}>1</div>
            <div className="auth-step-line" />
            <div className={`auth-step-dot ${step >= 2 ? 'done' : ''}`}>2</div>
          </div>

          <p className="auth-form-subtitle">
            {step === 1 && (tab === 'login' ? 'Sign in to your account.' : 'Create your Krishi AI account.')}
            {step === 2 && 'Enter the 6-digit code sent to your phone.'}
          </p>

          {error && <div className="auth-error">{error}</div>}

          {/* Step 1 Form: Details or Phone */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="auth-form">
              {tab === 'register' && (
                <div className="auth-field">
                  <label htmlFor="reg-name" className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Ramesh Kumar"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-phone" className="auth-label">Phone Number</label>
                <div className="auth-input-wrap">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    id="auth-phone"
                    type="tel"
                    placeholder="98765 43210"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="auth-input"
                  />
                </div>
              </div>

              <button id="btn-send-otp" type="submit" className="auth-submit-btn" disabled={loading}>
                {loading
                  ? <span className="auth-loading-row"><span className="auth-spinner" /> Sending OTP…</span>
                  : <span className="auth-loading-row">Send Verification OTP <ArrowRight size={15} /></span>}
              </button>
            </form>
          )}

          {/* Step 2 Form: Verify OTP Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="auth-form">
              <div className="auth-totp-hint">
                <Shield size={28} className="auth-totp-hint-icon" />
                <p>Enter the <strong>6-digit OTP code</strong> sent to {phoneNumber}.</p>
              </div>

              <div className="auth-field">
                <label htmlFor="otp-code-input" className="auth-label">OTP Code</label>
                <input
                  id="otp-code-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="auth-input auth-otp-input"
                  style={{ textAlign: 'center', letterSpacing: '8px', fontWeight: 'bold', fontSize: '1.5rem' }}
                  autoFocus
                />
              </div>

              <button id="btn-verify-otp" type="submit" className="auth-submit-btn" disabled={loading}>
                {loading
                  ? <span className="auth-loading-row"><span className="auth-spinner" /> Verifying…</span>
                  : <span className="auth-loading-row">Verify & Continue <ArrowRight size={15} /></span>}
              </button>

              <button
                type="button"
                className="auth-back-btn"
                onClick={() => { setStep(1); setError(''); setOtpCode(''); }}
                disabled={loading}
              >
                ← Back to details
              </button>
            </form>
          )}

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
        </div>

      </div>
    </div>
  )
}
