import { useEffect, useState, useRef } from 'react'
import { Sun, Moon, LogOut, Menu, X } from 'lucide-react'
import FarmvestLanding from './components/FarmvestLanding'
import GetStarted from './components/GetStarted'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { useFarmvestStore } from './store/useFarmvestStore'

function App() {
  const {
    theme,
    toggleTheme,
    view,
    setView,
    setActiveTab
  } = useFarmvestStore()

  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Track scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setMobileMenuOpen(false)
  }, [view])

  const handleLogOut = () => {
    setView('home')
  }

  const navLinks = [
    { label: 'Home', action: () => setView('home'), active: view === 'home' },
    { label: 'Investments', action: () => { setView('home'); setTimeout(() => document.getElementById('investments')?.scrollIntoView({ behavior: 'smooth' }), 100) } },
    { label: 'How It Works', action: () => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 100) } },
    { label: 'Dashboard', action: () => { setView('dashboard'); setActiveTab('dashboard') }, active: view === 'dashboard' },
  ]

  return (
    <div className={view === 'home' ? '' : 'min-h-screen bg-[#FAFAF5]'}>
      {/* ═══ NAVBAR ═══ */}
      <nav className={`navbar-floating fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 sm:px-10 py-4 ${scrolled ? 'scrolled' : ''}`}>
        {/* Left: Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-green-400 border-2.5 border-slate-900 flex items-center justify-center text-slate-900 font-black text-sm shadow-[2px_2px_0px_0px_#0F172A]">
            F
          </div>
          <span className="font-display font-black text-2xl text-slate-900 tracking-tight">
            Farmvest
          </span>
        </div>

        {/* Center: Nav Links (desktop) */}
        <div className="hidden md:flex items-center gap-2 bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-2xl p-1 shadow-sm">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={link.action}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                link.active
                  ? 'text-slate-900 bg-green-300 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0F172A] translate-y-[-1px]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/30'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {view === 'home' && (
            <>
              <button
                onClick={() => setView('login')}
                className="hidden sm:block text-xs font-black uppercase tracking-wider text-slate-700 hover:text-slate-900 transition-colors cursor-pointer px-4 py-2.5 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0F172A] rounded-xl hover:translate-y-[-1px] active:translate-y-[1px]"
              >
                Sign In
              </button>
              <button
                onClick={() => setView('get-started')}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-green-400 hover:bg-green-300 text-slate-900 shadow-[2.5px_2.5px_0px_0px_#0F172A] border-2 border-slate-900 transition-all cursor-pointer hover:translate-y-[-1px] active:translate-y-[1px]"
              >
                Get Started
              </button>
            </>
          )}

          {view === 'login' && (
            <button
              onClick={() => setView('get-started')}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-green-400 hover:bg-green-300 text-slate-900 shadow-[2.5px_2.5px_0px_0px_#0F172A] border-2 border-slate-900 transition-all cursor-pointer"
            >
              Get Started
            </button>
          )}

          {view === 'get-started' && (
            <button
              onClick={() => setView('login')}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-green-400 hover:bg-green-300 text-slate-900 shadow-[2.5px_2.5px_0px_0px_#0F172A] border-2 border-slate-900 transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}

          {view === 'dashboard' && (
            <button
              onClick={handleLogOut}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-red-500 bg-red-100 text-red-700 hover:bg-red-200 shadow-[2px_2px_0px_0px_#ef4444] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={14} className="stroke-[2.5px]" /> Disconnect
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl border-2 border-slate-900 bg-white text-slate-950 shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X size={20} className="stroke-[2.5px]" /> : <Menu size={20} className="stroke-[2.5px]" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-[82px] left-4 right-4 bg-[#FFFDF0] rounded-2xl shadow-[5px_5px_0px_0px_#0F172A] border-3 border-slate-900 p-4 z-50">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => { link.action(); setMobileMenuOpen(false) }}
                className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer mb-2 last:mb-0 ${
                  link.active 
                    ? 'text-slate-900 bg-green-300 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0F172A]' 
                    : 'text-slate-700 hover:bg-slate-100 border-2 border-transparent'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="border-t-2 border-slate-900 mt-3 pt-3">
              {view === 'home' && (
                <button
                  onClick={() => { setView('login'); setMobileMenuOpen(false) }}
                  className="w-full text-center px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-900 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-50 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}iv>
      )}

      {/* ═══ VIEW RENDERING ═══ */}
      {view === 'home' && <FarmvestLanding />}
      {view === 'get-started' && (
        <div className="pt-20 min-h-screen">
          <GetStarted setView={setView} theme={theme} />
        </div>
      )}
      {view === 'login' && (
        <div className="pt-20 min-h-screen">
          <Login setView={setView} theme={theme} />
        </div>
      )}
      {view === 'dashboard' && <Dashboard />}
    </div>
  )
}

export default App
