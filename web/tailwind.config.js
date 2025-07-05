/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        'iina': {
          'bg': '#1a1a1a',
          'surface': '#2d2d2d',
          'surface-light': '#3a3a3a',
          'primary': '#007AFF',
          'secondary': '#5856D6',
          'text': '#ffffff',
          'text-muted': '#a0a0a0',
        }
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      }
    },
  },
  plugins: [],
} 