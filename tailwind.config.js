/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Modern Industrial Palette
        neutral: {
          dark: '#0F1419',     // Primary background
          medium: '#1A1F2E',   // Elevated surfaces
          light: '#E0E2E9',    // Primary text
          secondary: '#A8ABB3', // Secondary text
          tertiary: '#7A7D87',  // Tertiary text
        },
        accent: {
          cyan: '#00D9FF',      // Primary accent
          orange: '#FF6B35',    // Warning/alerts
          green: '#00D084',     // Success
          red: '#FF3B5C',       // Danger/error
        },
        // Legacy variable-based colors (for compatibility)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "ambientPulse": {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '1.02' },
        },
        "ambientShift": {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '1.02' },
        },
        "modalSlideIn": {
          from: {
            opacity: '0',
            transform: 'translateY(-20px) scale(0.95)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        "floatOrb1": {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(20px, -20px)' },
          '50%': { transform: 'translate(0, -40px)' },
          '75%': { transform: 'translate(-20px, -20px)' },
        },
        "floatOrb2": {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-15px, 15px)' },
          '50%': { transform: 'translate(0, 30px)' },
          '75%': { transform: 'translate(15px, 15px)' },
        },
        "pickerScroll": {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(2px)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ambientPulse": "ambientPulse 6s ease-in-out infinite",
        "ambientShift": "ambientShift 8s ease-in-out infinite",
        "modalSlideIn": "modalSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "floatOrb1": "floatOrb1 20s ease-in-out infinite",
        "floatOrb2": "floatOrb2 25s ease-in-out infinite",
        "pickerScroll": "pickerScroll 400ms ease-in-out",
      },
      boxShadow: {
        'glow-cyan': '0 0 16px rgba(0, 217, 255, 0.15)',
        'glow-cyan-strong': '0 0 40px rgba(0, 217, 255, 0.2)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 217, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
