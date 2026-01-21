/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#312e81',
          dark: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
};