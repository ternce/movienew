import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // MoviePlatform Design System
        mp: {
          bg: {
            primary: '#05060A',
            secondary: '#080B12',
          },
          surface: {
            DEFAULT: '#10131C',
            elevated: '#151824',
            card: '#1A1E2E',
            hover: '#222738',
            // Professional elevation system (0-5)
            0: '#05060A',
            1: '#0A0D14',
            2: '#10131C',
            3: '#161A26',
            4: '#1C2130',
            5: '#22283A',
          },
          accent: {
            primary: '#C94BFF',
            'primary-hover': '#D66FFF',
            secondary: '#28E0C4',
            'secondary-hover': '#4EEBD5',
            tertiary: '#FF6B5A',
          },
          overlay: {
            DEFAULT: 'rgba(5, 6, 10, 0.85)',
            light: 'rgba(5, 6, 10, 0.75)',
            heavy: 'rgba(5, 6, 10, 0.95)',
          },
          text: {
            primary: '#F5F7FF',
            secondary: '#9CA2BC',
            disabled: '#5A6072',
          },
          border: '#272B38',
          success: {
            bg: '#12352E',
            text: '#7CF2CF',
          },
          error: {
            bg: '#35141A',
            text: '#FF9AA8',
          },
          warning: {
            bg: '#352E12',
            text: '#F2CF7C',
          },
        },
        // Age category colors
        age: {
          '0': '#28E0C4',
          '6': '#28E0C4',
          '12': '#3B82F6',
          '16': '#F97316',
          '18': '#EF4444',
        },
        // shadcn/ui CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        // Professional typography scale
        'display': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '500' }],
      },
      letterSpacing: {
        'tighter': '-0.02em',
        'tight': '-0.01em',
        'normal': '0',
        'wide': '0.02em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
      backgroundImage: {
        // Functional fade masks for scroll containers (UX-required)
        'fade-left': 'linear-gradient(to right, #05060A 0%, transparent 100%)',
        'fade-right': 'linear-gradient(to left, #05060A 0%, transparent 100%)',
        'fade-bottom': 'linear-gradient(to top, #05060A 0%, transparent 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(201, 75, 255, 0.3)',
        'glow-secondary': '0 0 20px rgba(40, 224, 196, 0.3)',
        // Professional elevation shadows (subtle depth)
        'elevation-1': '0 1px 2px rgba(0, 0, 0, 0.2)',
        'elevation-2': '0 2px 8px rgba(0, 0, 0, 0.25)',
        'elevation-3': '0 8px 24px rgba(0, 0, 0, 0.3)',
        'elevation-4': '0 16px 48px rgba(0, 0, 0, 0.4)',
        // Card specific
        'card': '0 2px 8px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.35)',
        // Button lift effect
        'button': '0 2px 8px rgba(201, 75, 255, 0.25)',
        'button-hover': '0 4px 16px rgba(201, 75, 255, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        // Professional easing curves
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    tailwindAnimate,
    function({ addVariant }: { addVariant: (name: string, definition: string) => void }) {
      addVariant('hover-hover', '@media (hover: hover)');
      addVariant('touch', '@media (hover: none)');
    },
  ],
};

export default config;
