import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* ── Cafe palette direct access ── */
        coral: {
          DEFAULT: '#A67C52',
          hover: '#8C6843',
          soft: '#E8DCC8',
          foreground: '#F5EFE6',
        },
        cafe: {
          bg: '#D8C3A5',
          surface: '#F5EFE6',
          'surface-2': '#E8DCC8',
          border: '#C4AA86',
          text: '#3A2A1E',
          'text-muted': '#7A624A',
        },
        /* ── Status colors ── */
        paid: { DEFAULT: '#2E9E5B', bg: '#E6F4EC' },
        draft: { DEFAULT: '#B6841C', bg: '#FBF1DC' },
        cancelled: { DEFAULT: '#D64545', bg: '#FBE9E9' },
        info: { DEFAULT: '#2D6CDF', bg: '#E8F0FE' },
        /* ── shadcn/ui mapped ── */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        neo: '2px',
        'neo-thick': '3px',
      },
      boxShadow: {
        neo: '4px 4px 0 #3A2A1E',
        'neo-sm': '2px 2px 0 #3A2A1E',
        'neo-lg': '6px 6px 0 #3A2A1E',
        'neo-hover': '2px 2px 0 #3A2A1E',
        'neo-active': '0px 0px 0 #3A2A1E',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        'display': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'title': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'total': ['22px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      keyframes: {
        'neo-press': {
          '0%': { transform: 'translate(0, 0)', boxShadow: '4px 4px 0 #3A2A1E' },
          '100%': { transform: 'translate(4px, 4px)', boxShadow: '0 0 0 #3A2A1E' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'neo-press': 'neo-press 0.1s ease forwards',
        'slide-in': 'slide-in-right 0.2s ease-out',
        'slide-out': 'slide-out-right 0.2s ease-in',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
