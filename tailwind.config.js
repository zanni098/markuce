/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Markuce design system — light premium fintech
        bg: {
          base:    '#F4F2EC',
          surface: '#FBFAF6',
          card:    '#FFFFFF',
          hover:   '#EFEDE6',
        },
        border: {
          DEFAULT: '#E4E1D8',
          subtle:  '#EDEBE4',
          bright:  '#D2CEC2',
        },
        primary: {
          DEFAULT: '#15140F',
          50:  '#F4F2EC',
          100: '#E7E5DD',
          400: '#45443E',
          500: '#15140F',
          600: '#000000',
          700: '#000000',
          glow: 'rgba(21,20,15,0.10)',
        },
        accent: {
          DEFAULT: '#0E7A5F',
          dark:    '#0A5C49',
          glow:    'rgba(14,122,95,0.14)',
        },
        ink: {
          DEFAULT: '#15140F',
          muted:   '#6E6D63',
          faint:   '#9C9A8E',
        },
        success: '#0E7A5F',
        warning: '#9A6B2F',
        danger:  '#C0392B',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Schibsted Grotesk', 'Inter', 'sans-serif'],
        serif:   ['Instrument Serif', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'glow-primary': '0 1px 2px rgba(21,20,15,0.05), 0 12px 28px -16px rgba(21,20,15,0.20)',
        'glow-accent':  '0 1px 2px rgba(14,122,95,0.10), 0 12px 28px -16px rgba(14,122,95,0.40)',
        'card':         '0 1px 2px rgba(21,20,15,0.04), 0 10px 30px -18px rgba(21,20,15,0.18)',
      },
      backgroundImage: {
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0h1v40H0zM40 0h1v40h-1zM0 0v1h40V0zM0 40v1h40v-1z' fill='rgba(21,20,15,0.05)'/%3E%3C/svg%3E\")",
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14,122,95,0.10), transparent)',
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
