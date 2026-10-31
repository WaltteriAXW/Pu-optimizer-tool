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
  // Status colours, each a text-and-icon colour and a tint fill. Always with an icon and words.
  success: role('success'),
  'success-bg': role('success-bg'),
  warning: role('warning'),
  'warning-bg': role('warning-bg'),
  danger: role('danger'),
  'danger-bg': role('danger-bg'),
  info: role('info'),
  'info-bg': role('info-bg'),
  // Elevation surfaces, and the card edge: none in light (the shadow lifts it), 1 pt in dark
  'level-2': role('level-2'),
  'level-3': role('level-3'),
  overlay: role('overlay'),
  edge: tint('line', 'edge'),
  // The backdrop behind a sheet: 40% Charcoal Moss by day, 60% Obsidian by night
  backdrop: tint('scrim', 'scrim'),
  // Categorical chart colours, in order. Never for status.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`chart-${n}`, role(`chart-${n}`)])),
  shadow: role('shadow'),
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
      // Elevation: soft forest-tinted shadows in light, none in dark (theme.css)
      boxShadow: {
        raised: 'var(--shadow-1)', // cards, tiles
        floating: 'var(--shadow-2)', // menus, popovers, toasts
        overlay: 'var(--shadow-3)', // sheets, dialogs
      },
      // Motion: quick and purposeful. Entrances ease out, exits ease in and run faster.
      transitionDuration: {
        DEFAULT: '200ms',
        instant: '100ms', // press, toggle
        quick: '200ms', // hover, fades, small moves
        standard: '300ms', // cards, sheets, enter and exit
        slow: '450ms', // page transitions
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(.2,0,0,1)',
        enter: 'cubic-bezier(.2,0,0,1)',
        exit: 'cubic-bezier(.4,0,1,1)',
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
        fade: 'fade 200ms cubic-bezier(.2,0,0,1) forwards', // motion-quick
        'fade-in': 'fade 300ms cubic-bezier(.2,0,0,1) forwards', // motion-standard: sheets
      },
    },
  },
  plugins: [],
}
