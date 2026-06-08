import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Theme-driven semantic colors. Each maps to a CSS variable that flips
      // between the light (Jabster) and dark palettes, while `<alpha-value>`
      // keeps Tailwind's opacity modifiers (e.g. text-ink/60) working. "ink" is
      // the foreground color — it replaces the hardcoded white the dark theme
      // was built on, so every translucent layer adapts automatically.
      colors: {
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        gold: "rgb(var(--gold-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
