import { useRef, useEffect } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'
import Footer from '../layout/Footer'

import videoFarm from '../../assets/Animated_cartoon_farm_illustration_202605251121 (1).mp4'
import videoSatellite from '../../assets/Farmer_scanning_crop_plant_202605251829.mp4'
import videoTractor from '../../assets/Tractor_ploughing_soil_animation_202605251833.mp4'
import videoHarvest from '../../assets/real harvest.mp4'

export default function HeroSection() {
  const { setView, language, activeHeroSection, setActiveHeroSection } = useFarmvestStore()
  const containerRef = useRef(null)

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  const scrollToSection = (index) =>
    document.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const sections = container.querySelectorAll('[data-index]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActiveHeroSection(Number(entry.target.dataset.index))
        })
      },
      { root: container, threshold: 0.5 }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [setActiveHeroSection])

  // Feature sections — satellite → tractor (plough) → harvest
  const features = [
    {
      id: 'hero-satellite',
      video: videoSatellite,
      accent: '#4ade80',
      tag: 'AI Vision',
      title: 'AI Disease Detection',
      subtitle: 'Smart crop protection powered by artificial intelligence. Upload or scan plant images to receive accurate disease detection, instant recommendations, treatment insights, and preventive measures for healthier crop growth.',
      stat: '99.7%',
      statLabel: 'Accuracy',
      flip: false,
    },
    {
      id: 'hero-tractor',
      video: videoTractor,
      accent: '#fde047',
      tag: 'Smart Cultivation',
      title: 'Soil Condition Analysis',
      subtitle: 'Transform traditional farming with intelligent soil monitoring, real-time environmental insights, nutrient tracking, and AI-driven recommendations designed to maximize crop performance and long-term soil sustainability.',
      stat: '3.8×',
      statLabel: 'Field Efficiency',
      flip: true,
    },
    {
      id: 'hero-harvest',
      video: videoHarvest,
      accent: '#60a5fa',
      tag: 'Marketplace Intelligence',
      title: 'Market Analyzer',
      subtitle: 'Explore nearby markets, monitor real-time crop prices, analyze demand fluctuations, and access intelligent market insights designed to help farmers maximize revenue and optimize agricultural trade.',
      stat: '4.2×',
      statLabel: 'Profit Margin',
      flip: false,
    },
  ]

  return (
    <div className="scroll3d-container" ref={containerRef}>

      {/* ── SLIDE 0: Fullscreen Hero Video + Text ── */}
      <section className="snap-section hero-section" data-index={0} id="hero-main">
        <div className="hero-video-bg">
          <video autoPlay muted loop playsInline className="hero-video-el">
            <source src={videoFarm} type="video/mp4" />
          </video>
          <div className="hero-video-overlay" />
        </div>
        <div className="hero-text-wrap">
          <p className="hero-eyebrow">{t('aiPoweredFarming', 'AI-Powered Precision Farming')}</p>
          <h1 className="hero-title">Krishi<span className="hero-title-accent"> AI</span></h1>
          <p className="hero-subtitle">
            {t('connectGrid', 'Smart farming powered by artificial intelligence. Connect your farming grid to satellite telemetry streams.')}
          </p>
          <div className="hero-cta-row">
            <button className="hero-btn-primary" onClick={() => setView('get-started')}>
              {t('getStarted', 'Get Started')} →
            </button>
          </div>
        </div>
        <div className="hero-scroll-cue">
          <span>Scroll to explore</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── SLIDES 1–3: Feature Card Pairs ── */}
      {features.map((f, idx) => (
        <section
          key={f.id}
          className={`snap-section feature-section ${f.flip ? 'feature-flipped' : ''}`}
          data-index={idx + 1}
          id={f.id}
        >
          {/* Text Card */}
          <div className="feat-card feat-card-info">
            <span className="feat-tag" style={{ color: f.accent, borderColor: `${f.accent}40` }}>
              <span className="feat-tag-dot" style={{ background: f.accent }} />
              {f.tag}
            </span>
            <h2 className="feat-title" style={{ '--accent': f.accent }}>{f.title}</h2>
            <p className="feat-subtitle">{f.subtitle}</p>
            <div className="feat-divider" style={{ background: `${f.accent}30` }} />
            <div className="feat-stat">
              <span className="feat-stat-num" style={{ color: f.accent }}>{f.stat}</span>
              <span className="feat-stat-label">{f.statLabel}</span>
            </div>
          </div>

          {/* Video Card */}
          <div className="feat-card feat-card-video" style={{ '--accent': f.accent }}>
            <video autoPlay muted loop playsInline className="feat-video-el">
              <source src={f.video} type="video/mp4" />
            </video>
            <div className="feat-card-video-overlay" style={{ '--accent': f.accent }} />
          </div>
        </section>
      ))}

      {/* ── SLIDE 4: Footer ── */}
      <section className="snap-section footer-section" data-index={4} id="section-footer">
        <Footer />
      </section>
    </div>
  )
}
