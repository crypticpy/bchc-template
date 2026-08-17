# Maintainer / admin guide

Day-to-day operation of a site built from this template: repository setup, reviewing submissions, editing content, running cohorts and events, and troubleshooting.

## One-time repository setup

- [ ] **Pages source**: Settings → Pages → Source → **GitHub Actions** (not "Deploy from a branch").
- [ ] **Actions can open pull requests**: Settings → Actions → General → Workflow permissions → **Allow GitHub Actions to create and approve pull requests**. Without this, every content workflow (`new-entry`, `new-year`, `new-event`, `update-schedule`, `update-event-attachments`) fails at the "Create pull request" step.
- [ ] **Labels**: run the **Bootstrap labels** workflow once (Actions tab → *Bootstrap labels* → *Run workflow*), or create these by hand, exactly as named — the automation workflows filter on them:
  - `content:new-entry` — triggers `new-entry.yml`
  - `content:new-year` — triggers `new-year.yml`
  - `content:schedule` — triggers `update-schedule.yml`
  - `content:new-event` — triggers `new-event.yml`
  - `content:event-attachments` — triggers `update-event-attachments.yml`

  The generated issue forms (`.github/ISSUE_TEMPLATE/*.yml`) already apply these labels when someone opens the issue; you just need the labels to exist in the repo first, or GitHub silently drops them.
- [ ] **`_data/site.yml` → `github.repository`**: set to this repo's `owner/repo`. Drives the submit form's issue links and every "edit on GitHub" link.
- [ ] Configure branding/theme/schema via `/setup/` or `npm run setup` (see the [README](../README.md) quick start and [configuration reference](configuration.md)).
- [ ] Optional: custom domain — add a `CNAME` file at the repo root; the `pages.yml` build detects it and serves from the domain root.

## Reviewing a submission

1. A submission arrives as a GitHub issue labelled `content:new-entry` (opened via `/submit/` or the issue form directly).
2. The `New entry from issue` workflow (`.github/workflows/new-entry.yml`) runs automatically, scaffolds `catalog/<slug>/index.md` from the issue body, and opens a pull request that closes the issue on merge.
   - If scaffolding fails (e.g. missing title, duplicate slug), the workflow comments the error back on the issue instead of opening a PR. Editing the issue to fix the problem re-triggers the workflow (it also runs on `issues: edited`).
3. On the pull request:
   - Review content accuracy and tone (public audience, no PHI/credentials/non-public data — the submit form already warns submitters of this).
   - If the submission included an attachment (e.g. a slide deck), the submitter or a maintainer uploads it into `catalog/<slug>/` in this PR — the web form cannot attach files itself, it just tells submitters to drag the file into the issue for a maintainer to add.
   - Confirm the **Validate Content** check is green (runs `check_front_matter.rb` and `check_file_sizes.rb`).
   - Use the PR template's maintainer checklist (`.github/PULL_REQUEST_TEMPLATE.md`).
4. Merge. The `Build & Deploy` workflow runs on every push to `main` and republishes the site, usually within a couple of minutes.

## Editing or removing an existing entry

- **Small edit**: every entry page has a **Suggest an edit on GitHub** link (bottom of the page) that opens the file directly in GitHub's editor, pre-targeted at `catalog/<slug>/index.md` on the configured branch. Commit directly or via a PR.
- **Larger edit / local**: edit `catalog/<slug>/index.md` in a checkout, run `npm run validate` before pushing.
- **Remove**: delete the entry's folder (`catalog/<slug>/`) in a PR. There's no soft-delete/archive mechanism — removing the folder is the only way to unpublish.
- **Un-feature / feature**: toggle `featured: true`/`false` in the entry's front matter. `featured` is a reserved key set by automation to `false` on scaffold; there's no UI for it, it's maintainer-only (the schema's `form: false` fields, like `featured` would be if added, are hidden from submission forms by design).
- Every entry page also has a **Report an issue with this entry** link, which opens a blank pre-titled GitHub issue (not labelled, so it does not trigger automation) — read and triage these manually.

## Attachments and thumbnails

- File-type schema fields (e.g. `deck_pdf`) store a path (`/catalog/<slug>/<filename>`) in front matter; the actual file must be added to that folder in a PR — usually by a maintainer, after the entry PR is open.
- Any `file` field flagged `thumbnail: true` in `_data/schema.yml` (shipped: `deck_pdf` → `deck.pdf`) gets a first-page thumbnail rendered automatically:
  - `thumbnails.yml` triggers on a PR touching `catalog/**/*.pdf`.
  - It runs `scripts/thumbnail_sources.mjs` to find PDF → `thumb.jpg` pairs, skips empty placeholders and anything that isn't actually a PDF (checks the `%PDF` file signature), and renders each with ImageMagick (`magick -density 150 … -resize 800x …`).
  - It commits `thumb.jpg` back onto the PR branch automatically (`stefanzweifel/git-auto-commit-action`).
  - **This does not run on PRs from forks** (the job is gated on `github.event.pull_request.head.repo.full_name == github.repository`, since fork PRs get a read-only token). For a fork-originated PR, run the workflow manually afterward via `workflow_dispatch`, or generate `thumb.jpg` locally and commit it.
  - `_includes/entry-thumb.html`'s fallback order: explicit `thumbnail` front-matter value → an existing `<entry>/thumb.jpg` → a generated initials placeholder. So a missing thumbnail is never a build error, just a plainer card.

## Cohorts and events (modules: `cohorts`, `events`)

**Start a new cohort year:**
- Open the **Start a new cohort year** issue (label `content:new-year`) with the four-digit year, or run the `Scaffold new cohort year` workflow manually (`workflow_dispatch`, input `year`).
- `scripts/scaffold_year.rb` creates `cohorts/<year>/index.md` and `_data/cohorts/<year>.yml` with placeholder events/materials/policies — it never overwrites existing files — and opens a PR.
- After merging, replace the placeholder intro, events, and policies with the real program details.

**Add an event to a cohort:**
- Open the **Add event details** issue (label `content:new-event`). The workflow first comments back the events already scheduled for that year (so the submitter can reuse or avoid an ID), then scaffolds `cohorts/<year>/events/<event-id>/index.md` and opens a PR.

**Update a cohort's schedule in bulk:**
- Open the **Update a cohort schedule** issue (label `content:schedule`) — replaces the event list for a cohort year without hand-editing YAML. The workflow previews normalized event IDs as a comment before writing changes, and only opens a PR if something actually changed.

**Add/replace materials on an existing event page:**
- Open the **Update event attachments** issue (label `content:event-attachments`). If the event ID is missing or unrecognized, the workflow comments back the list of valid IDs for that year instead of guessing.

All four cohort/event workflows follow the same pattern as new-entry: issue → scripted scaffold/update → PR for a maintainer to review and merge. None of them touch `main` directly.

**Resource library** (module `resources`) has no issue-based flow — edit `_data/resources.yml` directly in a PR.

## Troubleshooting

**Build failing (`Build & Deploy` workflow red on `main`)**
- Check the Actions log for the failing step. Common culprits: invalid YAML in `_data/*.yml` (run `npm run validate` locally first), a schema change that broke `npm run generate`, or `bundle exec jekyll doctor` flagging a broken permalink/URL.
- `npm run validate` mirrors the CI content gate locally (YAML parse of every `_data/*.yml`, plus the two Ruby checks) — run it before pushing schema or data changes.

**Pull request not created after an issue was opened**
- Confirm the issue actually carries the expected label (`content:new-entry`, etc.) — GitHub only applies labels from an issue form if they already exist in the repo (see setup checklist above).
- Check Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" is enabled — this is the most common cause of a silently-failed `create-pull-request` step.
- Check the workflow run itself: on a scaffolding failure, `new-entry.yml` comments the error onto the issue and fails the job rather than opening an empty PR.

**Thumbnails missing on an entry**
- Confirm the PDF was actually added to `catalog/<slug>/` under the exact filename the schema expects (`deck.pdf` by default) and that the schema field has `thumbnail: true`.
- Check whether the PR came from a fork — the thumbnails workflow does not run on fork PRs (see above); trigger it manually or commit the thumbnail yourself.
- Confirm the PR actually changed a `catalog/**/*.pdf` path — the workflow only triggers on that path filter.

**A module toggle doesn't seem to do anything**
- Confirm you're looking at a full rebuild, not a cached preview — `_plugins/modules.rb` removes disabled-module pages at `post_read` time, so the effect only shows up after a Jekyll build, not a live-reload of unrelated content.

**Front-matter validation failing on a PR**
- `check_front_matter.rb` checks: `title`/`slug`/`summary` present, `slug` matches the folder name, `published` is a valid `YYYY-MM-DD` date, every `required` field is present, `select`/`multiselect` values are within `options`, `url` fields start with `http(s)://`, `email` fields contain `@`. The error message names the file and field.

**Weekly smoke build failing**
- `smoke.yml` runs every Monday and does a full validate + build without deploying, to catch drift (e.g. a stale dependency, a broken external asset) between real deploys. Treat a red run the same as a failing `Build & Deploy`.
