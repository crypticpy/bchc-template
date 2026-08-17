# Roadmap — v1.0 "world-class" pass

Status legend: ☐ not started · ◐ in progress · ☑ done. Decisions taken are recorded so the reasoning survives.

## Decisions (2026-08-17)

- **Area, not department.** The broad tagging field is `area` ("Area of work"). Organizations split themselves into departments/divisions/units/programs differently, so the wording stays neutral and the option list mixes program areas with business functions (HR, procurement, IT, legal, coordination…).
- **Screenshots live in the repo.** Submitters drag images into the GitHub issue; the scaffolder downloads them into `catalog/<slug>/screenshots/` so entries stay durable and offline-buildable. Remote URLs are still accepted for hand-authored entries.
- **Readiness is one multiselect of flags** (`readiness`), each option carrying an icon/tone. Simpler to author, filter and render than several booleans.
- **Light mode only** for now. Theme tokens stay the single source of colour so dark mode can be added later without touching components.
- **Configurator field builder is phase 6** — everything else ships first.
- **Quality bar** is checked by a persona review panel (design principal · civic digital-service UX/a11y lead · staff front-end engineer · non-technical program manager · technical writer) at three checkpoints; we iterate until no P1/P2 findings remain.

## Phases

| # | Phase | Scope | Exit check | Status |
|---|---|---|---|---|
| 0 | Design brief | Persona panel → visual direction, principles, review rubric (`docs/design-brief.md`) | direction chosen: “Quiet Instrument” | ☑ |
| 1 | Content model v2 + engine | New field types `images`, `links`; `option_meta` (short/icon/tone/description); hints `card`/`weight`/`icon`/`group`/`prompt`; theme tokens `warn`/`line_strong`; schema v2 for the AI-use-case preset; every consumer updated (renderers, forms, generator, scaffolder incl. screenshot download, validator, configurator core split + YAML-derived defaults, search); workflow permissions/pins; thumbnails `magick`→IM7 fix | `npm run validate`, all presets build, tests green | ☑ |
| 2 | Catalog UI | Card redesign with at-a-glance strip; grouped facets with live counts, sort, list/grid, mobile drawer; entry page (fact strip, gallery + lightbox, TOC, reuse card, related); home "browse by" | screenshot + jsdom review, panel #1 | ☑ (panel #1 findings fixed 2026-08-17: focus rings, contrast, signal-strip include, group placement, eager LCP images) |
| 3 | Submit wizard | Schema-driven steps, live card preview, autosave, inline validation, what-happens-next, fallbacks | form → prefilled issue → PR end-to-end | ☑ (issue #1 → PR #2 verified 2026-08-17) |
| 4 | Design system + gates | Tokens, component includes, `/styleguide/`, `docs/design-system.md`, axe/pa11y + Lighthouse CI | Lighthouse ≥95 perf/a11y, axe clean | ☑ (quality.yml: pa11y-ci 12/12 clean, Lighthouse 98–100 all categories; woff2 subsets; `/styleguide/` + `docs/design-system.md`) |
| 5 | Content + docs + tests | 8–10 samples across health and back-office, contributor & writing guides, ARCHITECTURE, CONTRIBUTING, JSDoc/YARD, unit tests, lint in CI | panel #2 | ◐ (10 samples, ARCHITECTURE/CONTRIBUTING/SECURITY, ESLint + Prettier in CI, 171 node + 14 Ruby tests, JSDoc/YARD pass, CHANGELOG done; panel #2 remaining) |
| 6 | Configurator | Preset gallery, live theme preview, light field builder, CLI parity | presets round-trip | ☑ (Start step is the preset gallery; Branding step renders the real components under the chosen palette/type/radius; field builder gained a card-slot picker; `--yes --dry-run` CLI parity and presets round-trip covered by tests) |
| 7 | Release | Final panel, release notes, tag v1.0 | no P1/P2 findings | ☐ |

## Content model v2 (AI-use-case preset) — target field list

organization · solution_type · **area** · **ai_role** · **ai_types** · ai_tools · **platform** · **expertise** · **readiness** · **data_sensitivity** · **audience** · stage · **impact** · repo_url · demo_url · docs_url · **resources** (links) · **screenshots** (images) · vendor · data_sources · contact_name · contact_email · deck_pdf · body
