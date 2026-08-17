# Changelog

All notable changes to this template are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Until 1.0.0 the content model
(`_data/schema.yml`) may still change between minor versions — each entry says
so when it does.

## [Unreleased]

### Added

- Design system: `docs/design-system.md` (tokens, type scale, elevation, motion,
  every component class) and a `/styleguide/` page rendered from the live theme
  and the newest entries. Component CSS lives in `assets/css/components/*.css`.
- Quality gates in CI: `quality.yml` runs pa11y-ci (axe + HTML CodeSniffer,
  WCAG 2 AA, desktop and 390 px viewports) and Lighthouse CI on every push and
  PR; `validate.yml` now runs ESLint, Prettier, the Node and Ruby test suites,
  `generate --check`, front-matter validation and a full build.
- Contributor docs: `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- Schema v2 presentation hints — `card` (`badge` / `meta` / `line` / `chip` /
  `icon`), `weight`, `icon`, `group`, `prompt`, `option_meta`
  (short / icon / tone / description), group `placement` (`rail` | `main`) —
  and two field types, `images` and `links`. See `docs/content-model.md`.
- Catalog: redesigned card with an at-a-glance signal strip, grouped filter
  rail with live counts and URL state, mobile filter sheet, combobox search
  (body text indexed, relevance sort), grid/list toggle, home "browse by" tiles.
- Entry page: fact strip, screenshot gallery with lightbox, table of contents,
  reuse/contact cards, related entries, schema-driven grouped sections.
- Submit wizard: sectioned form with progress, live card preview that mirrors
  the catalog card, autosave with restore/discard, inline validation and an
  error summary, popup-blocked and email fallbacks, "what happens next".
- Issue → PR automation: screenshot downloads with size caps and a private-host
  guard, links parsing, YAML emission that round-trips through js-yaml and
  Psych, per-issue concurrency, a `SUBMISSIONS_OPEN` repository variable to
  pause public intake, SHA-pinned actions.
- Configurator: shared `core.js` split into modules; presets carry schema v2;
  `defaults.generated.js` is derived from the YAML by `npm run generate`. The
  `/setup/` Branding step shows a live preview of the real components under
  the chosen palette, type and rounding; the field builder's "Show on card"
  toggle can pin a card slot.
- Ten sample AI use cases across health programmes and back-office functions,
  each with a screenshot.

### Changed

- Fonts ship as latin/latin-ext woff2 subsets (Inter, Source Sans 3) with the
  body and heading faces preloaded; the TTFs are gone.
- Focus indication is one solid 2 px `primary` ring with a ground-coloured
  offset everywhere.
- Scaffolded entries carry `render_with_liquid: false`; the validator warns
  when it is missing.

### Security

- Screenshot fetches resolve DNS and refuse loopback / private / link-local
  addresses on every redirect hop; the GitHub token is only sent to GitHub hosts.
- Issue-body parsing takes the first occurrence of each heading and treats
  everything after the write-up as prose, so a submission cannot inject fields.
- Slugs are validated and writes are confined to `catalog/<slug>/`.

## [0.1.0] — 2026-08-17

### Added

- Initial template: Jekyll + GitHub Pages catalog driven by `_data/*.yml`,
  four presets (AI use-case catalog, cohort portal, resource library, blank),
  in-browser and CLI configurators, GitHub-issue submission flow, events /
  cohorts / resources modules, Lunr search, thumbnails workflow.

[Unreleased]: https://github.com/crypticpy/bchc-template/compare/38365a5...HEAD
[0.1.0]: https://github.com/crypticpy/bchc-template/commits/38365a5
