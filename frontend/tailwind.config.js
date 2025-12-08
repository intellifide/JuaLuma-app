// Updated 2025-12-07 21:15 CST by ChatGPT
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'royal-purple': '#6B46C1',
        'deep-indigo': '#4C1D95',
        aqua: '#06B6D4',
      },
      backdropBlur: {
        glass: '24px',
      },
    },
  },
  plugins: [],
}
