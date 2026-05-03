import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
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
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        /* Custom Systemics accent colors */
        sys: {
          base: 'var(--color-base)',
          surface: 'var(--color-surface)',
          elevated: 'var(--color-elevated)',
          overlay: 'var(--color-overlay)',
          float: 'var(--color-float)',
          coral: 'var(--color-accent-primary)',
          violet: 'var(--color-accent-secondary)',
          cyan: 'var(--color-accent-tertiary)',
          gold: 'var(--color-accent-achievement)',
          emerald: 'var(--color-accent-success)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        compact: "var(--radius-compact)",
        standard: "var(--radius-standard)",
        container: "var(--radius-container)",
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shimmer-sweep": {
          "0%": { left: "-100%" },
          "50%": { left: "100%" },
          "100%": { left: "100%" },
        },
        "energy-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.005)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "edge-flow": {
          from: { strokeDashoffset: "20" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer-sweep": "shimmer-sweep 3s ease-in-out infinite",
        "energy-shimmer": "energy-shimmer 1.5s ease-in-out infinite",
        "breathe": "breathe 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "edge-flow": "edge-flow 1.5s linear infinite",
      },
      boxShadow: {
        'glow-coral': '0 0 24px rgba(255, 97, 84, 0.25), 0 0 48px rgba(255, 97, 84, 0.1)',
        'glow-violet': '0 0 24px rgba(168, 85, 247, 0.25), 0 0 48px rgba(168, 85, 247, 0.1)',
        'glow-gold': '0 0 24px rgba(251, 191, 36, 0.25), 0 0 48px rgba(251, 191, 36, 0.1)',
        'glow-cyan': '0 0 24px rgba(34, 211, 238, 0.25), 0 0 48px rgba(34, 211, 238, 0.1)',
        'glow-emerald': '0 0 24px rgba(52, 211, 153, 0.25), 0 0 48px rgba(52, 211, 153, 0.1)',
        'card': '0 4px 32px -8px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 48px -12px rgba(0, 0, 0, 0.5)',
        'float': '0 8px 48px -12px rgba(0, 0, 0, 0.5)',
        'modal': '0 16px 64px -16px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
