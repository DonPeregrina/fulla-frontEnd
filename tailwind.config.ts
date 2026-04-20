import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fulla design system
        fulla: {
          gold:   '#F0C030',
          dark:   '#2D2440',
          muted:  '#B0A8CC',
          light:  '#EDE9F8',
          border: '#DDD5EE',
          green:  '#10b981',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
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
