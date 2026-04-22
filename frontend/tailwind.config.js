/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0A2540',
          secondary: '#1E90FF',
          accent: '#00CFFF',
          highlight: '#7FFFD4',
          bg: '#020C1B',
          text: '#E6F1FF',
        },
        ocean: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bcdfff',
          300: '#8eccff',
          400: '#58b0ff',
          500: '#3291ff',
          600: '#1b72f5',
          700: '#145ce1',
          800: '#174ab6',
          900: '#19418f',
          950: '#0a1628',
        },
        danger: {
          50: '#fff1f1',
          400: '#ff4d4d',
          500: '#ff2d2d',
          600: '#e60000',
        },
        warning: {
          50: '#fffbeb',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        success: {
          50: '#ecfdf5',
          400: '#34d399',
          500: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(50, 145, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(50, 145, 255, 0.8)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
