import { useEffect } from 'react'

/**
 * useScrollReveal — Attaches an IntersectionObserver to all elements
 * matching `selector` and adds the `revealed` class when they enter the viewport.
 *
 * Usage: call once in any top-level component (e.g. LandingPage).
 * Elements must already have the `scroll-reveal`, `scroll-reveal-left`, or
 * `scroll-reveal-right` class to opt in.
 */
export function useScrollReveal(selector = '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right') {
  useEffect(() => {
    const elements = document.querySelectorAll(selector)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target) // fire once
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [selector])
}
