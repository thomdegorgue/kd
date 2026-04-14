import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Colores — CSS variable-based (shadcn/ui) ─────────────────
      colors: {
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT:    'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border:  'var(--border)',
        input:   'var(--input)',
        ring:    'var(--ring)',
        sidebar: {
          DEFAULT:             'var(--sidebar)',
          foreground:          'var(--sidebar-foreground)',
          primary:             'var(--sidebar-primary)',
          'primary-foreground':'var(--sidebar-primary-foreground)',
          accent:              'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border:              'var(--sidebar-border)',
          ring:                'var(--sidebar-ring)',
        },

        // ── Tokens de marca KitDigital.ar ─────────────────────────
        brand: {
          DEFAULT: '#1b1b1b',
          light:   '#f6f6f6',
          dark:    '#0d0d0d',
        },
        success: {
          DEFAULT: '#1a9e5c',
          light:   '#e8f8f0',
        },
        warning: {
          DEFAULT: '#c47d0e',
          light:   '#fdf3e0',
        },
        error: {
          DEFAULT: '#d93025',
          light:   '#fce8e6',
        },
        // info  → estados informacionales, "confirmado", "demo"
        info: {
          DEFAULT: '#0284c7',
          light:   '#f0f9ff',
        },
        // pro   → tier pro, "enviado", asistente IA, badges de módulos
        pro: {
          DEFAULT: '#0d9488',
          light:   '#f0fdfa',
        },
      },

      // ── Border radius ─────────────────────────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ── Tipografía — Inter con jerarquía Apple-style ──────────────
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs:    ['0.75rem',  { lineHeight: '1.125rem' }],
        sm:    ['0.875rem', { lineHeight: '1.375rem' }],
        base:  ['1rem',     { lineHeight: '1.625rem' }],
        lg:    ['1.125rem', { lineHeight: '1.75rem' }],
        xl:    ['1.25rem',  { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem',     letterSpacing: '-0.015em' }],
        '3xl': ['2rem',     { lineHeight: '2.5rem',   letterSpacing: '-0.02em'  }],
        '4xl': ['2.5rem',   { lineHeight: '3rem',     letterSpacing: '-0.025em' }],
        '5xl': ['3.25rem',  { lineHeight: '3.75rem',  letterSpacing: '-0.03em'  }],
      },
      letterSpacing: {
        tight:  '-0.025em',
        normal: '0',
        wide:   '0.05em',
        wider:  '0.08em',
      },

      // ── Animaciones ───────────────────────────────────────────────
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.2s ease-out',
      },

      // ── Sombras — muy sutiles, Apple style ────────────────────────
      boxShadow: {
        'xs':  '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'md':  '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'lg':  '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
