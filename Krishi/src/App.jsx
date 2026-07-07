import { useEffect, Component } from 'react'
import { useFarmvestStore } from './store/useFarmvestStore'
import { TokenStore } from './services/api'

// Layout
import Header    from './components/layout/Header'

// Pages / views
import LandingPage from './components/home/LandingPage'
import AuthModal   from './components/auth/AuthModal'
import Dashboard   from './components/dashboard/Dashboard'


/**
 * ErrorBoundary — catches any render error and shows a helpful message
 * instead of a blank white page. Critical for GitHub Pages deployments.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[Krishi AI] Render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0B132B', color: '#E2E8F0', fontFamily: 'Inter, sans-serif',
          padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Krishi AI</h1>
          <p style={{ color: '#94a3b8', maxWidth: '400px', marginBottom: '1.5rem' }}>
            Something went wrong loading the app. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#22c55e', color: '#0f172a', border: 'none',
              padding: '0.75rem 2rem', borderRadius: '12px',
              fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <pre style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#ef4444', textAlign: 'left', maxWidth: '600px', overflow: 'auto' }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * App — top-level router shell.
 * Auth views are rendered as a blurred modal overlay on the landing page.
 * OTP-based authentication is handled entirely within AuthModal.
 */
function AppInner() {
  const { view, setView, setUser, theme } = useFarmvestStore()

  // Scroll to top on every view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const snapEl = document.querySelector('.snap-scroll-container')
    if (snapEl) {
      snapEl.scrollTo({ top: 0, behavior: 'instant' })
    }
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  )
}
