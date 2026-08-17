import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

// Colors are CSS variables (RGB channel triples) emitted by _includes/theme.html
// from _data/theme.yml, so the palette is data-driven and alpha modifiers
// (e.g. bg-brand-primary/10) still work.
const rgb = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: [
    './_layouts/**/*.html',
    './_includes/**/*.html',
    './_plugins/**/*.rb',
    './*.md',
    './*.html',
    './catalog/**/*.{md,html}',
    './cohorts/**/*.{md,html}',
    './events/**/*.{md,html}',
    './resources/**/*.{md,html}',
    './submit/**/*.{md,html}',
    './setup/**/*.{md,html}',
    './about/**/*.{md,html}',
    './assets/js/**/*.js',
  ],
  // Tone classes are composed at render time (`badge-{{ tone }}`, `signal-…`),
  // so the scanner cannot see the literals; keep every tone variant.
  safelist: [{ pattern: /^(badge|chip|signal)-/ }],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: rgb('primary'),
          'primary-dark': rgb('primary-dark'),
          secondary: rgb('secondary'),
          accent: rgb('accent'),
          ink: rgb('ink'),
          muted: rgb('muted'),
          line: rgb('line'),
          'line-strong': rgb('line-strong'),
          'on-dark': rgb('on-dark'),
          warn: rgb('warn'),
        },
        surface: {
          base: rgb('surface'),
          card: rgb('card'),
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', ...defaultTheme.fontFamily.sans],
        sans: ['var(--font-body)', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: 'var(--radius-sm)',
        md: 'var(--radius-sm)',
        lg: 'var(--radius-md)',
        xl: 'var(--radius-lg)',
        '2xl': 'var(--radius-xl)',
        '3xl': 'var(--radius-2xl)',
      },
      // Elevation: E0 = hairline only (no shadow). E1 = hover lift. E2 = sticky bars, sheets, popovers.
      boxShadow: {
        e1: '0 1px 2px rgb(var(--c-ink) / 0.06), 0 8px 16px -8px rgb(var(--c-ink) / 0.12)',
        e2: '0 2px 4px rgb(var(--c-ink) / 0.06), 0 16px 32px -12px rgb(var(--c-ink) / 0.18)',
        // Legacy aliases kept for older layouts; prefer e1/e2.
        card: '0 1px 2px rgb(var(--c-ink) / 0.06), 0 8px 16px -8px rgb(var(--c-ink) / 0.12)',
        subtle: 'none',
      },
      transitionTimingFunction: { brand: 'cubic-bezier(0.2, 0, 0, 1)' },
      transitionDuration: { 120: '120ms', 180: '180ms', 240: '240ms' },
      maxWidth: { prose: '68ch' },
      typography: () => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'rgb(var(--c-ink))',
            '--tw-prose-headings': 'rgb(var(--c-primary-dark))',
            '--tw-prose-links': 'rgb(var(--c-primary))',
            '--tw-prose-bold': 'rgb(var(--c-ink))',
            '--tw-prose-quotes': 'rgb(var(--c-ink))',
            '--tw-prose-quote-borders': 'rgb(var(--c-primary))',
            '--tw-prose-bullets': 'rgb(var(--c-primary))',
            '--tw-prose-counters': 'rgb(var(--c-primary))',
            '--tw-prose-hr': 'rgb(var(--c-line))',
            '--tw-prose-th-borders': 'rgb(var(--c-line))',
            '--tw-prose-td-borders': 'rgb(var(--c-line))',
            '--tw-prose-code': 'rgb(var(--c-primary-dark))',
            '--tw-prose-pre-bg': 'rgb(var(--c-primary-dark))',
            '--tw-prose-pre-code': 'rgb(var(--c-on-dark))',
            h1: { fontFamily: 'var(--font-heading)' },
            h2: { fontFamily: 'var(--font-heading)' },
            h3: { fontFamily: 'var(--font-heading)' },
            a: { textDecoration: 'none', fontWeight: '500', '&:hover': { textDecoration: 'underline' } },
          },
        },
      }),
    },
  },
  plugins: [forms, typography],
};
