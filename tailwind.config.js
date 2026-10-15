/**
 * Colour families the app uses, resolved through CSS variables in src/theme.css so each class
 * has a light, dark and Increase Contrast value. <alpha-value> keeps opacity modifiers such
 * as bg-slate-50/50 working.
 */
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const themed = (family) =>
  Object.fromEntries(
    SHADES.map((shade) => [shade, `rgb(var(--c-${family}-${shade}) / <alpha-value>)`])
  )

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The card and input background: white in light, a raised blue-grey in dark
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        slate: themed('slate'),
        indigo: themed('indigo'),
        emerald: themed('emerald'),
        amber: themed('amber'),
        red: themed('red'),
        orange: themed('orange'),
      },
      keyframes: {
        // Results arrive with a short fade. They used to slide up over half a second on every
        // run, which is a lot of motion for the most frequent thing anyone does here.
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        spin: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fade: 'fade 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
