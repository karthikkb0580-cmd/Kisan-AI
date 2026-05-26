import { useEffect }           from 'react'
import { useFarmvestStore }    from './store/useFarmvestStore'

// Layout
import Header                  from './components/layout/Header'

// Pages / views
import LandingPage             from './components/home/LandingPage'
import GetStarted              from './components/auth/GetStarted'
import Login                   from './components/auth/Login'
import Dashboard               from './components/dashboard/Dashboard'

/**
 * App — top-level router shell.
 * Reads `view` from global Zustand store and renders the matching page.
 * All layout-level concerns (Header, scroll reset) live here.
 */
function App() {
  const { view, setView, theme } = useFarmvestStore()

  // Scroll to top on every view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])

  // Synchronize theme with DOM document element and body
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    
    if (theme === 'dark') {
      root.classList.add('dark-theme', 'dark')
      root.classList.remove('light-theme', 'light')
      body.classList.add('dark-theme', 'dark')
      body.classList.remove('light-theme', 'light')
      body.style.backgroundColor = '#0B132B'
      body.style.color = '#E2E8F0'
    } else {
      root.classList.add('light-theme', 'light')
      root.classList.remove('dark-theme', 'dark')
      body.classList.add('light-theme', 'light')
      body.classList.remove('dark-theme', 'dark')
      body.style.backgroundColor = '#FAFAF5'
      body.style.color = '#1E293B'
    }
  }, [theme])

  return (
    <div className={view !== 'home' ? 'min-h-screen bg-[var(--theme-bg)] transition-colors duration-300' : ''}>

      {/* ── Global navigation ── */}
      <Header />

      {/* ── View router ── */}
      {view === 'home'        && <LandingPage />}

      {view === 'get-started' && (
        <div className="pt-20 min-h-screen">
          <GetStarted setView={setView} theme={theme} />
        </div>
      )}

      {view === 'login'       && (
        <div className="pt-20 min-h-screen">
          <Login setView={setView} theme={theme} />
        </div>
      )}

      {view === 'dashboard'   && <Dashboard />}
    </div>
  )
}

export default App
