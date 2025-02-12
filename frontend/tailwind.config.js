/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          blue: {
            50: '#f0f5ff',
            100: '#e0eaff',
            200: '#c7d9ff',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
          },
          indigo: {
            50: '#eef2ff',
            100: '#e0e7ff',
            200: '#c7d2fe',
            600: '#4f46e5',
            700: '#4338ca',
            800: '#3730a3',
          },
          emerald: {
            50: '#ecfdf5',
            100: '#d1fae5',
            600: '#059669',
            700: '#047857',
          },
        },
        boxShadow: {
          'inner-lg': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        },
        transitionProperty: {
          'height': 'height',
          'spacing': 'margin, padding',
        },
        animation: {
          'gradient-x': 'gradient-x 15s ease infinite',
        },
        keyframes: {
          'gradient-x': {
            '0%, 100%': {
              'background-size': '200% 200%',
              'background-position': 'left center'
            },
            '50%': {
              'background-size': '200% 200%',
              'background-position': 'right center'
            },
          },
        },
      },
    },
    plugins: [],
  }
