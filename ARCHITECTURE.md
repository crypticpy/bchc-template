# Architecture

How the template is put together, and why. Read this before changing anything structural;
`docs/configuration.md`, `docs/content-model.md` and `docs/admin-guide.md` cover day-to-day use.

## In one paragraph

A static Jekyll site on GitHub Pages, with GitHub itself as the CMS. Everything that varies between
deployments lives in `_data/*.yml`; templates, scripts and workflows read those files instead of
carrying site-specific knowledge. Members submit entries through a web form that opens a prefilled
GitHub issue; a workflow turns the issue into a pull request; maintainers merge; Pages rebuilds.
There is no server, no database and no build step a maintainer has to run by hand.

```
  browser ─▶ /submit/ form ─▶ prefilled GitHub issue ─▶ new-entry.yml workflow
                                                              │  scripts/new_entry_from_issue.mjs
                                                              ▼
                                            catalog/<slug>/index.md (+ screenshots/)  in a PR
                                                              │  validate.yml · quality.yml
                                                              ▼
                                                   merge ─▶ pages.yml ─▶ GitHub Pages
```

## Layers

| Layer | Where | Owns |
|---|---|---|
| **Configuration** | `_data/site.yml`, `_data/theme.yml`, `_data/schema.yml`, `_data/navigation.yml` | Branding, module toggles, copy; colours/fonts/radius; the entry content model; header links. The only files a deployment is expected to edit. |
| **Feature data** | `_data/events.yml`, `_data/cohorts/<year>.yml`, `_data/resources.yml` | Content for the optional `events`, `cohorts`, `resources` modules. |
| **Content** | `catalog/<slug>/index.md` (+ `screenshots/`, `thumb.jpg`, `deck.pdf`) | One folder per entry; front matter keys are schema field keys. |
| **Templates** | `_layouts/`, `_includes/` | Liquid that renders whatever the schema declares. Never names a field key. |
| **Build plugins** | `_plugins/*.rb` | Small Jekyll hooks/filters that keep the templates schema-agnostic (see below). |
| **Styling** | `assets/css/tailwind.css` → `components/*.css` → `assets/css/site.css` (built) | Tailwind 3 with one component file per surface; tokens come from `theme.yml` as CSS variables. |
| **Behaviour** | `assets/js/*.js` | Small vanilla-JS IIFEs, one per concern, progressively enhancing server-rendered HTML. |
| **Automation** | `scripts/*.mjs`, `scripts/*.rb`, `.github/workflows/*.yml` | Issue → PR scaffolding, validation, thumbnails, generation of derived files. |
| **Configurators** | `assets/js/configurator/` (shared core), `setup/` (browser), `scripts/setup.mjs` (CLI) | Produce the four `_data` files + `_config.yml` + issue template from a handful of answers or a preset. |

### Configuration is the source of truth

`_data/schema.yml` describes every entry field: type, label, prompt, options, `required`, and
presentation hints (`facet`, `card`, `search`, `section`, `weight`, `icon`, `group`,
`option_meta`). Everything downstream iterates `schema.fields` (or `schema.groups`):

- `_layouts/entry.html`, `_includes/entry-card.html`, `_includes/fact-strip.html`, `_includes/gallery.html`,
  `_includes/reuse-card.html`, `_includes/facet-filters.html` and friends — rendering.
- `_plugins/search_index.rb` — which fields feed `/search.json`.
- `submit/index.md` + `assets/js/submit/*` — the form, validation and live card preview.
- `scripts/new_entry_from_issue.mjs` — issue body → front matter.
- `scripts/check_front_matter.rb` — CI validation of every entry.
- `scripts/generate.mjs` — regenerates `.github/ISSUE_TEMPLATE/new-entry.yml`, syncs `_config.yml`
  title/description, and builds `assets/js/configurator/defaults.generated.js`. Run it after every
  schema edit; `node scripts/generate.mjs --check` fails CI when the committed outputs are stale.

The rule of thumb: if you find yourself typing a field key into a template or script, stop and add
a hint to the schema instead. `docs/content-model.md` documents each hint's exact meaning.

### Plugins (`_plugins/`)

| File | What it does |
|---|---|
| `schema_filters.rb` | Liquid filters that answer schema questions so templates stay declarative: `sort_by_weight`, `facet_fields`, `form_fields`, `fields_in_group`, `groups_for`, `groups_placed`, `card_slot`, `card_fields`, `option_meta`, `option_short`, `as_list`, `image_item`, `first_image`. |
| `theme_filters.rb` | Presentation helpers: `hex_to_rgb`, `facet_values`, `slugify_list`, `link_host`, `query_encode`. |
| `search_index.rb` | Generates `/search.json` from fields marked `search`/`facet` (plus a slice of the write-up), consumed by `assets/js/search.js` (Lunr). |
| `modules.rb` | At `post_read`, drops every page under a disabled module's path so it is never built, indexed or listed in the sitemap. |
| `events.rb` | Merges `_data/events.yml` with per-cohort events into `site.data.events_all` for the events/cohort layouts. |

All plugins are pure Ruby with no gems beyond Jekyll; GitHub Pages builds them because `pages.yml`
runs Jekyll in Actions (not the legacy Pages builder, which disallows plugins).

### Templates and their contracts

- `_layouts/default.html` — shell (head, header, footer, skip link). Accepts a `scripts:` list in
  page or layout front matter and emits deferred `<script>` tags for each.
- `_layouts/catalog.html` + `index.md`-style pages — filter rail (`filter-rail.html`), results header,
  mobile filter sheet, `<ul data-entry-grid>` of `entry-card.html`. Cards carry `data-facet-*` and
  `data-sort-*` attributes; `assets/js/filters.js` filters/sorts them in place from URL state and
  `search.js` narrows further via `window.__searchMatches` (see the header comment in each file).
- `_layouts/entry.html` — header, fact strip, gallery, main sections (`schema.groups` with
  `placement: main`), sticky rail (`placement: rail` groups via `reuse-card.html`), TOC, related rows.
- `submit/index.md` — one sectioned page; `assets/js/submit.js` orchestrates `submit/{fields,
  validate,repeatable,preview,draft,handoff}.js` and hands off to a prefilled `new-entry.yml` issue.

Two Liquid gotchas govern the include style (details in `CLAUDE.md`): assigns inside an include
leak into the caller, so every include prefixes its variables (`ec_`, `fv_`, `gal_` …); and include
parameters cannot use bracket access, so lookups are assigned to a variable first.

### Automation

Each workflow in `.github/workflows/` pairs with one script and passes the issue through
`ISSUE_BODY` / `ISSUE_TITLE` environment variables — the scripts make no GitHub API calls, so they
run identically in tests.

| Workflow | Trigger | Script | Result |
|---|---|---|---|
| `new-entry.yml` | issue labelled `new-entry` | `scripts/new_entry_from_issue.mjs` (+ `lib/issue_body`, `lib/images`, `lib/yaml`) | PR adding `catalog/<slug>/` with downloaded screenshots |
| `thumbnails.yml` | PR touching `catalog/**` | `scripts/thumbnail_sources.mjs` + `pdftoppm` | commits `thumb.jpg` from `deck.pdf` |
| `new-event.yml`, `new-year.yml`, `update-schedule.yml`, `update-event-attachments.yml` | issue templates for the events/cohorts modules | matching `scripts/*` | PRs against `_data/` |
| `validate.yml` | PR / push | `generate.mjs --check`, `npm test`, `npm run test:ruby`, `npm run validate`, CSS + Jekyll build | the merge gate |
| `quality.yml` | PR / push to main | `pa11y-ci` (WCAG 2 AA) + Lighthouse CI over `_site` | accessibility gate; performance/SEO warn |
| `pages.yml` | push to main | CSS build + Jekyll build with the repo-derived `baseurl` | deploys to GitHub Pages |
| `smoke.yml` | weekly | full build | catches upstream breakage |
| `bootstrap-labels.yml` | manual | — | creates the labels the automation relies on |

`scripts/setup.mjs` and `setup/` share `assets/js/configurator/core.js`; `renderFiles()` is the single
place that turns answers into files, so both configurators cannot drift. Browser-only helpers sit
beside it — `dom.js` (element builder), `theme-preview.js` (the Branding step's live miniature,
which re-declares the same CSS variables `_includes/theme.html` writes) — and are not imported by
the CLI.

### Styling

Tokens (`theme.yml` colours, fonts, radius) become CSS variables in `_includes/theme.html`;
`tailwind.config.js` maps them to `brand-*` / `surface-*` colours so components use semantic names,
never hex. Component classes live in `assets/css/components/<surface>.css` and are `@apply`
compositions; a `safelist` keeps the dynamically composed `badge-*`, `chip-*`, `signal-*` tone
classes from being purged. `assets/css/site.css` is build output (`npm run build:css`) and is not
committed. Fonts are self-hosted latin woff2 subsets (`assets/fonts/README.md`).

### Testing

- `npm test` — Node's built-in runner over `test/**/*.test.mjs`: configurator modules, issue-body
  parsing, image download rules, YAML emission, and jsdom tests of the submit form.
- `npm run test:ruby` — minitest for `scripts/check_front_matter.rb`.
- `npm run validate` — parses every `_data/*.yml`, then runs the front-matter and file-size checks.
- `npm run a11y` / `npm run lighthouse` — the same audits `quality.yml` runs, against a local server
  on port 4173 (see `CONTRIBUTING.md`).

## Design principles

1. **Configuration over code.** A deployment should never need to touch a template.
2. **Static and dependency-light.** No framework, no bundler; each JS file is one readable IIFE.
   Anything heavier than that has to justify itself against "a health department maintains this."
3. **Progressive enhancement.** Every page is complete server-rendered HTML; JS adds filtering,
   search, previews and drafts on top.
4. **Accessible by construction.** WCAG 2.2 AA is a checklist in `docs/design-brief.md` and a CI
   gate in `quality.yml`, not an afterthought.
5. **GitHub is the workflow.** Review, history, permissions and rollback all come from git.
