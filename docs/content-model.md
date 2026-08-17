# Content model reference

`_data/schema.yml` is the single source of truth for what an entry is. Everything downstream reads it at build time or generation time — no field key is hardcoded anywhere else:

- Catalog cards and the entry page — `_includes/entry-card.html`, `_includes/entry-row.html`, `_layouts/entry.html`, `_includes/field-value.html`, `_includes/entry-thumb.html`
- Filters and search — `_includes/filter-rail.html`, `_includes/filter-groups.html`, `_includes/filter-sheet.html`, `_plugins/search_index.rb` (`/search.json`)
- The presentation rules themselves — `_plugins/schema_filters.rb`, the Liquid filters that resolve `card`, `weight`, `group`, `option_meta` in one place
- The public `/submit/` form — `submit/index.md`, `assets/js/submit.js`
- The GitHub issue form — `.github/ISSUE_TEMPLATE/new-entry.yml` (generated; do not hand-edit)
- The issue → pull request scaffolder — `scripts/new_entry_from_issue.mjs`
- Front-matter validation in CI — `scripts/check_front_matter.rb`
- Both configurators — `assets/js/configurator/defaults.generated.js` (generated from `_data/*.yml`)

Change a field, run `npm run generate`, and the submission form, issue template, wizard defaults and validator all follow.

## Top-level structure

```yaml
entry:
  singular: "Use case"     # how one entry is referred to in the UI
  plural: "Use cases"
  path: "catalog"          # folder + URL base for entries — keep as "catalog" unless you know why
  sort: "published"        # default catalog ordering key
  sort_order: "desc"       # asc | desc

groups:                    # ordered; group filters and submit-form sections
  - key: about
    title: "About"
    description: "What it is, who built it, and what it changed."
  - key: contact
    title: "Contact"
    description: "Someone others can reach out to."
    placement: rail        # main (default) | rail — see below

fields:
  - key: …
```

`entry.path` is also read by `_plugins/modules.rb` (to know which pages belong to the `catalog` module) and by every script that scaffolds or reads entries.

### Groups

A group is `{key, title, description?, icon?, placement?}`. `key` is what a field's `group` points at; `title` heads the filter block, the submit-form step and the entry-page section.

| Property | Meaning |
|---|---|
| `key` | `snake_case`, unique. Fields with no `group` fall into `other` ("More"). |
| `title` | Required. Heading shown in filters, the submit form and on the entry page. |
| `description` | Optional one-liner under the heading in the submit form. |
| `icon` | Optional icon name from `_includes/icon.html`, shown beside a rail card's heading. |
| `placement` | `main` (default) or `rail`. **Entry page only** — a `rail` group becomes a sidebar card instead of a body section. Everywhere else (filters, submit form, issue template) placement is ignored. |

`placement: rail` is for the short, act-on-it groups: the links someone follows to reuse the thing, and the person they email. The rail is 280px and sticky, so a group whose fields hold sentences belongs in `main`. Inside a rail card the entry page renders, in order: a person block when the group has an `email` field with a value (plus the first `text` field of the same group as the name), each `links` field as a compact icon + label + host list, then everything else as a label/value list. `url` fields are skipped — they are already the primary buttons in the page header — as are fields the header, fact strip or gallery has shown. A rail group whose fields are all empty or already shown renders nothing at all.

## Reserved keys

`title`, `slug`, `summary`, `published`, `thumbnail` and `featured` are present on every entry whether or not you list them under `fields`, plus an optional `updated`.

| Key | Set by | Notes |
|---|---|---|
| `title`, `summary` | Submitter | Declare them as fields too, so they appear in the forms. Always indexed for search. |
| `slug` | Automation | Must equal the entry's folder name — CI fails otherwise. |
| `published` | Automation | `YYYY-MM-DD`. The default sort key. |
| `updated` | Maintainer | Optional `YYYY-MM-DD`. When present, the entry page shows "Updated …" alongside the published date, and "Recently updated" sorting uses it. Set it when the content materially changes, not for typo fixes. |
| `featured` | Maintainer | `true` pins the entry into the home carousel and shows a Featured badge. Maintainer-only; there is no submitter path to it. |
| `thumbnail` | Maintainer | Optional image path. First choice for the card image, ahead of any `images` field. |

Sample entries shipped with the template also carry `sample: true`, which is how `npm run setup` recognises removable demo content. Your own entries should not have it.

## Field spec

Each item under `fields` is a hash:

| Property | Meaning |
|---|---|
| `key` | Front-matter key. `snake_case`, unique, required. |
| `label` | Short human label used on cards, filters and the entry page. Required, unique. Keep it short — it has to fit a filter header. |
| `prompt` | Optional question-style label for the submission forms ("What kind of data does it touch?"). Falls back to `label`. The web form shows the prompt as the question; the issue template keeps `label` as the heading (the scaffolder finds answers by it) and puts the prompt into the help text. |
| `type` | See [field types](#field-types). |
| `required` | `true`/`false` (default `false`). Enforced in both forms and by `check_front_matter.rb`. |
| `description` | Help text shown under the field in forms. |
| `placeholder` | Example text shown in forms. |
| `options` | Allowed values — `select` and `multiselect` only. A plain list of strings. |
| `option_meta` | Per-option presentation. See [option metadata](#option-metadata). |
| `facet` | `true` → the field appears in the filter panel. `select` becomes a single-choice filter; everything else is any-of. Facet fields are always in the search index. |
| `card` | Whether and how the field shows on a catalog card. See [card slots](#card-slots). |
| `weight` | `1`–`9`, default `5`. Ordering within a card slot, the entry fact strip, a filter group and a sidebar section — and the truncation order when a slot is full (lower weight survives). |
| `icon` | Icon name from `_includes/icon.html`. Used for the filter group header, the fact strip, `card: line`, and as the fallback for `card: icon`. |
| `group` | A key from the top-level `groups` list. Drives filter grouping and the sections of the submit form. Fields with no group fall into "More". |
| `search` | `true` → the value is included in `/search.json`. `title` and `summary` and every facet field are indexed regardless. |
| `form` | `false` → hidden from both submission forms. For maintainer-only fields. |
| `filename` | `file` fields only. The expected filename in the entry folder, e.g. `deck.pdf`. |
| `thumbnail` | `file` fields only. `true` → CI renders `thumb.jpg` from the PDF's first page. |

### Field types

| Type | Front-matter value | Notes |
|---|---|---|
| `text` | string | Single line. |
| `textarea` | string | Multi-line plain text. |
| `markdown` | — | Becomes the page **body**, not a front-matter key. Only one field may be `markdown`. |
| `url` | string | Must start with `http://` or `https://`. Rendered as a link with a host label. |
| `email` | string | Must contain `@`. Rendered as a `mailto:` link. |
| `select` | string | One value from `options`. |
| `multiselect` | list of strings | Any number of values from `options`. |
| `list` | list of strings | Free-form: one per line in the issue form, comma-separated in the web form. |
| `date` | `YYYY-MM-DD` | Rendered as "March 9, 2026". |
| `number` | number | No range validation. |
| `boolean` | `true`/`false` | Rendered as Yes/No. |
| `file` | string (path) | An attachment added to the entry folder in the pull request; front matter stores `/<entry.path>/<slug>/<filename>`. |
| `image` | string (path or URL) | A single image. When the key is `thumbnail`, it is the card image. |
| `images` | list — see below | A gallery. |
| `links` | list of `{label, url}` — see below | Labelled links. |

### `images`

Each item is either a bare string (the `src`) or a mapping with `src` and `alt`. Always write the mapping form — alt text is what makes the gallery usable.

```yaml
screenshots:
  - src: /catalog/epi-signal-triage/screenshots/01.png
    alt: "Triage queue listing seven ranked signals with area, signal strength and status."
  - src: /catalog/epi-signal-triage/screenshots/02.png
    alt: "Draft triage note beside a bar chart of daily visit counts, marked as awaiting review."
```

- **Where the files live**: inside the entry's own folder, conventionally `catalog/<slug>/screenshots/`. The scaffolder writes them as `01.png`, `02.jpg`, … in the order the submitter attached them.
- **What `src` looks like**: a site-absolute path starting with `/` (this is what the automation writes, and what the templates resolve through `relative_url`, so it survives a project-page `baseurl`). A path relative to the entry folder (`screenshots/01.png`) also validates, and an `http(s)` URL is accepted but warned about — a remote image breaks when someone else's host changes.
- **What renders**: the entry page shows a thumbnail grid that opens a keyboard-navigable lightbox, captioned from `alt`. The first image is also the card image when the entry has no explicit `thumbnail`. An entry with no images gets a text-first card, not a placeholder graphic.
- **Alt text**: describe what the picture shows, in one sentence under about 125 characters. "Screenshot of the tool" is not alt text. Do not repeat the entry title.
- **Validation**: every item needs a non-blank `src`; a local `src` must exist on disk inside the entry folder; missing `alt` is a warning, not a failure.

### `links`

A list of `{label, url}` mappings. Both keys are required.

```yaml
resources:
  - label: "Evaluation notebook (PDF)"
    url: "https://docs.example.gov/lakeshore/signal-triage-evaluation.pdf"
  - label: "Walkthrough video (8 minutes)"
    url: "https://videos.example.org/share/spike-brief-walkthrough"
```

Use it for anything that does not deserve its own `url` field — shared drives, model cards, container images, vendor pages, recorded demos. The forms accept one per line as `Label | URL`; the scaffolder also tolerates `Label — URL`, `Label: URL`, and a bare URL (which gets the host as its label). Rendered on the entry page as a labelled row with a host chip (in the rail when its group has `placement: rail`). `mailto:` is allowed; everything else must be `http(s)`.

## Option metadata

`options` stays a plain list of strings. `option_meta` adds presentation for any of them:

```yaml
data_sensitivity:
  type: multiselect
  options:
    - "Public data only"
    - "Health information (PHI)"
  option_meta:
    "Public data only": { short: "Public data", icon: globe, description: "Only data that is already public." }
    "Health information (PHI)": { short: "PHI", icon: shield, tone: warn, description: "Identifiable health information covered by HIPAA." }
```

| Key | Meaning |
|---|---|
| `short` | Up to 14 characters. Replaces the full value on badges, chips, filters and the fact strip. The full value stays available as a tooltip and to screen readers. |
| `icon` | Icon name from `_includes/icon.html`. Defaults to the field's `icon`. |
| `tone` | `neutral` (default) \| `primary` \| `secondary` \| `accent` \| `warn`. **`warn` means caution** — sensitive data, a licence cost, something a reader must not miss. Do not use it for emphasis; if everything is a warning, nothing is. |
| `description` | One line defining the option. Shown under the option in the submission forms and as a tooltip. This is where plain language belongs. |

Every option is usable without metadata — an option with no entry renders as its own text, with the field's icon and a neutral tone.

## Card slots

`card` decides whether a field reaches the catalog card, and which slot it lands in.

| `card` value | Where it renders |
|---|---|
| `false` or omitted | Not on the card. |
| `true` | The type default: `select` → badge, `text` → meta, `list`/`multiselect` → chip. |
| `badge` | A pill over the image (or inline in the meta line when the entry has no image). |
| `meta` | A small line above the title, segments joined with `·`. |
| `line` | One short line under the summary, prefixed by the field's icon. Meant for a result or impact statement. |
| `chip` | Chips in the card footer. |
| `icon` | The at-a-glance signal strip: one glyph per value, each with a screen-reader label of `<label>: <value>`. |

Slot caps are enforced by the templates, not by the schema: **one** badge field, **two** meta segments, **one** chip family (2 chips then `+n`), **four** icon glyphs total. When a slot overflows, lower `weight` survives. This is why weight matters more than it looks: it is the only control you have over what a reader sees in the two seconds they spend on a card.

Deliberately not on the card: platform, tools, vendor, data sources, contact, links and the gallery. They belong to the entry page.

## Search and facets

- **`search: true`** adds the field's text to `/search.json`. `title`, `summary` and every facet field are always indexed, so set `search` only for free-text fields worth matching on — tool names, vendors, data sources.
- **`facet: true`** puts the field in the filter rail, grouped by `group` and ordered by `weight`. Filters work best on fields with a bounded set of values: `select` and `multiselect` from `options`, or a `list` whose values repeat across entries. A facet over free text produces a filter with one option per entry, which helps nobody.

## Shipped fields (AI use case catalog)

26 fields in six groups. `body` is the page body; everything else is front matter.

| Key | Type | Group | Req | Facet | Card | Weight |
|---|---|---|:--:|:--:|---|:--:|
| `title` | text | about | yes | | (heading) | 1 |
| `summary` | textarea | about | yes | | (summary) | 2 |
| `impact` | text | about | | | line | 3 |
| `organization` | text | about | yes | yes | meta | 4 |
| `solution_type` | select | about | yes | yes | badge | 5 |
| `area` | multiselect | about | yes | yes | chip | 6 |
| `stage` | select | about | yes | yes | meta | 7 |
| `ai_role` | select | build | yes | yes | | 1 |
| `ai_types` | multiselect | build | | yes | | 2 |
| `ai_tools` | list | build | | yes | | 3 |
| `platform` | multiselect | build | | yes | | 4 |
| `vendor` | text | build | | | | 5 |
| `expertise` | select | reuse | yes | yes | icon | 1 |
| `readiness` | multiselect | reuse | | yes | icon | 2 |
| `repo_url` | url | reuse | | | | 3 |
| `demo_url` | url | reuse | | | | 4 |
| `docs_url` | url | reuse | | | | 5 |
| `resources` | links | reuse | | | | 6 |
| `screenshots` | images | reuse | | | (card image) | 7 |
| `deck_pdf` | file (`deck.pdf`) | reuse | | | | 8 |
| `data_sensitivity` | multiselect | data | yes | yes | icon | 1 |
| `data_sources` | list | data | | | | 2 |
| `audience` | select | data | yes | yes | icon | 3 |
| `contact_name` | text | contact | yes | | | 1 |
| `contact_email` | email | contact | yes | | | 2 |
| `body` | markdown | story | yes | | | 1 |

## Worked example

A complete entry, `catalog/epi-signal-triage/index.md`:

```yaml
---
layout: entry
title: "Syndromic surveillance signal triage assistant"
slug: epi-signal-triage
summary: "Reads the daily syndromic alert export, drafts a plain-language note for each signal, and ranks the ones an epidemiologist should open first."
published: 2026-06-18
updated: 2026-07-30
featured: true
impact: "Cut daily alert review from 90 to 30 minutes for two analysts"
organization: "Lakeshore City Department of Public Health"
solution_type: "Source code"
area:
  - "Epidemiology & surveillance"
  - "Data & informatics"
stage: "Pilot"
ai_role: "AI is part of the solution"
ai_types:
  - "Generative text (LLM)"
  - "Classification & NLP"
ai_tools:
  - "Claude (API)"
  - "Python"
platform:
  - "Microsoft Azure"
expertise: "Analyst or data scientist"
readiness:
  - "Needs customization"
  - "Human review built in"
repo_url: "https://github.com/example-org/signal-triage"
docs_url: "https://github.com/example-org/signal-triage/wiki"
resources:
  - label: "Evaluation notebook (PDF)"
    url: "https://docs.example.gov/lakeshore/signal-triage-evaluation.pdf"
screenshots:
  - src: /catalog/epi-signal-triage/screenshots/01.png
    alt: "Triage queue listing seven ranked signals with area, signal strength and status."
data_sensitivity:
  - "De-identified data"
  - "Internal, non-public data"
data_sources:
  - "Syndromic surveillance alert export"
  - "Facility visit counts"
audience: "Internal staff"
contact_name: "Priya Natarajan"
contact_email: "priya.natarajan@example.org"
---

## Problem

…the markdown field's content becomes the page body…
```

Rules the validator enforces: `slug` equals the folder name, `published` (and `updated` when present) is a real `YYYY-MM-DD` date, every required field is non-blank, `select`/`multiselect` values appear verbatim in `options`, `url` fields are `http(s)`, `email` fields contain `@`, `images` point at files that exist, `links` have a label and a URL.

The ten sample entries under `catalog/` are working examples of every field type in this schema.

## Designing your taxonomy

The schema is the product. A weak field list produces a catalog nobody filters, and no amount of layout work fixes it.

**Start from the decision, not the data.** Write down the question a visitor arrives with — "could my team reuse this?", "who else has solved this?", "which of these can I run without a developer?" — and keep only the fields that answer one of them. Fields that merely describe an entry belong in the write-up.

**Six to nine facets is the ceiling.** Every extra filter costs attention and thins the result counts. If two facets always move together, merge them.

**Keep option lists short and mutually exclusive.** Five to eight options per `select` is comfortable; a `multiselect` can carry more if the options are genuinely independent. Options that overlap ("Housing" and "General housing") produce inconsistent entries — merge them the moment you notice submitters choosing between them.

**Cover business functions, not just programs.** Some of the most reusable entries come from areas that never appear in a program taxonomy: hiring, procurement, contracts, IT operations, legal review, coordinating partners. If your area list only names programs, those entries have nowhere to go and never get written.

**Write `option_meta.description` for every option a submitter could misread.** It is the cheapest accuracy improvement available: it appears in the submission form at the moment of choosing, which is where a wrong value is created.

**Use `warn` sparingly.** Reserve it for the two or three things a reader must not miss. Everything else is neutral.

**Assign `weight` on purpose.** For each card slot, decide what a reader should see first when only one value fits. Weight is that decision, written down.

**Group fields by how someone thinks, not by data type.** The shipped groups — about, how it's built, reuse, data & access, contact, the story — are the order in which an evaluator asks questions, which is also a workable order for a submission form.

**Say "organization" rather than naming an internal unit.** A shared catalog is read by people whose org chart differs from yours; a field called "department" quietly excludes anyone who does not have one.

## Changing the schema

1. Edit `_data/schema.yml` — add, rename, remove or reorder fields. Order within a group affects form and sidebar order; `weight` affects card, filter and fact-strip order.
2. Run `npm run generate` to rebuild `.github/ISSUE_TEMPLATE/new-entry.yml` and `assets/js/configurator/defaults.generated.js`.
3. Run `npm run validate` to confirm the schema and existing entries are still consistent.
4. **Renaming or removing a field does not update existing entries.** Their front matter keeps the old key until someone edits the Markdown; `check_front_matter.rb` flags entries missing a newly-required field.
5. Commit the schema change and the regenerated files together.

## Cohort/program data (module: `cohorts`)

Each `_data/cohorts/<year>.yml` file describes one cohort page (`cohorts/<year>/index.md`, `layout: cohort`):

```yaml
title: "AI Practice Cohort 2026"
events:
  - id: kickoff
    name: "Cohort kickoff"
    date: 2026-09-09
    time: "12:00–1:30 PM ET"
    location: "Zoom"
    type: "Session"
    description: "…"
materials:
  program_guides:            # group key -> heading, title-cased ("Program guides")
    - title: "Cohort handbook"
      type: "guide"
      url: "https://…"
policies:
  - "Teams work only with data they are already authorised to use."
```

- `materials` is a **hash** of group key → list of `{title, url, type}`; the key becomes the section heading with underscores turned into spaces (`_includes/materials.html`).
- `policies` is a flat list of strings.
- `events` here are merged with `_data/events.yml` by `_plugins/events.rb` into `site.data.events_all`.
- Entries join a cohort through a schema field whose value matches the year (e.g. a `cohort` `select` with `facet: true`). The shipped AI-catalog schema does not define one — add it if you want cohort filtering.
- Cohort event detail pages live at `cohorts/<year>/events/<event-id>/index.md` (`layout: event`) and inherit date/time/location from the matching cohort event unless overridden.

## Events data (module: `events`)

`_data/events.yml` is a flat list:

```yaml
- id: ai-community-call-sept
  name: "AI in Public Health Community Call"
  date: 2026-09-16
  time: "1:00–2:00 PM ET"
  location: "Zoom"
  url: "https://example.org/community-call"
  type: "Webinar"
  description: "…"
```

`end_date` is optional (multi-day events). `_plugins/events.rb` normalizes and merges this list with every cohort's events into `site.data.events_all`, sorted by date, with a computed `past` boolean and a `page_url` for cohort events that have a page.

## Resource library data (module: `resources`)

`_data/resources.yml` is a list of groups:

```yaml
- group: "Getting started"
  description: "…"          # optional
  items:
    - title: "Responsible AI use checklist"
      url: "https://…"
      type: "Guide"           # optional; shown as a chip
      description: "…"        # optional
```
