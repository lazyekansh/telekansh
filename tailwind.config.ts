import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: '#17212b',
          sidebar: '#0e1621',
          panel: '#242f3d',
          border: '#2b3c50',
          accent: '#5288c1',
          tx: '#d1d5db',
          tx2: '#7e8fa3',
          'msg-out': '#2b5278',
          'msg-in': '#182533',
          hover: '#202d3b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
