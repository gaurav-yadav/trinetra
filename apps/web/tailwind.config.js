/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Status colors
        status: {
          running: '#22c55e',
          idle: '#6b7280',
          error: '#ef4444',
          exited: '#eab308',
        },
        // Phase colors
        phase: {
          building: '#3b82f6',
          testing: '#a855f7',
          coding: '#06b6d4',
          idle: '#6b7280',
          waiting: '#eab308',
          error: '#ef4444',
        },
        // Terminal theme
        terminal: {
          bg: '#1a1b26',
          text: '#a9b1d6',
          border: '#3b4261',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
