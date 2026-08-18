# Decisions

Why the template is the way it is. Append-only: when a decision is reversed, add a new entry that
says so rather than editing the old one, so the reasoning survives alongside the change.

Decisions that only affect one file are recorded in that file's header comment instead. What is
here is the set a contributor would otherwise have to guess at.

---

## 2026-08-17 — Area, not department

The broad tagging field is `area` ("Area of work"). Organizations split themselves into
departments, divisions, units and programs differently, so the wording stays neutral and the option
list mixes program areas with business functions (HR, procurement, IT, legal, coordination…).

## 2026-08-17 — Screenshots live in the repository

Submitters drag images onto the GitHub issue; the scaffolder downloads them into
`catalog/<slug>/screenshots/` so entries stay durable and the site builds offline. Remote URLs are
still accepted for hand-authored entries. The cost is repository size and a takedown that has to
reach git history — see [incidents.md](incidents.md).

## 2026-08-17 — Readiness is one multiselect of flags

`readiness` is a single multiselect whose options each carry an icon and a tone, rather than
several booleans. Simpler to author, to filter and to render, and adding a flag is a line in
`_data/schema.yml` instead of a field.

## 2026-08-17 — Light mode only, for now

Theme tokens stay the single source of colour, so dark mode can be added later without touching
components. Shipping one mode well beat shipping two modes with untested contrast pairs.

## 2026-08-17 — Tailwind stays on 3.4

Tailwind 4's browser floor (Safari 16.4 / Chrome 111 / Firefox 128) is too high for a public-sector
audience on managed and older devices, and it fails hard rather than gracefully below it. Recorded
under "Browser support" in [design-system.md](design-system.md); Dependabot ignores the major.

## 2026-08-17 — The schema is the source of truth

No layout, include, script or workflow names a field key. Everything iterates
`_data/schema.yml`'s `fields` and acts on presentation hints (`facet`, `card`, `weight`, `group`,
`placement`, `option_meta`…). It is what makes the template retargetable at all: rename the entry
noun and the fields, and the forms, filters, cards, search index and validator follow. The price is
that a feature needing a new per-entry attribute must be added as a schema field rather than
bolted on. See [content-model.md](content-model.md).

## 2026-08-17 — Entry bodies render with `render_with_liquid: false`

An entry's body comes from an issue that anyone can open. Scaffolded entries set
`render_with_liquid: false` in their front matter, so a body containing `{{ … }}` or `{% … %}` is
printed rather than executed at build time. See [SECURITY.md](../SECURITY.md).

## 2026-08-17 — No generated placeholder images

`_includes/entry-thumb.html` resolves a real image or emits nothing at all, and callers omit the
whole media band when it does. A generated gradient or initial-letter tile makes every card look
equally complete, which is exactly the signal a catalog for evaluation must not send.

## 2026-08-17 — `x.first` is the array test, and include assigns are prefixed

A schema field's value may be a scalar (`text`, `select`) or a list (`list`, `multiselect`), and
Liquid has no type test: a string's `.first` is `nil`, an array's is truthy. Every template uses
`{% if v.first %}` for this. Separately, Jekyll's `{% include %}` shares the caller's variable
scope (unlike Shopify's sandboxed `render`), so assigns inside `_includes/*.html` are prefixed
(`ec_`, `fv_`, `es_`…) to keep them from clobbering the caller's. Both rules are in `CLAUDE.md`
and `CONTRIBUTING.md`.

## 2026-08-17 — Documentation is repository Markdown, not a docs site

`_config.yml` excludes `docs/` from the Jekyll build. A docs site would be a second thing to theme,
deploy, keep in sync and explain, on a project whose premise is that a health department maintains
it. Every reader of these files is already on GitHub.

## 2026-08-17 — The "Recently added" grid is hidden at `lg` and up

At wide widths the hero already lists the newest entries beside it and the carousel is showing
cards, so a third "what's new" block above the fold says the same thing a third time. The section
stays for narrow screens, where the hero list is hidden. Recorded here because the
`lg:hidden` in `index.md` looks like a mistake otherwise.

## 2026-08-17 — Quality is checked by a persona review panel

A panel (design principal · civic digital-service UX/a11y lead · staff front-end engineer ·
non-technical program manager · technical writer) reviews at fixed checkpoints, and we iterate
until no P1 or P2 findings remain. Automated gates catch regressions; the panel catches the things
that are working as coded and wrong for the reader.
