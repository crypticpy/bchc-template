import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

// Colors are CSS variables (RGB channel triples) emitted by _includes/theme.html
// from _data/theme.yml, so the palette is data-driven and alpha modifiers
// (e.g. bg-brand-primary/10) still work.
const rgb = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  // Wraps every `hover:` rule (including the ones composed with @apply inside
  // components/*.css) in `@media (hover: hover)`, so a tap on a touch device no longer
  // leaves a pill or a card stuck in its hover state. +95 B gzip; Tailwind 4's default.
  future: { hoverOnlyWhenSupported: true },
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
    './styleguide/**/*.{md,html}',
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
            // The measure is a theme token (_data/theme.yml -> type.measure, emitted as
            // --measure by _includes/theme.html), not `ch`: the CSS `ch` unit is the advance
            // width of "0" (~0.66em in Inter) while an average running-English character is
            // ~0.48em, so Tailwind's 65ch prose default renders ~88 characters. Owning it
            // here rather than via `max-w-prose` also keeps `@apply prose` collision-free.
            maxWidth: 'var(--measure)',
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
            // Links keep their colour on --tw-prose-links (so the variable contract still
            // holds) and carry a permanent underline: colour alone is not a sufficient
            // distinguisher for in-text links (WCAG 1.4.1). The 35% decoration keeps the
            // rule quiet at body size and goes solid on hover.
            a: {
              fontWeight: '500',
              textDecoration: 'underline',
              textDecorationColor: 'rgb(var(--c-primary) / 0.35)',
              textUnderlineOffset: '2px',
              '&:hover': { color: 'rgb(var(--c-primary-dark))', textDecorationColor: 'currentColor' },
            },
          },
        },
      }),
    },
  },
  plugins: [forms, typography],
};
