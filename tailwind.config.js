/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          rose: {
            50: '#fff1f5',
            100: '#ffe0e9',
            200: '#ffc0d0',
            400: '#f87096',
            600: '#e03060',
            800: '#8b1a36',
          },
          blush: {
            50: '#fef6f8',
            100: '#fce8ee',
            200: '#f9d0db',
            400: '#f0a0b8',
            600: '#c96080',
            800: '#7a2040',
          },
          cream: {
            50: '#fffaf7',
            100: '#fff3ec',
            200: '#ffe8d6',
            400: '#f5c89a',
            600: '#c89060',
            800: '#7a4820',
          },
          gold: {
            50: '#fffdf0',
            100: '#fdf5c0',
            200: '#fae880',
            400: '#f0c840',
            600: '#c09010',
            800: '#7a5800',
          },
          nude: {
            50: '#fdf8f5',
            100: '#f5ece5',
            200: '#ead8cc',
            400: '#d0b09a',
            600: '#a07856',
            800: '#5c3820',
          },
        },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "'Playfair Display'", 'Georgia', 'serif'],
        body: ["'DM Sans'", "'Plus Jakarta Sans'", 'system-ui', 'sans-serif'],
        mono: ["'DM Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
};