import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

/**
 * Footer — Premium modern footer with glassmorphism, gradient accents,
 * and smooth reveal animations.
 */
export default function Footer() {
  const { language } = useFarmvestStore()
  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="footer-modern">
      {/* Top wave divider */}
      <div className="footer-wave">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path
            d="M0,80 C240,20 480,100 720,60 C960,20 1200,90 1440,50 L1440,120 L0,120 Z"
            fill="url(#waveGrad)"
            opacity="0.15"
          />
          <path
            d="M0,90 C360,40 720,110 1080,50 C1260,30 1380,70 1440,60 L1440,120 L0,120 Z"
            fill="var(--footer-bg)"
          />
        </svg>
      </div>

      <div className="footer-body">
        <div className="footer-content-grid">
          {/* Brand Column */}
          <div className="footer-col footer-col-brand scroll-reveal">
            <div className="footer-brand-row">
              <div className="footer-brand-icon">
                <span>K</span>
              </div>
              <h3 className="footer-brand-name">Krishi AI</h3>
            </div>
            <p className="footer-brand-desc">
              Precision agriculture powered by orbital telemetry, AI-driven crop
              analysis, and renewable energy microgrids. Grow smarter, farm better.
            </p>
            <div className="footer-social-row">
              {[
                { name: 'Twitter', icon: '𝕏' },
                { name: 'LinkedIn', icon: 'in' },
                { name: 'GitHub', icon: '◖' },
                { name: 'Telegram', icon: '✈' }
              ].map((s) => (
                <a key={s.name} href="#" className="footer-social-link" aria-label={s.name} title={s.name}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col scroll-reveal delay-100">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-link-list">
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('hero-main') }}>Home</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>Features</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('hero-satellite') }}>Crop Telemetry</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('hero-tractor') }}>Energy Grid</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="footer-col scroll-reveal delay-200">
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-link-list">
              <li><a href="#">Documentation</a></li>
              <li><a href="#">API Reference</a></li>
              <li><a href="#">Community</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-col footer-col-newsletter scroll-reveal delay-300">
            <h4 className="footer-col-title">Stay Updated</h4>
            <p className="footer-newsletter-desc">
              Get quarterly reports on precision farming innovations and platform updates.
            </p>
            <div className="footer-subscribe-row">
              <input
                type="email"
                placeholder="your@email.com"
                aria-label="Email address"
                className="footer-subscribe-input"
              />
              <button type="submit" className="footer-subscribe-btn" aria-label="Subscribe">
                →
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom-bar">
          <p>© 2026 Krishi AI Inc. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <span className="footer-dot">·</span>
            <a href="#">Terms</a>
            <span className="footer-dot">·</span>
            <a href="#">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
