/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Nueva paleta v2.0 — Cian Dark-First
        background: '#0A0B10',
        surface: '#14161F',
        'surface-elevated': '#1C1E2A',
        'surface-highlight': '#252836',
        primary: {
          DEFAULT: '#00D4FF',
          light: '#33DDFF',
          dark: '#00A8CC',
        },
        accent: '#7B61FF',
        text: {
          DEFAULT: '#FFFFFF',
          secondary: '#9AA3B2',
          muted: '#5A616D',
        },
        border: {
          DEFAULT: '#252836',
          light: '#2E2E42',
        },
        semantic: {
          success: '#00FF88',
          error: '#FF4D6D',
          warning: '#FFD740',
          info: '#7B61FF',
        },
        // Legacy brand colors (mantenidos para compatibilidad)
        brand: {
          50: '#f5f0ff',
          100: '#ede0ff',
          200: '#dec7ff',
          300: '#c69aff',
          400: '#aa5fff',
          500: '#8636f4',
          600: '#7c22e6',
          700: '#6a12ca',
          800: '#5711a5',
          900: '#4a1087',
        },
        ink: {
          50: '#f7f7f9',
          100: '#ececf0',
          200: '#d5d5de',
          300: '#b0b0c0',
          400: '#85859c',
          500: '#66667e',
          600: '#525268',
          700: '#434456',
          800: '#3a3a49',
          900: '#1f1f2c',
          950: '#12121a',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};
