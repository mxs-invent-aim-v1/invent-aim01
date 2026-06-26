/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        surface: {
          900: '#000000', // Black Background
          800: '#0a0a0a', // Sidebar and slightly elevated backgrounds
          700: '#171717', // Inputs
          600: '#262626', 
          500: '#737373', // Muted text
          400: '#a3a3a3', // Lighter text
          300: '#d4d4d4', // Bright text
          200: '#262626', // Borders
          100: '#171717', // Hover backgrounds
          50: '#ffffff', // White text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #052e16 0%, #000000 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 10px rgba(22,163,74,0.3)' }, '50%': { boxShadow: '0 0 30px rgba(22,163,74,0.7)' } },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(22,163,74,0.4)',
        'glow-sm': '0 0 10px rgba(22,163,74,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
