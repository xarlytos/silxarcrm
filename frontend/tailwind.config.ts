import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        expo: {
          black: '#000000',
          near: '#1c2024',
          white: '#ffffff',
          cloud: '#f0f0f3',
          slate: '#60646c',
          mid: '#555860',
          silver: '#b0b4ba',
          pewter: '#999999',
          dark: '#363a3f',
          charcoal: '#333333',
          cobalt: '#0d74ce',
          amber: '#ab6400',
          rose: '#eb8e90',
          border: '#e0e1e6',
          input: '#d9d9e0',
          banner: '#171717',
          widget: '#1a1a1a',
          purple: '#8145b5',
          sky: '#47c2ff',
          legal: '#476cff',
          focus: '#2547d0',
        },
      },
      borderRadius: {
        'subtle': '6px',
        'comfortable': '8px',
        'generous': '16px',
        'very': '24px',
        'high': '36px',
        'pill': '9999px',
      },
      boxShadow: {
        'whisper': 'rgba(0,0,0,0.08) 0px 3px 6px, rgba(0,0,0,0.07) 0px 2px 4px',
        'elevated': 'rgba(0,0,0,0.1) 0px 10px 20px, rgba(0,0,0,0.05) 0px 3px 6px',
      },
      fontFamily: {
        inter: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        'display': '-3px',
        'heading': '-1.6px',
        'sub': '-0.25px',
      },
    },
  },
  plugins: [],
};
export default config;
