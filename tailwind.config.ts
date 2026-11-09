import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // mnestics identity
        mn: {
          plum:     '#1A1535',
          sky:      '#5588AA',
          skyLight: '#AADDFF',
          gold:     '#F0C030',
          bg:       '#EDE9F8',
          border:   '#DDD5EE',
        },
      },
      fontFamily: {
        sans: ['"Space Mono"', 'monospace'],
        mono: ['"Space Mono"', 'monospace'],
      },
      keyframes: {
        push: { '50%': { transform: 'translateX(7px)' } },
        slide: { '50%': { transform: 'translateX(5px) rotate(5deg)' } },
      },
      animation: {
        push: 'push 1.8s ease-in-out infinite',
        slide: 'slide 1.8s ease-in-out infinite',
      },
      screens: {
        // Mobile-first breakpoints
        xs: '390px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
      },
    },
  },
  plugins: [],
} satisfies Config
