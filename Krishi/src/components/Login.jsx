import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, Mail, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useFarmvestStore } from '../store/useFarmvestStore'

export default function Login() {
  const { setView, theme } = useFarmvestStore()
  const isDark = theme === 'dark'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Load credentials if "Remember Me" was previously enabled
  useEffect(() => {
    const savedEmail = localStorage.getItem('farmvest_remembered_email')
    const savedPassword = localStorage.getItem('farmvest_remembered_password')
    const savedRemember = localStorage.getItem('farmvest_remember_enabled') === 'true'

    if (savedRemember) {
      if (savedEmail) setEmail(savedEmail)
      if (savedPassword) setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  const handleSignIn = (e) => {
    e.preventDefault()
    if (!email || !password) return

    setErrorMsg('')
    setLoading(true)

    setTimeout(() => {
      // Check credentials in localStorage (supports backwards compatibility with Krishi keys)
      const registeredEmail = localStorage.getItem('farmvest_email') || localStorage.getItem('krishi_gmail')
      const registeredPassword = localStorage.getItem('farmvest_password') || localStorage.getItem('krishi_password')

      const isRegisteredMatch = registeredEmail && registeredEmail.toLowerCase() === email.toLowerCase() && registeredPassword === password
      const isDemoMatch = email.toLowerCase() === 'demo@gmail.com' && password === '123456'

      if (isRegisteredMatch || isDemoMatch) {
        // Save or clear remember state
        if (rememberMe) {
          localStorage.setItem('farmvest_remembered_email', email)
          localStorage.setItem('farmvest_remembered_password', password)
          localStorage.setItem('farmvest_remember_enabled', 'true')
        } else {
          localStorage.removeItem('farmvest_remembered_email')
          localStorage.removeItem('farmvest_remembered_password')
          localStorage.setItem('farmvest_remember_enabled', 'false')
        }

        // Request geolocation coords for authenticating node synchronization (visual fidelity detail)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              localStorage.setItem('farmvest_gps_lat', position.coords.latitude.toString())
              localStorage.setItem('farmvest_gps_lon', position.coords.longitude.toString())
              localStorage.setItem('farmvest_gps_synced', 'true')
              
              setLoading(false)
              setSuccess(true)
              setTimeout(() => {
                setView('dashboard')
              }, 1200)
            },
            (error) => {
              console.warn("GPS sync declined/failed.", error)
              localStorage.setItem('farmvest_gps_synced', 'false')
              setLoading(false)
              setSuccess(true)
              setTimeout(() => {
                setView('dashboard')
              }, 1200)
            }
          )
        } else {
          setLoading(false)
          setSuccess(true)
          setTimeout(() => {
            setView('dashboard')
          }, 1200)
        }
      } else {
        setLoading(false)
        if (registeredEmail) {
          setErrorMsg("Invalid credentials. Please verify your security key and password.")
        } else {
          setErrorMsg("No active node registered with this email. Please register an account first.")
        }
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

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 size={36} className="text-emerald-400 animate-pulse" />
            </div>
            <h3 className="font-display font-extrabold text-2xl mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">
              Welcome Back
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              AI Security vaults validated. Synchronizing agricultural telemetry dashboard...
            </p>
          </motion.div>
        ) : (
          <>
            {/* Header / Brand */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-blue-500/10 mb-4 cursor-pointer" onClick={() => setView('home')}>
                F
              </div>
              <h2 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
                Access <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">Farmvest</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                Connect your account to access decentralized agritech assets and investments.
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              {/* Email Address */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <Key size={16} />
                  </span>
                  <input
                    type="password"
                    className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-500 dark:text-gray-400 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <a 
                  href="#" 
                  className="text-blue-500 hover:text-blue-600 font-semibold transition-colors" 
                  onClick={(e) => { e.preventDefault(); alert("Mock password reset link sent. Demo fallback credentials: demo@gmail.com / 123456"); }}
                >
                  Forgot Key?
                </a>
              </div>

              {/* Error messages */}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/25 p-3 rounded-2xl text-rose-600 dark:text-rose-400 text-[11px] leading-relaxed"
                >
                  <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button 
                  type="submit" 
                  className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all duration-300 cursor-pointer flex justify-center items-center gap-2" 
                  disabled={loading}
                >
                  {loading ? "Authenticating Vaults..." : "Secure Login"}
                </button>
                <button 
                  type="button" 
                  className="w-full py-3 text-sm font-bold border border-black/10 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl transition-all duration-300 cursor-pointer flex justify-center items-center gap-1.5" 
                  onClick={() => setView('home')}
                >
                  <ArrowLeft size={14} /> Cancel
                </button>
              </div>
            </form>

            {/* Redirection link */}
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
              New to Farmvest?{" "}
              <span 
                className="text-blue-500 hover:text-blue-600 font-bold cursor-pointer hover:underline" 
                onClick={() => setView('get-started')}
              >
                Initialize Account
              </span>
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
