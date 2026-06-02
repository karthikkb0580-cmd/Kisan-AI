import { useEffect } from 'react'
import { useFarmvestStore } from './store/useFarmvestStore'

// Layout
import Header    from './components/layout/Header'

// Pages / views
import LandingPage from './components/home/LandingPage'
import AuthModal   from './components/auth/AuthModal'
import Dashboard   from './components/dashboard/Dashboard'

/**
 * App — top-level router shell.
 * Auth views are now rendered as a blurred modal overlay on the landing page.
 */
function App() {
  const { view, setView, theme } = useFarmvestStore()

  // Scroll to top on every view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])

  // Synchronize theme with DOM
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

  // Auth modal is shown when view is 'login' or 'get-started'
  const showAuthModal = view === 'login' || view === 'get-started'

  return (
    <div className={view === 'dashboard' ? 'app-dashboard-active' : ''}>
      {/* ── Global navigation ── */}
      <Header />

      {/* ── Dashboard ── */}
      {view === 'dashboard' && <Dashboard />}

      {/* ── Landing page (always rendered unless in dashboard) ── */}
      {view !== 'dashboard' && <LandingPage />}

      {/* ── Auth modal overlay on landing page ── */}
      {showAuthModal && (
        <AuthModal
          initialTab={view === 'get-started' ? 'register' : 'login'}
          onClose={() => setView('home')}
          onSuccess={(nextView) => setView(nextView)}
        />
      )}
    </div>
  )
}

export default App
