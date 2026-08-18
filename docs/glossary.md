# Glossary

The words this project uses, in the sense it uses them. One line each, written for the person
maintaining a catalog rather than the person building the template.

**entry** — one published thing in the catalog: one folder under `catalog/`, one page on the site,
one card in the grid. What an entry *is* (a use case, a project, a resource) is up to your schema.

**slug** — the short, hyphenated name in an entry's web address. `catalog/overdose-spike-brief/`
has the slug `overdose-spike-brief`; it must match the folder name exactly, which is what the "slug
must equal the folder name" validation error is telling you.

**front matter** — the block of `key: value` lines between the two `---` markers at the top of an
entry file. It holds the answers to the form; everything after it is the write-up.

**schema** — `_data/schema.yml`, the file that defines every field an entry has and how each one is
presented. Nothing else in the project names a field, so this file is the content model.

**field** — one question in the schema: a key, a label, a type, and hints about where its answer
shows up. `title`, `organization`, `readiness` are fields.

**option** — one of the fixed choices a `select` or `multiselect` field offers. `option_meta` adds
a short label, an icon, a tone and a description to an option.

**facet** — a field marked `facet: true`, which becomes a filter in the catalog's left-hand rail
with a live count beside each option.

**card slot** — where a field's value lands on a catalog card. The slots are `media`, `badge`,
`meta`, `line`, `chip` and `icon`; a field opts into one with `card:`, and the card template
enforces how many values each slot will show.

**chip** — a small rounded label on a card or entry page, used for one family of taxonomy values.

**signal strip** — the row of icon-plus-value pairs along the bottom of a card, built from the
fields marked `card: icon`. It is the "could my team reuse this?" line.

**group** — a named section of the entry form and the entry page sidebar (About, How it's built,
Reuse…). Fields declare which group they belong to.

**weight** — one number (1–9) doing four jobs: a field's order in its form section, in a card slot,
in the fact strip and in a filter group. Lower goes first, and lower survives when a slot overflows.

**placement** — a *group* property, and only for the entry page: `main` (the default) makes the
group a section in the page body, `rail` makes it a card in the sticky sidebar.

**prompt** — the question form of a field's label ("What does it do?"), shown as the visible
question on the submission form and the issue form. `description` is the help text under it.

**module** — a section of the site that can be switched on or off in `_data/site.yml`: `catalog`,
`submit`, `carousel`, `stats`, `events`, `cohorts`, `resources`. Pages belonging to a module that
is off are dropped from the build entirely.

**preset** — a starting configuration the setup wizards offer: AI use case catalog, cohort/program
portal, resource library, or blank. A preset is a starting point, not a mode — everything it sets
is editable afterwards.

**cohort** — a program year with its own landing page, schedule and event pages, under
`/cohorts/<year>/`. Only relevant when the `cohorts` module is on.

**sample** — one of the ten example entries the template ships with, each marked `sample: true` in
its front matter. They are fictional, and deleting them is step 4 of [launch.md](launch.md).

**scaffold** — what the automation does when a submission arrives: read the issue, write
`catalog/<slug>/index.md` and download the attached images, and open a pull request. It drafts; it
never publishes.

**area** — in the shipped AI use case schema, the broad "area of work" tagging field. Deliberately
not called "department" — see [decisions.md](decisions.md).

**readiness** — in the shipped schema, the multiselect of flags describing how much work stands
between finding an entry and running it.
