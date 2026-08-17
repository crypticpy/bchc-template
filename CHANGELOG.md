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
- Setup wizard: entry-model fields as collapsed rows with a sticky action bar,
  `group`/`weight` controls on every field and on the add-a-field form, and a
  focusable error summary that links to each control at fault. The CLI wizard
  gained a declarative flag table (`--preset/--yes/--dry-run/--out/--help`).
- `_data/modules.yml` maps each module to the paths it owns; `_plugins/modules.rb`
  reads it instead of a hand-maintained table.
- Tests: `test/plugins/*_test.rb` for every Jekyll plugin, a JS↔Ruby parity test
  for the schema constants, `test/scripts/filter_state.test.mjs` for the catalog
  filter logic, and jsdom tests for the wizard (223 node + 67 Ruby).
- pa11y-ci audits interactive states too: the mobile filter sheet, "Show all"
  expanded, the lightbox, and the wizard's Branding and Entry-model steps.
- Screenshots in `README.md` and `docs/configuration.md`.

### Changed

- Panel #2 review fixes. Interaction: the submit form's "open a pre-filled
  issue" flow works again under `noopener`; `?q=` deep links search on load;
  the layout still reflows at 400 % zoom; the "Show all" toggle, carousel
  buttons and search listbox manage focus correctly; live regions stay quiet
  on boot; the filter sheet closes on Escape from anywhere; filter counts read
  as "(12 matches)" to assistive tech; the results header and rail hide when
  JavaScript is off. Layout: one `.page-title` size on every page, `.eyebrow`
  variants replace ad-hoc tracked capitals, the entry rail comes first in DOM
  order on small screens, and the home page's "Recently added" grid yields to
  the hero list at desktop widths. Hero CTAs hide with their module
  (`module:` on each CTA). Cohort-portal preset: `department` → `area`;
  resource-library preset copy is organization-neutral.
- Code organisation: `filters.js` split into `lib/filter-state.js`,
  `lib/entry-order.js` and `filter-sheet.js`; the wizard into `wizard/*` and
  `steps/*`; the CLI into `scripts/lib/setup-*.mjs`; `_layouts/cohort.html` and
  `_layouts/event.html` use prefixed Liquid assigns.
- Removed the unused per-field `section` hint and the top-level `sections:`
  map from the schema, presets and validator (`groups` replaced them).
- Quality configs moved to `quality/` (`urls.js` discovers sample entries;
  `pa11yci.js`, `lighthouserc.js`); the thumbnails workflow reads the entry
  path from the schema; every issue-driven workflow has a concurrency group.

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
