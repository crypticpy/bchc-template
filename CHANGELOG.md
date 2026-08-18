# Changelog

All notable changes to this template are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/): a change to the content model
(`_data/schema.yml`) that existing entries or presets would have to follow is a
major version, and each entry says so when it happens.

## [Unreleased]

## [1.2.0] — 2026-08-17

The first "contributor panel" release: twelve simulated world-class
contributors (principal engineers, library maintainers, an interface designer,
public-health officials, GitHub and Microsoft engineers) each proposed what
they would improve; seven implementation units shipped the accepted set. The
report is in the release notes.

### Added

- **Search reads the whole write-up.** Every entry is indexed per section, so a
  suggestion names the section it matched in, shows the sentence around the
  term and links straight to that heading. Weak matches (below 25 % of the top
  score) sit behind "Show n more that mention …". `schema.search.body_chars`
  caps how much of each section is indexed (0 or unset = unlimited).
- An Atom feed of the newest 25 entries at `/<entry.path>/feed.xml`
  (`/catalog/feed.xml` as shipped), one `<category>` per facet value,
  advertised in `<head>` only when the catalog has entries.
- Every cohort milestone gets its own page, generated from
  `_data/cohorts/<year>.yml`. A hand-written file under
  `cohorts/<year>/events/<id>/` still overrides it and inherits any field it
  leaves blank.
- **Submission form:** a "Check your answers" step that reads every answer back
  by section with a Change button, then a confirmation panel that says nothing
  is submitted until *Submit new issue* is pressed on GitHub; "Save and come
  back later" with a draft bar that says when it was saved and how many
  answers it holds; and the whole form works without JavaScript — a plain GET
  to GitHub's issue form, real `required` attributes and a copy-paste outline.
- `submit.turnaround` and `submit.review_note` are configurable in both wizards
  and every preset ships a turnaround it can keep. The setup wizard's review
  step lists the three things it cannot do for you.
- **Bot pull requests get first-party checks.** Each issue-driven workflow
  dispatches Validate and Quality against the branch it created (the default
  token cannot trigger them), `thumbnails.yml` re-dispatches after its own
  push, and an optional `CONTENT_BOT_TOKEN` makes the PRs trigger checks
  natively. Run summaries list what was dispatched; the PR body carries an
  entry preview; when the merged entry deploys, the closed issue is told
  "Your entry is now live at …".
- `.github/workflows/lint-workflows.yml` runs actionlint and zizmor on any pull
  request touching `.github/**`. **Bootstrap labels** prints a preflight
  summary (labels, Pages source, launch-guide link).
- `npm run dev` — one command for the Tailwind watcher, `jekyll serve
  --livereload` and regeneration of the schema-derived files.
- `npm run test:build` — builds every preset and module combination and checks
  the rendered HTML for hard-coded articles, downcased sentences, dead links
  and leftover Liquid.
- `npm run validate` fails a `_data/theme.yml` palette that does not meet
  WCAG AA, naming the pair and the measured ratio; the schema validator warns
  when a field `description` repeats its `prompt`.
- The Quality workflow runs Lighthouse on mobile as well as desktop and writes
  a table of the scores and the pa11y results to the run summary.
- `theme.yml → type.measure` / `type.measure_display` set the reading and
  display line lengths; body copy measures ~68 characters (was ~88).
- Docs: `docs/launch.md` (fork-to-live tutorial), `docs/incidents.md`
  (takedown runbook), `docs/index.md`, `docs/decisions.md` (the canonical
  decision log), `docs/glossary.md`.
- `with_article`, a Liquid filter that picks "a" or "an" for the schema's
  entry noun. `static_file` and `facet_options` filters.

### Changed

- **Builds are much faster on large catalogs:** related entries are computed
  once per build instead of per page (260 entries: 25.8 s → 3.8 s), and are
  chosen by how distinctive a shared value is (IDF), scaled by the field's
  `weight` — a lower weight counts for more, as it does everywhere else.
- The search index is fetched only when someone searches, at low priority
  with a timeout, instead of being preloaded on every page.
- Multiselect questions reach the GitHub issue form as a multi-select
  dropdown, so the answers survive the hand-off and can be marked required
  there.
- Submission-form errors are written from the schema and name the question
  they belong to; the progress rail says how many problems each section has;
  the setup wizard marks problems on the control and clears them on the next
  keystroke.
- Catalog cards line up: the meta line no longer wraps and every slot reserves
  its height, so a row scans across instead of stair-stepping; padding and
  title size follow the card's own width (container queries); results settle
  instead of blinking — only cards that just entered the filtered set fade in.
- Option descriptions moved out of hover tooltips into a "What do these
  mean?" disclosure under each facet group and the fact strip.
- Page titles scale fluidly instead of stepping at 640 px; headings and
  paragraphs use `text-wrap: balance` / `pretty` where supported.
- The catalog page heading, nav label, breadcrumb and `<title>` are all
  derived from the schema's entry noun.
- Only one image per page is eager-loaded with a high fetch priority.
- `jekyll-feed` was removed; the feed moved from `/feed.xml` to
  `/<entry.path>/feed.xml`.
- The scaffolder shares one slug rule across JS and Ruby (NFKD; a title with
  no Latin characters scaffolds `entry-<issue>` with a warning instead of
  failing); Actions helpers are shared and generated files are written
  atomically.

### Fixed

- Prose pages render in the site's own palette again: `prose-slate` was
  overwriting every themed variable, leaving links at 1.70:1 with no
  underline.
- Selected, current and complete states stay visible under Windows High
  Contrast Mode (new forced-colors layer); a tap no longer leaves a control
  stuck in its hover state on touch devices; `hidden` can no longer be undone
  by a display utility.
- The on-dark thumbnail badge is opaque, fixing a contrast failure over pale
  screenshots.
- The home carousel's first card keeps its 16 px inset on phones (it was
  smooth-scrolled flush at load, which also stopped Chrome reporting LCP).
- The lightbox announces the image ("Image n of m. <alt>") and opens the
  dialog before filling it; search suggestions navigate on click.
- Copy that assumed the entry noun starts with a consonant ("Submit a
  entry"), empty-state headings that lowercased their first word, and the
  About page's "draft pull request" wording.
- Links to the submission form are hidden when the submit module is off; the
  footer honours the same `module:` gate as the header.
- Image downloads are capped as they stream, not after the fact.
- The schema validator rejected `tone: on-dark`, which the badge CSS styles
  and the docs document.
- Doubled spaces in the mobile filter sheet's "Show n use cases" button.
- **Security:** the image fetcher's SSRF guard now judges IPv6 literals
  numerically. IPv4-mapped (`[::ffff:169.254.169.254]`), IPv4-compatible and
  NAT64 (`64:ff9b::/96`) literals are decoded and checked with the IPv4
  rules, so a hex spelling produced by the URL parser (`[::ffff:a9fe:a9fe]`)
  can no longer reach loopback, link-local or private space; `fe80::/10`,
  `fc00::/7`, `ff00::/8` and `2001:db8::/32` are matched by mask rather than
  by text prefix.

## [1.1.0] — 2026-08-17

Closes the four P3 findings the v1.0.0 panel left open, and settles the
toolchain questions Dependabot raised.

### Added

- The 404 page carries the catalog search box (the same plain GET form as the
  home hero) and the three newest entries, both driven by `_data/schema.yml`
  and hidden when the `catalog` module is off.
- "Browser support" section in `docs/design-system.md`.

### Changed

- Entry page: on wide screens the rail (contents, reuse, contact) now sits
  beside the header instead of starting under it, so the top of the page has
  no empty column; a rail taller than the viewport scrolls in place instead of
  hiding its last card. DOM order — and therefore the reading order on phones
  and screen readers — is unchanged.
- Fact strip: cells align label and value rows across the strip, cap at three
  values with a "+n" chip that names the rest, use two columns in the
  1024–1279 px band beside the rail, and draw hairlines per cell so a short
  last row no longer ends in a grey block.
- Filter rail: pill labels are 13 px at `lg` (were 12); zero-count options
  recede on three cues (muted ink, hairline border, 70 % opacity).
- Dependencies: ESLint 10 (`@eslint/js` 10), `globals` 17, `js-yaml` 5
  (`import * as yaml`).
- Tailwind stays on 3.4 by decision — v4's browser floor is too high for the
  audience — and Dependabot now ignores the major bump. Rationale in
  `docs/design-system.md` and `docs/roadmap.md`.

## [1.0.0] — 2026-08-17

The first release meant to be forked. Three review panels (visual, interaction,
accessibility, front-end code, architecture, documentation, pipeline security)
were held during development; every P1 and P2 finding from the final panel is
fixed in this release, and the remaining P3s are listed in `docs/roadmap.md`.

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
  filter logic, jsdom tests for the wizard and the submit form, and adversarial
  tests for every issue-driven script (239 node + 77 Ruby).
- pa11y-ci audits interactive states too: the mobile filter sheet, "Show all"
  expanded, the lightbox, and the wizard's Branding and Entry-model steps.
- Screenshots in `README.md` and `docs/configuration.md`.
- `npm run validate` (and the CI gate) fails a fork that still names the
  template's repository in `_data/site.yml` or the issue chooser, with the fix
  spelled out; `npm run generate` rewrites the chooser links from `site.yml`.
- Workflows run on Node 22 (`engines.node >= 22`).

### Changed

- Interaction: the submit form's "open a pre-filled issue" flow works under
  `noopener`; `?q=` deep links search on load; the layout reflows at 400 %
  zoom; the "Show all" toggle, carousel buttons and search listbox manage focus
  correctly; live regions stay quiet on boot; the filter sheet closes on Escape
  from anywhere; filter counts read as "(12 matches)" to assistive tech; the
  results header and rail hide when JavaScript is off; the catalog status names
  the search that is *applied*, not the text being typed; a step pill in the
  setup wizard validates every step it would skip.
- Layout: one `.page-title` size on every page, `.eyebrow` variants replace
  ad-hoc tracked capitals, the entry rail comes first in DOM order on small
  screens, the entry table of contents also shows on mobile, the home page's
  "Recently added" grid yields to the hero list at desktop widths, carousel
  items fill their row exactly with a "Browse all" link beside the controls, the
  filter rail fades at its bottom edge when it scrolls, text-only cards keep
  their own height next to image cards, and headings that receive scripted
  focus use a dashed offset outline instead of the control ring. Hero CTAs hide
  with their module (`module:` on each CTA). Cohort-portal preset:
  `department` → `area`; resource-library preset copy is organization-neutral.
- Accessibility: the submit form's fieldset legends label their selects, every
  option input has an id the error summary can link to, the images textarea is
  described by its note, email inputs carry `autocomplete`; the setup wizard's
  copy buttons announce "Copied" politely, and its select controls keep a
  current value that is no longer among the options.
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
- Scaffolded entries carry `render_with_liquid: false`; the validator fails an
  entry without it.
- Both configurators ask the same six colour questions (`line_strong` and
  `warn` included) and the live preview honours all of them.

### Security

- Screenshot fetches resolve DNS and refuse loopback / private / link-local
  addresses on every redirect hop; the GitHub token is only sent to GitHub hosts.
- Issue-body parsing takes the first occurrence of each heading and treats
  everything after the write-up as prose, so a submission cannot inject fields.
- Slugs are validated and writes are confined to `catalog/<slug>/`.
- The cohort and event scripts share the first-wins issue-form parser, confine
  every write to `cohorts/<year>/events/<id>/`, emit front matter through the
  shared YAML emitter, write every `$GITHUB_OUTPUT` value behind a random
  heredoc delimiter, and their workflows declare `permissions: {}` at the top
  level, honour `SUBMISSIONS_OPEN`, and report a failed run back on the issue.
  Adversarial tests spawn each script with hostile issue bodies.
- `SECURITY.md` says what the automation guarantees, what it does not (the
  workflow token is repository-wide; branch protection is the backstop; DNS
  rebinding against a self-hosted runner), and how to report a vulnerability.

## [0.1.0] — 2026-08-17

### Added

- Initial template: Jekyll + GitHub Pages catalog driven by `_data/*.yml`,
  four presets (AI use-case catalog, cohort portal, resource library, blank),
  in-browser and CLI configurators, GitHub-issue submission flow, events /
  cohorts / resources modules, Lunr search, thumbnails workflow.

[Unreleased]: https://github.com/crypticpy/bchc-template/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/crypticpy/bchc-template/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/crypticpy/bchc-template/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/crypticpy/bchc-template/compare/38365a5...v1.0.0
[0.1.0]: https://github.com/crypticpy/bchc-template/commits/38365a5
