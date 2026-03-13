import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'surface-0': '#fafaf9',
        'surface-1': '#f5f5f4',
        'surface-2': '#e7e5e4',
        'surface-3': '#d6d3d1',
        'ink-0': '#0c0a09',
        'ink-1': '#292524',
        'ink-2': '#57534e',
        'ink-3': '#a8a29e',
        accent: '#2563eb',
        'accent-muted': '#93c5fd',
        'node-wikipedia': '#f59e0b',
        'node-dictionary': '#8b5cf6',
        'node-image': '#ec4899',
        'node-user': '#10b981',
        'node-wikidata': '#06b6d4',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'node-appear': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'node-appear': 'node-appear 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
