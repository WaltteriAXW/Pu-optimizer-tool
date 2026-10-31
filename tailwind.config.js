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

const role = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

/**
 * Inter, set the way Apple sets SF: Tailwind's sizes kept, with the brand guide's tracking
 * (Inter's dynamic metrics, tighter as type grows). The variable font's optical size axis
 * gives titles the Display cut on its own.
 */
const size = (px, leading, tracking) => [`${px / 16}rem`, { lineHeight: `${leading / 16}rem`, letterSpacing: `${tracking / 1000}em` }]

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stone & Forest roles (src/theme.css). The page is canvas, cards and inputs are
        // surface, and the one main action on a view is accent with on-accent text: Deep
        // Forest with white in light, Champagne with Obsidian in dark.
        canvas: role('canvas'),
        surface: role('surface'),
        raised: role('raised'),
        accent: { DEFAULT: role('accent'), pressed: role('accent-pressed') },
        'on-accent': role('on-accent'),
        stone: themed('stone'),
        forest: themed('forest'),
        emerald: themed('emerald'),
        amber: themed('amber'),
        red: themed('red'),
        orange: themed('orange'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        xs: size(12, 16, 0), // Caption 1
        sm: size(14, 20, -6), // between Footnote and Subheadline
        base: size(16, 22, -11), // Callout; 15-17 pt is body on the web
        lg: size(18, 24, -15),
        xl: size(20, 25, -17), // Title 3
        '2xl': size(24, 30, -19),
        '3xl': size(28, 34, -21), // Title 1
        '4xl': size(34, 41, -22), // Large Title
      },
      // The guide's corner radii. They nest: inner radius = outer radius - padding.
      borderRadius: {
        field: '8px', // tags, inputs
        group: '12px', // list groups, panels inside a card
        card: '20px', // cards
        sheet: '28px', // sheets, modals
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
