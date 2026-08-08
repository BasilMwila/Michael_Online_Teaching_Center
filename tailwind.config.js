/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4fa',
          100: '#d9e6f4',
          200: '#b3cde9',
          300: '#84acd8',
          400: '#4f83c2',
          500: '#2b62a9',
          600: '#1a4a8a',
          700: '#12386c',
          800: '#0a2a52',
          900: '#001d3d',
          950: '#001328'
        },
        accent: {
          50: '#faf6e9',
          100: '#f3ead0',
          200: '#e8d9a4',
          300: '#dcc372',
          400: '#d1b14e',
          500: '#c6a136',
          600: '#a5842a',
          700: '#836822'
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          400: '#94a3b8',
          600: '#475569',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'mesh-dark': "radial-gradient(at 18% 22%, rgba(26,74,138,0.45) 0px, transparent 50%), radial-gradient(at 82% 18%, rgba(198,161,54,0.16) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(18,56,108,0.55) 0px, transparent 55%)",
        'grid-light': "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)"
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.08)',
        'lift': '0 10px 40px -12px rgba(0,29,61,0.28)',
        'glow': '0 0 0 1px rgba(198,161,54,0.2), 0 12px 40px -8px rgba(198,161,54,0.35)'
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }
      }
    }
  },
  plugins: []
};
