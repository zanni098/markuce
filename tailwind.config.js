/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Markuce design system
        bg: {
          base:    '#080B14',
          surface: '#0E1528',
          card:    '#131D35',
          hover:   '#182240',
        },
        border: {
          DEFAULT: '#1C2B4A',
          subtle:  '#142038',
          bright:  '#2A3F6A',
        },
        primary: {
          DEFAULT: '#5865F2',
          50:  '#EEF0FE',
          100: '#DDE1FD',
          400: '#8B96F8',
          500: '#5865F2',
          600: '#3B4AEF',
          700: '#2234E8',
          glow: 'rgba(88,101,242,0.15)',
        },
        accent: {
          DEFAULT: '#00C9A7',
          dark:    '#009E84',
          glow:    'rgba(0,201,167,0.15)',
        },
        ink: {
          DEFAULT: '#E8EDF5',
          muted:   '#6B7FA3',
          faint:   '#3D5278',
        },
        success: '#00C9A7',
        warning: '#F59E0B',
        danger:  '#F43F5E',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'glow-primary': '0 0 30px rgba(88,101,242,0.25)',
        'glow-accent':  '0 0 30px rgba(0,201,167,0.20)',
        'card':         '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(28,43,74,0.6)',
      },
      backgroundImage: {
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0h1v40H0zM40 0h1v40h-1zM0 0v1h40V0zM0 40v1h40v-1z' fill='rgba(28,43,74,0.4)'/%3E%3C/svg%3E\")",
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(88,101,242,0.12), transparent)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [],
}
