import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

export default function Footer() {
  const { language } = useFarmvestStore()
  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  return (
    <footer className="footer-modern">
      <div className="footer-body">
        <div className="footer-bottom-bar">
          <p className="footer-copy">{t('footerCopy', '© 2026 Krishi AI Inc. All rights reserved.')}</p>
          <div className="footer-bottom-links">
            <p className="footer-credit">{t('footerCredit', 'Made By Karthik K B')}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
