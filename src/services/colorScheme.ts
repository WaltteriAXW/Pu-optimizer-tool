import { useEffect, useState } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Whether the system is in dark appearance, following changes live.
 *
 * Almost every colour switches through CSS variables (src/theme.css). This is for the few
 * places that need a colour as a value rather than a class — the chart's SVG, which the PDF
 * export rasterises on its own, where a class or a CSS variable would not survive.
 */
export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY).matches
      : false
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return dark
}
