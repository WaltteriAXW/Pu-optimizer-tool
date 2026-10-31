/**
 * Colours: the Stone & Forest roles only (src/theme.css). This replaces Tailwind's palette
 * rather than extending it, so a class such as bg-gray-100 or text-amber-600 produces nothing:
 * only the brand guide's colours can reach the screen.
 */
const role = (name) => `rgb(var(--c-${name}) / <alpha-value>)`
/** A role at the opacity its tint takes in the current appearance (--a-* in theme.css) */
const tint = (name, alpha) => `rgb(var(--c-${name}) / var(--a-${alpha}))`

const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  inherit: 'inherit',
  canvas: role('canvas'),
  surface: role('surface'),
  raised: role('raised'),
  track: role('track'),
  // The one main action on a view: Deep Forest with white in light, Champagne with Obsidian
  // in dark
  accent: role('accent'),
  'on-accent': role('on-accent'),
  highlight: role('highlight'),
  'accent-secondary': role('accent-secondary'),
  band: role('band'),
  muted: role('muted'),
  line: role('line'),
  'line-strong': role('line-strong'),
  ink: role('ink'),
  'ink-2': role('ink-2'),
  danger: role('danger'),
  'danger-soft': tint('danger', 'danger-soft'),
  'danger-line': tint('danger', 'danger-line'),
  warn: role('warn'),
  'warn-ink': role('warn-ink'),
  'warn-soft': tint('warn', 'warn-soft'),
  'warn-line': tint('warn', 'warn-line'),
  scrim: role('scrim'),
  knob: role('knob'),
}

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
    colors,
    extend: {
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
