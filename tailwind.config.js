/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F6F9',      // 60% Dominante - Cool Off-White
        surface: '#FFFFFF',     // 30% Secundária - Pure White Cards
        subtle: '#F1F5F9',
        borderline: '#E2E8F0',
        ink: {
          DEFAULT: '#0F172A',   // 10% Destaque - Deep Ink
          muted: '#64748B',
          light: '#1E293B'
        },
        emeraldpro: {
          DEFAULT: '#059669',   // 10% Destaque Esportivo - Pitch Emerald
          hover: '#047857',
          soft: '#D1FAE5'
        },
        amberpro: {
          DEFAULT: '#D97706',
          soft: '#FEF3C7'
        },
        dangerpro: {
          DEFAULT: '#DC2626',
          soft: '#FEE2E2'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        score: ['Rajdhani', 'sans-serif']
      }
    }
  },
  plugins: []
}