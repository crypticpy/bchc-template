# Design system

The reference for every visual decision in the template: tokens, type, spacing, elevation, motion,
and the component classes that implement them. `docs/design-brief.md` is the *why* (the "Quiet
Instrument" direction and its rubric); this file is the *what*, kept in step with
`assets/css/components/*.css`. A live rendering of everything below is at `/styleguide/` on any
deployment (`styleguide/index.md`; `noindex`, not in the navigation).

Every class in this document is a Tailwind `@apply` composition in `assets/css/components/`. Templates
use these class names, not raw utility soup, so a change to a component is one edit.

## Tokens

Tokens come from `_data/theme.yml`, are emitted as CSS variables by `_includes/theme.html`, and are
mapped to Tailwind colour names in `tailwind.config.js` (`brand-*`, `surface-*`). Components never
contain a hex value.

### Colour

| Token (`theme.yml`) | Tailwind | Default | Use |
|---|---|---|---|
| `primary` | `brand-primary` | `#1D4E89` | **Interactive only** — links, primary buttons, active facet pills, focus ring, TOC current. Never a decorative fill. |
| `primary_dark` | `brand-primary-dark` | `#12305A` | Headings; hero, footer and lightbox stage grounds. |
| `secondary` | `brand-secondary` | `#0F6357` | Taxonomy identity — the dot on `.chip`, secondary icons. Never tinted-on-tinted text. |
| `accent` | `brand-accent` | `#E07A2F` | "Featured" and nothing else. |
| `warn` | `brand-warn` | `#B45309` | Caution only: sensitive-data signals, validation errors. |
| `ink` | `brand-ink` | `#1B2430` | Body text; the `badge-on-dark` ground. |
| `muted` | `brand-muted` | `#5A6573` | Secondary text at ≥ 11px semibold / ≥ 14px regular (5.9:1 on white). Do not add opacity — `muted/80` fails AA. |
| `line` | `brand-line` | `#D9E0E8` | Every divider and card border (E0). |
| `line_strong` | `brand-line-strong` | `#7C8A9B` | Borders of interactive controls — inputs, pills, secondary buttons (3.5:1, non-text AA). Not for text. |
| `surface` | `surface-base` | `#F5F7FA` | Page ground. |
| `card` | `surface-card` | `#FFFFFF` | Card / panel ground. |
| `on_dark` | `brand-on-dark` | `#F7F9FC` | Text over `primary_dark`. |

Alpha modifiers (`bg-brand-primary/10`) work because the variables are RGB triples. Use them for
*fills* (`primary/5` hover wash, `primary/10` selected wash, `warn/5` error panel), never to lighten
*text*.

Rules of thumb: one interactive hue, one taxonomy hue, one caution hue. If a new element wants a
colour, it is either one of those meanings or it is `ink`/`muted` on `line` structure. Light mode only.

### Type

`fonts.heading` / `fonts.body` from `theme.yml` → `--font-heading` / `--font-body` → `font-heading`
/ `font-sans`. Bundled: Inter (400/500/600/700) and Source Sans 3 (400/600/700) as latin woff2
subsets (`assets/fonts/README.md`); other families via `fonts.google_fonts_url`.

| Role | Size / line | Class or where |
|---|---|---|
| Display | 40/44, −0.02em | Home hero `h1` |
| H1 | 32/38 | Page and entry titles |
| H2 / section | 24/30 | `.section-title` |
| H3 | 20/26 | Rail card headings, prose `h3` |
| Card title | 18/24 | `.entry-title` (2-line clamp) |
| Body | 16/26 | `body`, `.prose-body` (measure ≤ 68ch via `max-w-prose`) |
| Small | 14/22 | `.section-lead`, `.field-help`, chips' parents |
| Micro | 12/16 | `.signal`, `.chip`, `.filter-count` |
| Eyebrow | 11/16, 0.12em tracking, semibold, uppercase | `.eyebrow`, `.entry-meta`, `.fact-label`, `.rail-title`, `.filter-legend` |

Sentence case everywhere; the eyebrow is the only uppercase style. Never track wider than 0.12em.

### Spacing, radius, elevation, motion

- **Spacing** — 4px base; use 4/8/12/16/24/32/48/64/96 only. Card padding 20 (mobile) / 24 (≥ sm);
  grid gutter 24; section rhythm 64/96; inside a card 8 between related lines, 16 between blocks.
- **Radius** — `theme.yml → radius: sharp | soft | round` sets `--radius-sm…2xl`; Tailwind's
  `rounded-md/lg/xl/2xl` map onto them. Cards `rounded-2xl`, panels/inputs/thumbnails `rounded-lg`
  or `xl`, chips/pills/buttons `rounded-full`. Nested elements go one step down from their parent.
  Checkboxes keep a fixed 3px corner regardless of theme (a round box says "pick one").
- **Elevation** — E0 `border-brand-line`, no shadow: the default for all cards. E1 `shadow-e1`: hover
  lift only (`.card-hover`). E2 `shadow-e2`: things that float — sticky results header, mobile
  sheet, search listbox, progress rail. Never shadow chips, inputs or badges; never E1 inside E1.
- **Motion** — `duration-120` state changes, `duration-180` hover/expand, `duration-240` sheets;
  `ease-brand` = `cubic-bezier(0.2,0,0,1)`. Animate `transform`/`opacity` only; results re-render is a
  120ms opacity fade (`.entry-grid.is-fading`). `prefers-reduced-motion` collapses every
  transition/animation to 0.01ms (`base.css`), carousel autoplay stops, sheet slides become instant.
  Focus rings never animate.

### Focus

One ring everywhere: `ring-2 ring-brand-primary ring-offset-2 ring-offset-surface-card` on
`:focus-visible` (8.4:1 on white; the offset gap keeps it visible on primary-filled controls).
`.btn-on-dark` swaps to a white ring with a `primary_dark` offset. Cards ring as a whole via
`.entry-card:focus-within` because the title link's hit area covers the card.

## Components

### Buttons (`buttons.css`)

| Class | Use |
|---|---|
| `.btn-primary` | The one primary action on a view (Submit, Open issue). Filled `primary`. |
| `.btn-secondary` | Everything else that is a button: hairline `line_strong`, `primary` text. |
| `.btn-ghost` | Tertiary in-flow actions (Clear all, Show more). |
| `.btn-on-dark` | Buttons on `primary_dark` grounds (hero, footer). |
| `.btn-sm` | Modifier: 36/32px. |
| `.icon-btn` | Icon-only, 44px (36 ≥ lg). Always `aria-label`. |

Pill shape, 44px min-height under `lg` (40 above), no translate on hover — colour change only.

### Badges, chips, signals (`badges.css`)

- `.badge-<tone>` — categorical label. Tones: `primary` (inline card badge), `accent` (Featured),
  `neutral`, `warn` (caution), `on-dark` (over a screenshot: opaque `ink/80` ground so contrast
  holds on any image), `secondary`. `.badge-md`, `.badge-lg` sizes.
- `.chip` — one taxonomy family per card (hairline, `secondary` dot). `.chip-plain` (no dot),
  `.chip-warn` (sensitive values), `.chip-neutral` (the "+n" overflow, same hairline, no dot).
- `.signal` / `.signal-warn` / `.signal-primary` — icon + short text at 12px, monochrome; the
  strip is `.signal-strip` (hairline top). ≤ 4 items including one trailing "+n"
  (`_includes/signal-strip.html`).

Every badge/chip/signal carries visible or `sr-only` text — never colour- or icon-only.

### Catalog surfaces (`catalog.css`)

- `.entry-grid` (`data-view="grid|list"`) → `.entry-card` (E0, `card-hover`), `.entry-media` (16:9
  band + top scrim), `.entry-badges`, `.entry-body`, `.entry-meta` (eyebrow; segments are
  `.entry-meta-seg`, the lead one flexes and truncates, later ones get a `·` via `::before`),
  `.entry-title`, `.entry-line` (impact), `.entry-summary` (2-line clamp; 4 on `.entry-card--text`),
  `.entry-chips`, `.entry-foot`.
- `.entry-row` — compact variant for related lists.
- Filter rail: `.filter-rail`, `.filter-group`, `.filter-group-toggle`, `.filter-legend`,
  `.filter-pill` (`aria-pressed`, `.is-empty` for zero-count), `.filter-showall`.
- Results header: `.results-header` (sticky, E2), `.results-count`, `.results-select`,
  `.active-pill`, `.view-toggle`. Search: `.search-box`, `.search-listbox` (E2), `.search-option`.
- Mobile: `.filter-bar` (fixed bottom), `.filter-sheet` (`role=dialog`, focus trap, siblings `inert`).

### Entry page (`entry.css`)

`.fact-strip` / `.fact` / `.fact-label` / `.fact-value` / `.fact-item(-warn)`; `.rail-card`,
`.rail-title`, `.rail-list`, `.rail-term`, `.rail-def`, `.rail-link`, `.rail-person`; `.toc-link`
(`aria-current`); `.gallery-lead`, `.gallery-thumb`; `.lightbox*` (native `<dialog>`). Print styles
drop interactive chrome and flow the rail after the prose.

### Forms (`forms.css`)

`.field` → `.field-label` (+ `.field-required` spelled out), `.field-help` **above** the control,
`.field-input` (`line_strong` border, `aria-invalid` → warn), `.field-error` below, `.field-option`
(card-style radio/checkbox with `has-[:checked]`), `.checkbox`, `.radio`, `.field-note`. Submit page:
`.form-section`, `.progress-rail`/`.progress-link`/`.progress-dot`, `.error-summary*`, `.links-row`,
`.image-previews`, `.preview-panel`, `.draft-bar`/`.draft-status`.

### Page furniture (`site.css`)

`.card`, `.card-hover`, `.card-header`, `.card-title`, `.eyebrow`, `.section-title`,
`.section-lead`, `.link-row`, `.prose-body`, `.sr-only-focusable`.

Home hero: `.hero-stat` (stat-line segment; its `·` separator is a `::before`, never
text) and `.hero-latest` / `-item` / `-link` / `-title` / `-meta` — the "Latest
additions" panel in the hero's right column at ≥1024 px (`home.hero_latest_count`;
white / on-dark ink on `primary-dark`, 15 % white hairlines).

## Accessibility baseline

WCAG 2.2 AA is the floor and `quality.yml` checks it (axe + HTML_CodeSniffer, Lighthouse
accessibility ≥ 0.95). The recurring rules:

- Text ≥ 4.5:1, non-text UI ≥ 3:1 — checked against `theme.yml` defaults; a deployment that changes
  colours re-runs `npm run a11y`.
- 44px targets under `lg` for anything tappable; 32–36px is fine on desktop.
- Visible focus for every control; keyboard path for the sheet, lightbox, search combobox and
  carousel; Esc closes and returns focus.
- Icon-only controls have `aria-label`; external links carry an sr-only "(opens in a new tab)".
- One `role="status"` per surface, debounced.
- Decorative separators are CSS `::before`, so they are neither read nor contrast-checked.

## Changing the system

1. Token change → `theme.yml` (per deployment) or the defaults in `_includes/theme.html`
   (template). Re-check contrast.
2. New component → add to the matching `components/*.css` file with a one-line comment on when
   to use it, add it to `/styleguide/`, and add a row here.
3. Never write a colour, radius, shadow or duration inline in a template; if it is not a token or a
   component, it is not part of the system yet.
