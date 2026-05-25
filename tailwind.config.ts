import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#2563EB',
      },
      keyframes: {
        scanLine: {
          '0%':   { top: '8px' },
          '50%':  { top: 'calc(100% - 8px)' },
          '100%': { top: '8px' },
        },
      },
      animation: {
        'scan-line': 'scanLine 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
