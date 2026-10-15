import { useEffect, useState } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Dark as the page is showing it: the Settings choice if there is one, else the device. */
function isDarkNow(): boolean {
  if (typeof document === 'undefined') return false
  const chosen = document.documentElement.getAttribute('data-theme')
  if (chosen === 'dark') return true
  if (chosen === 'light') return false
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

/**
 * Whether the page is in dark appearance, following changes live — from the device, or
 * from the choice in Settings.
 *
 * Almost every colour switches through CSS variables (src/theme.css). This is for the few
 * places that need a colour as a value rather than a class — the chart's SVG, which the PDF
 * export rasterises on its own, where a class or a CSS variable would not survive.
 */
export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(isDarkNow)

  useEffect(() => {
    const update = () => setDark(isDarkNow())
    const query = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
    query?.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      query?.removeEventListener('change', update)
      observer.disconnect()
    }
  }, [])

  return dark
}
