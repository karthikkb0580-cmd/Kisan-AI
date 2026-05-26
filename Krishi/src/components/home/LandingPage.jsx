import { useScrollReveal } from '../../hooks/useScrollReveal'
import HeroSection from './HeroSection'

/**
 * LandingPage — composes the public landing experience and wires the
 * global scroll-reveal observer for all scroll-reveal-* elements.
 */
export default function LandingPage() {
  // Global scroll reveal for all opt-in elements
  useScrollReveal()

  return (
    <main id="landing-page">
      <HeroSection />
    </main>
  )
}
