 /** @type {import('tailwindcss').Config} */
export default {
   content: ["./views/**/*.ejs"],
   theme: {
     extend: {
      fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
      colors: {
        'brand': {
          50: '#fef7f2',
          100: '#fdeee5',
          200: '#f9d5c0',
          300: '#f5b896',
          400: '#ef8f5e',
          500: '#ea7038',
          600: '#D73F09', // Your main brand color
          700: '#b8340a',
          800: '#942a0e',
          900: '#792412',
        }
      }
     },
   },
   plugins: [],
 }

 