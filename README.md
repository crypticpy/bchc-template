# Civic Catalog Template

A configurable, GitHub-Pages-hosted catalog and resource site, managed entirely through GitHub. There is no server, no database and no CMS login — Jekyll builds the site on GitHub Actions and deploys it to Pages, and every content change flows through a GitHub issue and a pull request.

This repository is shipped configured as the **Big Cities Health Coalition (BCHC) AI Use Case Catalog**, where member health departments share AI use cases — source repos, cloud deployments, vendor solutions, write-ups. The same template can be re-pointed at other uses without touching layout code: a project/asset portal, a cohort or training-program portal where teams publish outputs, an event calendar, or a curated resource library. See [`docs/configuration.md`](docs/configuration.md) for how to retarget it.

## Features

- **GitHub-as-CMS.** Anyone can propose an entry through a web form or a GitHub issue. Automation turns the issue into a pull request with the entry already drafted; a maintainer reviews and merges it, and the site rebuilds.
- **Schema-driven content model.** One file, [`_data/schema.yml`](_data/schema.yml), defines every field an entry has. The submission form, the GitHub issue template, the catalog cards, the filter panel, the search index and the front-matter validator all derive from it — change the schema, run one command, and everything else follows.
- **Two configurators.** A no-terminal setup wizard at `/setup/` on the deployed site, and an equivalent CLI wizard (`npm run setup`) for local use. Both offer starting presets (AI use case catalog, cohort/program portal, resource library, blank) and write the same configuration files.
- **Modules.** Turn catalog, submit, carousel, stats, events, cohorts and resources on or off independently; navigation and the home page adapt automatically, and pages under a disabled module are dropped from the build.
- **Theming.** Colors, fonts and corner rounding live in [`_data/theme.yml`](_data/theme.yml) and become CSS variables consumed by Tailwind — no CSS editing required for a rebrand.
- **CI content pipeline.** Validation on every pull request, automatic thumbnail generation from uploaded PDFs, and workflows that scaffold cohort years, events, and schedule updates from issues.

## Quick start

1. **Use this template** on GitHub (or clone it) to create your own repository.
2. **Enable GitHub Pages**: repository Settings → Pages → Source → **GitHub Actions**.
3. **Allow Actions to open pull requests**: Settings → Actions → General → Workflow permissions → check **Allow GitHub Actions to create and approve pull requests**.
4. **Create the content labels** the workflows watch for: run the **Bootstrap labels** workflow once from the Actions tab (`Actions → Bootstrap labels → Run workflow`), or create `content:new-entry`, `content:new-event`, `content:schedule`, `content:event-attachments`, `content:new-year` by hand.
5. **Configure the site** — either:
   - Push to GitHub first, then open `/setup/` on the deployed site and use the browser wizard (no terminal), or
   - Locally: `npm install && npm run setup` (or `npm run setup -- --preset <id> --yes` for zero-prompt setup).

   Either path writes `_data/site.yml`, `_data/theme.yml`, `_data/schema.yml`, `_data/navigation.yml`, `_config.yml` and `.github/ISSUE_TEMPLATE/new-entry.yml`. Update `github.repository` in `_data/site.yml` to your `owner/repo` — it drives the submit-form links and "edit this page" links.
6. **Commit and push.** The `Build & Deploy` workflow builds the site and publishes it to `https://<owner>.github.io/<repo>/`. The build works out the correct `url`/`baseurl` automatically (root domain for a `<owner>.github.io` repo or a `CNAME` file, `/<repo>` otherwise); an explicit `url` in `_config.yml` always wins.

## How content gets in

1. A contributor fills out the **Submit** form (`/submit/`) or opens the **Submit a use case** GitHub issue form directly.
2. The form data becomes a GitHub issue labelled `content:new-entry`.
3. The `New entry from issue` workflow runs `scripts/new_entry_from_issue.mjs`, which reads `_data/schema.yml` and opens a pull request containing `catalog/<slug>/index.md`.
4. Attachments (a `deck.pdf`, images) are added to the entry folder directly in that pull request. Any `file` field flagged `thumbnail: true` gets a `thumb.jpg` rendered from its first page automatically by the `Generate entry thumbnails` workflow.
5. A maintainer reviews and merges the pull request; the site rebuilds and the entry is live within a couple of minutes.
6. Existing entries can also be edited directly on GitHub — every entry page has a **Suggest an edit on GitHub** link.

Cohorts and events follow the same issue → automation → pull request pattern (`content:new-year`, `content:schedule`, `content:event-attachments`, and the plain **Add event details** issue). See [`docs/admin-guide.md`](docs/admin-guide.md) for the maintainer side of all of this.

## Configuration overview

- **Branding, contact info, module toggles, home page copy** — `_data/site.yml`
- **Colors, fonts, corner rounding** — `_data/theme.yml`
- **Header navigation** — `_data/navigation.yml` (regenerated by the wizards from your modules, but hand-editable)
- **The entry content model** — `_data/schema.yml` (see [`docs/content-model.md`](docs/content-model.md))
- **Events, cohort years, resource library** — `_data/events.yml`, `_data/cohorts/<year>.yml`, `_data/resources.yml`

Full reference for every setting: [`docs/configuration.md`](docs/configuration.md).

## Local development

Requires Ruby 3.3 (see `.ruby-version`) and Node 20+.

```bash
bundle install
npm install

npm run build     # generate schema-derived files, build CSS, build the Jekyll site into _site/
npm run serve     # same, then serve with live reload
```

Other useful scripts:

```bash
npm run setup      # configuration wizard (see Quick start)
npm run generate   # regenerate .github/ISSUE_TEMPLATE/new-entry.yml and sync _config.yml from _data/site.yml
npm run validate   # parse all _data/*.yml and run the front-matter / file-size checks CI runs on pull requests
```

## Repository layout

```
_config.yml              Jekyll build mechanics (title/description fall back to _data/site.yml)
_data/                   site.yml, theme.yml, schema.yml, navigation.yml, events.yml, resources.yml, cohorts/<year>.yml
_layouts/, _includes/    schema-driven templates (entry cards, filters, field rendering, etc.)
_plugins/                theme_filters.rb, search_index.rb (/search.json), events.rb, modules.rb
assets/js/configurator/  shared logic behind both configurators (core.js, presets.js, setup-page.js)
assets/js/submit.js      turns the /submit/ form into a pre-filled GitHub issue URL
scripts/                 setup.mjs, generate.mjs, validate.mjs, and the issue-to-PR automation scripts
.github/workflows/       pages, validate, smoke, new-entry, thumbnails, new-year, new-event, update-schedule, update-event-attachments
.github/ISSUE_TEMPLATE/  new-entry.yml is generated — do not hand-edit it, run `npm run generate`
catalog/<slug>/index.md  published entries (sample content ships with 5)
cohorts/<year>/          cohort landing page + event pages (module: cohorts)
docs/                    admin-guide.md, configuration.md, content-model.md
```

## License

MIT — see [`LICENSE`](LICENSE).
