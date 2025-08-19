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
        '2xl': '1400px',
      },
      aspectRatio: {
        'square': '1 / 1',
      },
    },
  },
  plugins: [],
}
