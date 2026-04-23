/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:    '#6C63FF',
        secondary:  '#7C3AED',
        error:      '#EF4444',
        success:    '#10B981',
        warning:    '#F59E0B',
        accent:     'var(--color-accent)',
        success: '#10B981',
        warning: '#F59E0B',

        // ── Semantic surface tokens (map to CSS vars for dark mode) ──
        'surface': 'var(--color-surface)',
        'surface-card': 'var(--color-surface-card)',
        'surface-variant': 'var(--color-surface-variant)',

        // ── Semantic border tokens ──
        'border': 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',

        // ── Semantic text tokens ──
        'on-surface': 'var(--color-text)',
        'on-surface-variant': 'var(--color-text-muted)',
        'on-surface-muted': 'var(--color-text-faint)',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px 0 rgba(0,0,0,0.08)',
        primary: '0 4px 12px 0 rgba(79,70,229,0.25)',
        glass: '0 8px 32px 0 rgba(31,38,135,0.07)',
      },
    },
  },
  plugins: [],
};
