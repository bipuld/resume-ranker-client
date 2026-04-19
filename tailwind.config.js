/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172a',
          900: '#0f172a',
        },
        cyan: {
          400: '#06b6d4',
          500: '#0891b2',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1), inset 1px 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-lg': '0 16px 48px rgba(6, 182, 212, 0.2), inset 1px 1px 0 rgba(255, 255, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
