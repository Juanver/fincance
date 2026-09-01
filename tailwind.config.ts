import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d8eaff',
          500: '#4f8cff',
          600: '#3f79e6'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
