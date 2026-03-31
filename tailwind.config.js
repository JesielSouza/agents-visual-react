/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        floor: '#0e0d0b',
        eng: '#4a9eff',
        ops: '#4ade80',
        qa: '#fbbf24',
        comms: '#a78bfa',
        people: '#f472b6',
        flex: '#2dd4bf',
      },
    },
  },
  plugins: [],
};
