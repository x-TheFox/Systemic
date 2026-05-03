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
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Semantic tokens for direct Tailwind usage */
        base: "hsl(var(--base))",
        surface: "hsl(var(--surface))",
        elevated: "hsl(var(--elevated))",
        overlay: "hsl(var(--overlay))",
        "accent-dim": "hsl(var(--accent-dim))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        "muted-fg": "hsl(var(--muted-fg))",
        "fg-dim": "hsl(var(--foreground-dim))",
        "fg-muted": "hsl(var(--foreground-muted))",
      },
      borderRadius: {
        lg: "var(--radius-container)",
        md: "var(--radius-standard)",
        sm: "var(--radius-compact)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-up": "fade-up 0.4s var(--ease-snap) forwards",
        "scale-in": "scale-in 0.3s var(--ease-snap) forwards",
      },
      boxShadow: {
        "z-base": "var(--z-base-shadow)",
        "z-card": "var(--z-card-shadow)",
        "z-float": "var(--z-float-shadow)",
        "z-modal": "var(--z-modal-shadow)",
        glow: "0 0 24px hsl(265 85% 60% / 0.25)",
        "glow-amber": "0 0 24px hsl(38 92% 55% / 0.3)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
        smooth: "var(--ease-smooth)",
        snap: "var(--ease-snap)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
