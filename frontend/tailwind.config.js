// Updated 2025-12-09 16:45 CST by ChatGPT
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'royal-purple': 'var(--color-primary)',
        'royal-purple-dark': 'var(--color-primary-dark)',
        'deep-indigo': 'var(--color-secondary)',
        aqua: 'var(--color-accent)',
        'surface-1': 'var(--bg-primary)',
        'surface-2': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border-color)',
      },
      backdropBlur: {
        glass: '24px',
      },
      fontFamily: {
        sans: ['var(--font-family)'],
      },
      boxShadow: {
        glass: 'var(--shadow-lg)',
      },
      borderRadius: {
        lg: 'var(--border-radius-lg)',
        md: 'var(--border-radius)',
      },
    },
  },
  plugins: [],
}
