/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0A1628',
        surface: '#0F2238',
        subtle: '#162E4A',
        borderline: '#1F3F63',
        night: '#050D18',
        gold: { DEFAULT: '#FBBF24', deep: '#B45309' },
        ink: {
          DEFAULT: '#F1F5F9',
          muted: '#8FA3BF',
          light: '#CBD5E1'
        },
        emeraldpro: {
          DEFAULT: '#22C55E',
          hover: '#4ADE80',
          soft: 'rgba(34,197,94,0.16)'
        },
        amberpro: {
          DEFAULT: '#FBBF24',
          soft: 'rgba(251,191,36,0.16)'
        },
        dangerpro: {
          DEFAULT: '#F87171',
          soft: 'rgba(248,113,113,0.16)'
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