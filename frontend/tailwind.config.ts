import { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Figma dark theme colors
        bg: '#0A0E13',
        'bg-subtle': '#0F1419',
        'surface-1': '#161B22',
        'surface-2': '#1C2128',
        'surface-3': '#21262D',
        border: '#30363D',
        muted: '#7D8590',
        foreground: '#E6EDF3',
        heading: '#F0F6FC',
        
        // Sidebar specific colors from Figma
        'sidebar-bg': '#0D1117',
        'sidebar-border': '#21262D',
        'sidebar-item': '#161B22',
        'sidebar-item-hover': '#21262D',
        'sidebar-text': '#7D8590',
        'sidebar-text-active': '#F0F6FC',
        
        // Override gray colors for Figma theme consistency
        gray: {
          50: '#F0F6FC',
          100: '#E6EDF3',
          200: '#C9D1D9',
          300: '#8B949E',
          400: '#E6EDF3',
          500: '#C9D1D9',
          600: '#161B22',
          700: '#0F1419',
          800: '#0D1117',
          900: '#0A0E13',
          950: '#0A0E13',
        },
        
        primary: {
          100: '#D3E5FF',
          200: '#A6C7F7',
          300: '#75A9F0',
          400: '#4C90E8',
          500: '#2B7BDA',
          600: '#1E63B5',
        },
        success: {
          500: '#22C55E',
        },
        warning: {
          500: '#F59E0B',
        },
        danger: {
          500: '#EF4444',
        },
        info: {
          500: '#06B6D4',
        },
        
        // Helper colors
        overlay: 'rgba(0,0,0,0.4)',
        'border-soft': 'rgba(154,167,189,0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'DEFAULT': '5px',
        'none': '0',
        'sm': '5px',
        'md': '5px',
        'lg': '5px',
        'xl': '5px',
        '2xl': '5px',
        '3xl': '5px',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 50px -12px rgba(0, 0, 0, 0.25)',
        'card': '0 4px 16px rgba(0,0,0,0.35)',
        'pop': '0 12px 28px rgba(0,0,0,0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config;