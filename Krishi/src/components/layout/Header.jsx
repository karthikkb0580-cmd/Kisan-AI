import { useState, useEffect, useRef } from 'react'
import { LogOut, Sun, Moon, Globe, ChevronDown, Menu, X } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

export default function Header() {
  const {
    view,
    setView,
    theme,
    toggleTheme,
    language,
    setLanguage,
    logout
  } = useFarmvestStore()

  const [scrolled, setScrolled] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const langDropdownRef = useRef(null)

  // Track scroll for floating navbar — listens on the snap container, not window
  useEffect(() => {
    const container = document.querySelector('.scroll3d-container')
    const handleScroll = (e) => {
      const el = e?.target ?? container
      setScrolled(el ? el.scrollTop > 60 : false)
    }
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }
    // Also listen on window as fallback for non-snap pages
    window.addEventListener('scroll', () => setScrolled(window.scrollY > 60), { passive: true })
    return () => {
      container?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Close menus on view/route changes
  const [prevView, setPrevView] = useState(view)
  if (view !== prevView) {
    setPrevView(view)
    setLangDropdownOpen(false)
    setMobileMenuOpen(false)
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogOut = () => logout()

  // Translation helper
  const t = (key, fallback) => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback || key
  }

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' }
  ]

  const currentLang = languages.find(l => l.code === language) || languages[0]

  return (
    <>
      {/* ═══ PROFESSIONAL FLOATING NAVBAR ═══ */}
      <nav
        id="main-header"
        className={`header-pro fixed top-0 left-0 w-full z-50 ${scrolled ? 'header-scrolled' : ''}`}
      >
        <div className="header-inner">
          {/* Brand Logo & Title */}
          <div
            className="header-brand"
            onClick={() => setView('home')}
          >
            <div className="header-logo-icon">
              <span>K</span>
            </div>
            <span className="header-logo-text">
              Krishi <span className="header-logo-accent">AI</span>
            </span>
          </div>

          {/* Desktop Right Actions */}
          <div className="header-actions">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="header-icon-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Language Selector */}
            <div className="header-lang-wrap" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="header-lang-btn"
              >
                <Globe size={16} />
                <span className="header-lang-code">{currentLang.code.toUpperCase()}</span>
                <ChevronDown size={14} className={`header-chevron ${langDropdownOpen ? 'open' : ''}`} />
              </button>

              {langDropdownOpen && (
                <div className="header-lang-dropdown">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code)
                        setLangDropdownOpen(false)
                      }}
                      className={`header-lang-option ${language === lang.code ? 'active' : ''}`}
                    >
                      <span>{lang.name}</span>
                      <span>{lang.flag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Actions */}
            {view === 'dashboard' ? (
              <button
                id="btn-disconnect"
                onClick={handleLogOut}
                className="header-btn header-btn-danger"
              >
                <LogOut size={15} />
                <span>{t('disconnect', 'Disconnect')}</span>
              </button>
            ) : (
              <div className="header-auth-group">
                <button
                  id="btn-sign-in"
                  onClick={() => setView('login')}
                  className={`header-btn header-btn-ghost ${view === 'login' ? 'header-btn-active' : ''}`}
                >
                  {t('login', 'Login')}
                </button>
                <button
                  id="btn-get-started"
                  onClick={() => setView('get-started')}
                  className={`header-btn header-btn-primary ${view === 'get-started' ? 'header-btn-active' : ''}`}
                >
                  {t('getStarted', 'Get Started')}
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="header-hamburger"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE MENU PANEL ═══ */}
      {mobileMenuOpen && (
        <div className="header-mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="header-mobile-panel" onClick={e => e.stopPropagation()}>
            {/* Theme & Language */}
            <div className="header-mobile-row">
              <button
                onClick={toggleTheme}
                className="header-icon-btn"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span style={{ marginLeft: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
            </div>

            <div className="header-mobile-row">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code)
                  }}
                  className={`header-mobile-lang ${language === lang.code ? 'active' : ''}`}
                >
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>

            {/* Auth buttons */}
            {view !== 'dashboard' && (
              <div className="header-mobile-auth">
                <button
                  onClick={() => { setView('login'); setMobileMenuOpen(false) }}
                  className="header-btn header-btn-ghost"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {t('login', 'Login')}
                </button>
                <button
                  onClick={() => { setView('get-started'); setMobileMenuOpen(false) }}
                  className="header-btn header-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {t('getStarted', 'Get Started')}
                </button>
              </div>
            )}

            {view === 'dashboard' && (
              <div className="header-mobile-auth">
                <button
                  onClick={() => { handleLogOut(); setMobileMenuOpen(false) }}
                  className="header-btn header-btn-danger"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <LogOut size={15} />
                  <span>{t('disconnect', 'Disconnect')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
