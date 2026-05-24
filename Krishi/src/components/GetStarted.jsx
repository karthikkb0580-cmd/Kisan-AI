import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Mail, CheckCircle2, Phone, User, Lock, ShieldCheck, ArrowLeft, ArrowRight, Cpu } from 'lucide-react'
import { useFarmvestStore } from '../store/useFarmvestStore'

export default function GetStarted() {
  const { setView, theme } = useFarmvestStore()
  const isDark = theme === 'dark'

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [fullName, setFullName] = useState('')
  
  // OTP states
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]
  const [otpError, setOtpError] = useState(false)
  const [simulatedOtp, setSimulatedOtp] = useState('')

  // Password states
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passError, setPassError] = useState('')

  const [loading, setLoading] = useState(false)

  const handleSendOtp = (e) => {
    e.preventDefault()
    if (!email || !mobile || !fullName) return

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      // Generate a mock OTP code for the user to type
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setSimulatedOtp(code)
      setStep(2)
    }, 1000)
  }

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Focus next box automatically
    if (value !== '' && index < 5) {
      otpRefs[index + 1].current.focus()
    }
  }

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs[index - 1].current.focus()
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    const entered = otp.join('')
    if (entered === simulatedOtp || entered === '123456') {
      setOtpError(false)
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        setStep(3)
      }, 800)
    } else {
      setOtpError(true)
    }
  }

  const handleSetPassword = (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setPassError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setPassError("Passwords do not match.")
      return
    }

    setPassError('')
    setLoading(true)
    setTimeout(() => {
      // Save credentials in localStorage (dual support for krishi and farmvest prefixes)
      localStorage.setItem('farmvest_email', email)
      localStorage.setItem('farmvest_password', password)
      localStorage.setItem('farmvest_name', fullName)

      localStorage.setItem('krishi_gmail', email)
      localStorage.setItem('krishi_password', password)
      
      // Request GPS coordinates for investor verification (visual detail)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            localStorage.setItem('farmvest_gps_lat', position.coords.latitude.toString())
            localStorage.setItem('farmvest_gps_lon', position.coords.longitude.toString())
            localStorage.setItem('farmvest_gps_synced', 'true')
            
            setLoading(false)
            setStep(4)
            setTimeout(() => {
              setView('dashboard')
            }, 1800)
          },
          (error) => {
            console.warn("GPS sync declined during registration.", error)
            localStorage.setItem('farmvest_gps_synced', 'false')
            setLoading(false)
            setStep(4)
            setTimeout(() => {
              setView('dashboard')
            }, 1800)
          }
        )
      } else {
        setLoading(false)
        setStep(4)
        setTimeout(() => {
          setView('dashboard')
        }, 1800)
      }
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[5px] overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-md rounded-[32px] p-8 md:p-10 border shadow-2xl relative overflow-hidden transition-colors duration-300"
      >
        {/* Ambient background glow inside card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Step tracker circles */}
        {step < 4 && (
          <div className="flex items-center justify-between mb-8 max-w-[280px] mx-auto relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-black/10 dark:bg-white/5 z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-blue-500 to-emerald-500 z-0 transition-all duration-300" 
              style={{ width: `${(step - 1) * 50}%` }} 
            />
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300 ${
              step >= 1 ? 'bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md' : 'bg-black/10 dark:bg-white/5 text-gray-500'
            }`}>1</div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300 ${
              step >= 2 ? 'bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md' : 'bg-black/10 dark:bg-white/5 text-gray-500'
            }`}>2</div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300 ${
              step >= 3 ? 'bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md' : 'bg-black/10 dark:bg-white/5 text-gray-500'
            }`}>3</div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
                  Initialize <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">Account</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Connect your information to activate your investor dashboard node.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                      placeholder="e.g. Alex Mercer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email Account */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                      placeholder="+1 (555) 000-0000"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all duration-300 cursor-pointer flex justify-center items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? "Generating Uplink..." : "Send Verification OTP"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
                  Verify <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">Identity</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
                  Enter the 6-digit verification code sent to:<br/>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6 Digit Input boxes */}
                <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white transition-all duration-200"
                      required
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-center text-xs text-rose-500 font-semibold leading-relaxed">
                    Invalid code. Please enter the correct OTP code.
                  </p>
                )}

                {/* Simulated helper panel */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-center">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
                    <ShieldCheck size={14} className="shrink-0" />
                    Simulated OTP code sent: <strong className="font-mono text-xs text-emerald-800 dark:text-emerald-300">{simulatedOtp}</strong>
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    type="submit" 
                    className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all duration-300 cursor-pointer flex justify-center items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? "Verifying Coords..." : "Confirm Verification"}
                  </button>
                  <button 
                    type="button" 
                    className="w-full py-3 text-sm font-bold border border-black/10 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl transition-all duration-300 cursor-pointer flex justify-center items-center" 
                    onClick={() => {
                      const code = Math.floor(100000 + Math.random() * 900000).toString()
                      setSimulatedOtp(code)
                      setOtp(['', '', '', '', '', ''])
                      setOtpError(false)
                      setTimeout(() => otpRefs[0].current.focus(), 50)
                    }}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
                  Secure <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">Account</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Establish a secure cryptographic password key to lock your assets.
                </p>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                {/* Choose Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Create Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {passError && (
                  <p className="text-center text-xs text-rose-500 font-semibold leading-relaxed">
                    {passError}
                  </p>
                )}

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all duration-300 cursor-pointer flex justify-center items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? "Bootstraping Vaults..." : "Activate Vault Node"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <Cpu size={36} className="text-emerald-400 animate-pulse" />
              </div>
              <h3 className="font-display font-extrabold text-2xl mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">
                Portfolio Activated
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                Welcome, {fullName}! Your decentralized agritech investment wallet has been initialized. Syncing telemetry details...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 4 && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
            Already have an account?{" "}
            <span 
              className="text-blue-500 hover:text-blue-600 font-bold cursor-pointer hover:underline" 
              onClick={() => setView('login')}
            >
              Sign In Here
            </span>
          </p>
        )}
      </motion.div>
    </div>
  )
}
