/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#f8fafc',
          panel: '#ffffff',
          card: '#ffffff',
          cardHover: '#f1f5f9',
          border: '#e2e8f0',
          borderLight: '#cbd5e1',
          text: '#0f172a',
          muted: '#64748b',
          subtle: '#94a3b8',
        },
        risk: {
          low: '#10b981',       // Emerald (0-20)
          moderate: '#3b82f6',  // Blue (21-40)
          high: '#f59e0b',      // Amber (41-60)
          veryHigh: '#f97316',  // Orange (61-80)
          extreme: '#ef4444',   // Red (81-100)
          ai: '#8b5cf6',        // Purple for explainability
          solar: '#eab308',     // Solar radiation
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
