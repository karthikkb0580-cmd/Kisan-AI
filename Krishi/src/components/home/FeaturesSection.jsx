import { useEffect } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

/**
 * FeaturesSection — Compact stats/info section below the 3D scroll hero.
 * All video content has been moved into the immersive hero scroll experience.
 */
export default function FeaturesSection() {
  const { language } = useFarmvestStore()

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // Feature-row slide-in
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible')
        }),
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('.feature-stat-card').forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [])

  const stats = [
    { value: '98%', label: t('statCropAccuracy', 'Crop Accuracy'), icon: '🛰️', color: '#22C55E' },
    { value: '45K+', label: t('statActiveFarmers', 'Active Farmers'), icon: '🌾', color: '#3B82F6' },
    { value: '2.1M', label: t('statAcresMonitored', 'Acres Monitored'), icon: '📡', color: '#F59E0B' },
    { value: '35%', label: t('statWaterSaved', 'Water Saved'), icon: '💧', color: '#06B6D4' },
  ]

  const capabilities = [
    {
      icon: '🔬',
      title: t('capAiCropTitle', 'AI Crop Analysis'),
      desc: t('capAiCropDesc', 'PlantVillage MobileNetV2 ML model identifies 38 disease classes across 14 crops — leaves, fruits, and vegetables — with Gemini AI providing detailed treatment plans.'),
      gradient: 'linear-gradient(135deg, #22C55E, #059669)'
    },
    {
      icon: '🌐',
      title: t('capSatelliteTitle', 'Satellite Integration'),
      desc: t('capSatelliteDesc', 'Real-time orbital data streams deliver sub-meter resolution imagery for monitoring thousands of hectares simultaneously.'),
      gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
    },
    {
      icon: '⚡',
      title: t('capIrrigationTitle', 'Smart Irrigation'),
      desc: t('capIrrigationDesc', 'IoT-connected drip systems respond to moisture sensors in real time, reducing water waste by up to 40%.'),
      gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)'
    },
    {
      icon: '🔋',
      title: t('capEnergyTitle', 'Green Energy Grid'),
      desc: t('capEnergyDesc', 'Solar-tracking panels and wind turbines power all field operations with zero-emission renewable energy.'),
      gradient: 'linear-gradient(135deg, #F59E0B, #D97706)'
    },
  ]

  return (
    <section className="features-section-v2" id="features">
      {/* Section header */}
      <div className="features-header scroll-reveal">
        <span className="features-eyebrow">{t('poweredByIntelligence', 'Powered by Intelligence')}</span>
        <h2 className="features-heading">{t('agritechTitle', 'AgriTech Intel Systems')}</h2>
        <p className="features-subheading">
          {t('agritechSub', 'Next-generation precision farming infrastructure combining orbital telemetry, AI crop analysis, and renewable energy microgrids.')}
        </p>
      </div>

      {/* Stats bar */}
      <div className="features-stats-bar">
        {stats.map((s) => (
          <div key={s.label} className="feature-stat-card">
            <span className="feature-stat-icon">{s.icon}</span>
            <span className="feature-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="feature-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Capability cards grid */}
      <div className="features-capabilities-grid">
        {capabilities.map((cap) => (
          <div key={cap.title} className="feature-capability-card feature-stat-card">
            <div className="capability-icon-wrap" style={{ background: cap.gradient }}>
              <span>{cap.icon}</span>
            </div>
            <h3>{cap.title}</h3>
            <p>{cap.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
