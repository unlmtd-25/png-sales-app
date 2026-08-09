import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wharf: {
          50: '#eef4f3',
          100: '#d7e6e4',
          200: '#a9c9c5',
          300: '#7aaba5',
          400: '#4c8d85',
          500: '#2c6f67',
          600: '#0f4c4a',
          700: '#0c3d3b',
          800: '#092e2c',
          900: '#061f1e',
        },
        cargo: {
          50: '#fdf3e9',
          100: '#f9e0c4',
          200: '#f0c088',
          300: '#e29e52',
          400: '#c9752b',
          500: '#ad5f1f',
          600: '#8c4a18',
        },
        alert: {
          500: '#b3452c',
          600: '#8f3722',
        },
        paper: '#f5f2ea',
        ink: '#1a1f1e',
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
export default config;
