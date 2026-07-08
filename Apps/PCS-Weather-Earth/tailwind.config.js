/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          DEFAULT: '#0b1220',
          light: '#111a2c',
          border: '#1e293b',
        },
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#0ea5e9',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(56, 189, 248, 0.08), 0 8px 32px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
