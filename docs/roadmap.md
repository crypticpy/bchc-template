# Roadmap — v1.0 "world-class" pass

Status legend: ☐ not started · ◐ in progress · ☑ done. Decisions taken are recorded so the reasoning survives.

## Decisions

Decisions live in [docs/decisions.md](decisions.md) — the canonical, append-only log of
every contestable call and why it was made. The entries that used to be listed here have
moved there unchanged. Record new ones there, not in this file: the roadmap is a build log
and gets rewritten each phase, the decision log does not.

## Phases

| # | Phase | Scope | Exit check | Status |
|---|---|---|---|---|
| 0 | Design brief | Persona panel → visual direction, principles, review rubric (`docs/design-brief.md`) | direction chosen: “Quiet Instrument” | ☑ |
| 1 | Content model v2 + engine | New field types `images`, `links`; `option_meta` (short/icon/tone/description); hints `card`/`weight`/`icon`/`group`/`prompt`; theme tokens `warn`/`line_strong`; schema v2 for the AI-use-case preset; every consumer updated (renderers, forms, generator, scaffolder incl. screenshot download, validator, configurator core split + YAML-derived defaults, search); workflow permissions/pins; thumbnails rendered with `pdftoppm` | `npm run validate`, all presets build, tests green | ☑ |
| 2 | Catalog UI | Card redesign with at-a-glance strip; grouped facets with live counts, sort, list/grid, mobile drawer; entry page (fact strip, gallery + lightbox, TOC, reuse card, related); home "browse by" | screenshot + jsdom review, panel #1 | ☑ (panel #1 findings fixed 2026-08-17: focus rings, contrast, signal-strip include, group placement, eager LCP images) |
| 3 | Submit wizard | Schema-driven steps, live card preview, autosave, inline validation, what-happens-next, fallbacks | form → prefilled issue → PR end-to-end | ☑ (issue #1 → PR #2 verified 2026-08-17) |
| 4 | Design system + gates | Tokens, component includes, `/styleguide/`, `docs/design-system.md`, axe/pa11y + Lighthouse CI | Lighthouse ≥95 perf/a11y, axe clean | ☑ (quality.yml: pa11y-ci 14/14 clean, Lighthouse 98–100 all categories; woff2 subsets; `/styleguide/` + `docs/design-system.md`) |
| 5 | Content + docs + tests | 8–10 samples across health and back-office, contributor & writing guides, ARCHITECTURE, CONTRIBUTING, JSDoc/YARD, unit tests, lint in CI | panel #2 | ☑ (10 samples, ARCHITECTURE/CONTRIBUTING/SECURITY, ESLint + Prettier in CI, 223 node + 67 Ruby tests at the time (239 + 77 at v1.0.0), JSDoc/YARD pass, CHANGELOG; panel #2 held 2026-08-17 — scores Visual 4 / Interaction 3 / A11y 4 / FE code 3 / Architecture 4 / Docs 4; all P1 and P2 findings fixed, pa11y-ci 17/17 incl. interactive states, Lighthouse green) |
| 6 | Configurator | Preset gallery, live theme preview, light field builder, CLI parity | presets round-trip | ☑ (Start step is the preset gallery; Branding step renders the real components under the chosen palette/type/radius; field builder gained a card-slot picker; `--yes --dry-run` CLI parity and presets round-trip covered by tests) |
| 7 | Release | Final panel, release notes, tag v1.0 | no P1/P2 findings | ☑ (final panel held 2026-08-17 — scores Visual 8 / Interaction 7 / Consistency 8 / Architecture 8 / Documentation 6 / Pipeline security 6 out of 10; every P1 and P2 fixed: focus outline for scripted headings, filter-rail fade, carousel widths, applied-search status, grid alignment, review file cards, wizard step-pill validation, colour-question parity, submit-form labelling, path confinement and heredoc/output hardening across the event scripts, `SUBMISSIONS_OPEN` on every issue workflow, SECURITY.md accuracy, fork repository check; the four P3s — entry rail beside the header on wide screens, ragged fact-strip cells, filter-pill sizing, a search box on the 404 page — were closed in v1.1.0 the same day. Released as v1.0.0.) |

## Content model v2 (AI-use-case preset) — target field list

organization · solution_type · **area** · **ai_role** · **ai_types** · ai_tools · **platform** · **expertise** · **readiness** · **data_sensitivity** · **audience** · stage · **impact** · repo_url · demo_url · docs_url · **resources** (links) · **screenshots** (images) · vendor · data_sources · contact_name · contact_email · deck_pdf · body
