/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kan: {
          navy:    '#1a2e4a',
          blue:    '#2563a8',
          cyan:    '#38bcd4',
          light:   '#e8f4f8',
          pastel: {
            morning:  '#bfdbfe', // blue-200
            middle:   '#ddd6fe', // violet-200
            evening:  '#c7d2fe', // indigo-200
            samples:  '#e9d5ff', // purple-200
            weekend:  '#a5f3fc', // cyan-200
            low:      '#e5e7eb', // gray-200  (desaturated)
            forced:   '#fecaca', // red-200
            custom:   '#fed7aa', // orange-200
          },
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
