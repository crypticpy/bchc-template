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
- [ ] Optional: **`CONTENT_BOT_TOKEN`** — a fine-grained personal access token that makes the checks on generated pull requests run without a click. See [Checks on a generated pull request](#checks-on-a-generated-pull-request) below for what it changes and what to grant it.
- [ ] Optional: custom domain — add a `CNAME` file at the repo root; the `pages.yml` build detects it and serves from the domain root.

## Who can submit

By default anyone with a GitHub account can open a `content:new-entry` issue and have the automation draft a pull request from it. That is the point of the template — the catalog collects work from people who do not have write access to the repository. The safety comes from what the job is allowed to do, not from who is allowed to start it: issue text never reaches a shell, the scaffolder refuses to write outside `catalog/<slug>/`, the page body is written with `render_with_liquid: false` so it is never executed at build time, images are fetched through an SSRF guard and re-checked against their magic bytes, and the output is a pull request that only a maintainer can merge. [SECURITY.md](../SECURITY.md) sets this out in full.

If you need to close submissions for a while, add a repository variable `SUBMISSIONS_OPEN` (Settings → Secrets and variables → Actions → Variables) set to `false`. Every issue-driven workflow (entries, events, cohort years, schedules, attachments) then runs only for issues opened by the repository owner, an organization member or a collaborator. Delete the variable, or set it to anything else, to reopen. Nobody is stopped from opening the issue either way — it simply does not scaffold a pull request, so you can still triage by hand.

## Reviewing a submission

1. A submission arrives as a GitHub issue labelled `content:new-entry` (opened via `/submit/` or the issue form directly).
2. The `New entry from issue` workflow (`.github/workflows/new-entry.yml`) runs automatically, scaffolds `catalog/<slug>/index.md` from the issue body, and opens a pull request that closes the issue on merge.
   - If scaffolding fails (e.g. missing title, duplicate slug), the workflow comments the error back on the issue instead of opening a PR. Editing the issue to fix the problem re-triggers the workflow (it also runs on `issues: edited`).
3. Any images the submitter dropped into the issue are downloaded into the entry folder by the same workflow (see [Screenshots and images](#screenshots-and-images) below), so the pull request already contains the pictures — you review them, you do not have to fetch them.
4. On the pull request, work through the checklist below.
5. Merge. The `Build & Deploy` workflow runs on every push to `main` and republishes the site, usually within a couple of minutes. Once it has deployed, the automation comments the published URL back on the issue the submission came from ("Your entry is now live at …"), so the submitter hears the outcome without you writing anything. That comment is best-effort: if it does not appear, nothing is wrong with the deploy.

### Review checklist

Content

- [ ] The summary says what the thing does, in plain language, in one or two sentences. Rewrite jargon rather than asking the submitter to.
- [ ] Nothing in the entry is protected, personal or non-public: no PHI or PII, no credentials, no internal URLs that leak a private host, no unreleased procurement detail. This applies to the write-up, the screenshots and the linked resources.
- [ ] Named individuals are the submitter's own contact only. Other people are referred to by role.
- [ ] Claims with numbers are the submitter's own and are attributed in the write-up ("across 38 contracts in the pilot"), not stated as general fact.
- [ ] `select` and `multiselect` values are the ones you would have chosen. A wrong `readiness` or `data_sensitivity` misleads every future reader — fix it in the PR and say why in a comment.

Screenshots

- [ ] Every image actually shows the tool, not a stock graphic or a logo wall.
- [ ] No real people's data on screen — names, addresses, record numbers, case detail, email addresses in a header bar. If in doubt, ask for a redacted version rather than merging.
- [ ] Every image has `alt` text that describes what is shown, in one sentence under about 125 characters. Write it yourself if it is missing; the validator warns but does not block.
- [ ] Images are inside `catalog/<slug>/screenshots/` and referenced with a site-absolute `src`. A `src` pointing at a remote host is a warning in validation — download the file into the folder instead, so the page does not break when someone else's host changes.

Links

- [ ] Every `resources` entry has a label that says what the reader gets ("Evaluation memo (PDF)", "Six-minute walkthrough video"), not "Link" or a bare URL.
- [ ] Links resolve, and resolve for someone outside the organization. A shared drive URL that only your staff can open is worse than no link — either make it public or drop it.

Mechanics

- [ ] The **Validate Content** check is green (`check_front_matter.rb` and `check_file_sizes.rb`).
- [ ] If a slide deck was promised, it has been uploaded into `catalog/<slug>/` as `deck.pdf`.
- [ ] The maintainer checklist in the pull request body is complete. (Generated PRs carry their own checklist; `.github/PULL_REQUEST_TEMPLATE.md` is the one hand-opened PRs get.)

## Checks on a generated pull request

A pull request opened by a workflow using the built-in `GITHUB_TOKEN` does not, by GitHub's design, trigger other workflows — otherwise a workflow could start itself in a loop. Left alone, that means the **Validate Content** and **Quality** checks on a submission's pull request sit at *"This workflow requires approval from a maintainer"* until someone clicks **Approve and run**.

The template handles this without a token: after opening the pull request, each content workflow dispatches `validate.yml` and `quality.yml` against the new branch (`workflow_dispatch` is the exception to the no-loop rule). The run summary lists which workflows it dispatched. Two consequences worth knowing:

- The check runs appear against the **branch**, not against the pull request, so they show up in the Actions tab and on the branch's commit rather than in the PR's own checks box. Look at the latest commit's status, which is what the review checklist asks for.
- If the bot pushes again afterwards (the thumbnail job does this when a PDF is attached), the checks are re-dispatched for the new head commit. Always read the check status on the *latest* commit.

**With `CONTENT_BOT_TOKEN` set**, the workflows push and open the pull request as that token's user instead, so the pull request triggers `validate.yml` and `quality.yml` normally, the checks appear in the PR's own checks box, and nothing is dispatched by hand. To set it up:

1. Create a fine-grained personal access token (Settings → Developer settings → Personal access tokens → Fine-grained tokens), scoped to **this repository only**.
2. Grant exactly two repository permissions: **Contents: Read and write** and **Pull requests: Read and write**. Nothing else is needed — the token never touches issues, actions or settings.
3. Add it as a repository secret named `CONTENT_BOT_TOKEN` (Settings → Secrets and variables → Actions → Secrets).

Give it a short expiry and re-issue it on a calendar reminder; the workflows fall back to `GITHUB_TOKEN` and the dispatch path the moment the secret is absent, so an expired token degrades rather than breaks. The token's user becomes the author of every content commit, so use a machine account if you would rather that not be a person's name. [SECURITY.md](../SECURITY.md) covers the trust this delegates.

## Editing or removing an existing entry

- **Small edit**: every entry page has a **Suggest an edit on GitHub** link (bottom of the page) that opens the file directly in GitHub's editor, pre-targeted at `catalog/<slug>/index.md` on the configured branch. Commit directly or via a PR.
- **Larger edit / local**: edit `catalog/<slug>/index.md` in a checkout, run `npm run validate` before pushing.
- **Remove**: delete the entry's folder (`catalog/<slug>/`) in a PR. There's no soft-delete/archive mechanism — removing the folder is the only way to unpublish.
- **Un-feature / feature**: toggle `featured: true`/`false` in the entry's front matter. `featured` is a reserved key set by automation to `false` on scaffold; there's no UI for it, it's maintainer-only (the schema's `form: false` fields, like `featured` would be if added, are hidden from submission forms by design).
- Every entry page also has a **Report an issue with this entry** link, which opens a blank pre-titled GitHub issue (not labelled, so it does not trigger automation) — read and triage these manually.

## Screenshots and images

Fields of type `images` (shipped: `screenshots`) are the one place where files arrive with the submission rather than after it.

**How they get in.** The submission form tells contributors to attach pictures on the GitHub issue screen; GitHub uploads them to its own CDN and rewrites them into the issue body as Markdown. When `new-entry.yml` runs, the scaffolder parses that field for Markdown images, `<img>` tags and bare URLs, downloads each one into `catalog/<slug>/screenshots/`, and writes the front matter for you:

```yaml
screenshots:
  - src: /catalog/<slug>/screenshots/01.png
    alt: "…the submitter's alt text, or a fallback…"
```

Files are numbered in the order they were attached (`01.png`, `02.jpg`, …) and named from the format actually detected, not from the URL.

**Limits enforced by the download step** (`scripts/lib/images.mjs`):

- at most **8 files** per entry;
- **15 MB total** across all of them;
- **PNG, JPEG, GIF or WebP only**, verified against both the response content type and the file's magic bytes — anything else is skipped;
- one 30-second request per URL, redirects followed.

A failure never fails the scaffold. If an image cannot be downloaded it is left out of the front matter (so the page never shows a broken image) and the URL plus the reason are written into the workflow summary and the pull request body, so you can re-add it during review — download it yourself and commit it under `screenshots/`. Front-matter validation warns about any remote `src` because the page stops working when someone else's host changes.

**Adding or replacing images later.** There is no issue flow for this — do it in a pull request:

1. Add the file to `catalog/<slug>/screenshots/`, keeping the two-digit naming (`03.png`).
2. Add or edit the matching `{src, alt}` item in the entry's front matter. Order in the list is the order in the gallery.
3. To replace an image, overwrite the file and update the `alt` if what it shows has changed. To remove one, delete both the file and its list item — an orphaned `src` fails validation, and an orphaned file just sits in the repository.
4. Keep images reasonably small. There is no per-file cap in validation below the 10 MB warning in `check_file_sizes.rb`, but a screenshot has no business being over a few hundred kilobytes; a 1280px-wide PNG run through `pngquant` is usually 30–60 KB.

**Alt text.** Describe what the picture shows in one sentence, under about 125 characters: "Triage queue listing seven ranked signals with area, signal strength and status." Not "Screenshot", not the entry title again. Alt text is a caption in the lightbox as well as a screen-reader label, so it is visible work, not compliance work.

**Redaction.** Screenshots are the most common way protected data reaches a public catalog. Blur or replace real values before merging; a mock dataset is better than a redaction box, and a redaction box is better than a blur. If a submitter cannot produce a clean screenshot, the entry is fine without one — the card and entry page degrade to a text-first layout rather than showing a placeholder.

## Other attachments and thumbnails

- File-type schema fields (e.g. `deck_pdf`) store a path (`/catalog/<slug>/<filename>`) in front matter; the actual file must be added to that folder in a PR — usually by a maintainer, after the entry PR is open.
- `links`-type fields (shipped: `resources`) hold `{label, url}` pairs and need no files at all. They are the right home for a shared drive folder, a recorded demo, a model card or a vendor page — anything that does not deserve its own `url` field. Check that each one opens for someone outside the organization before merging.
- Any `file` field flagged `thumbnail: true` in `_data/schema.yml` (shipped: `deck_pdf` → `deck.pdf`) gets a first-page thumbnail rendered automatically:
  - `thumbnails.yml` triggers on a PR touching any `*.pdf` file (it can't read the schema to narrow the trigger, since GitHub evaluates `paths:` before checkout — the schema-driven filtering happens in the next step instead).
  - It runs `scripts/thumbnail_sources.mjs` to find PDF → `thumb.jpg` pairs under the schema's `entry.path` (default `catalog/`), skips empty placeholders and anything that isn't actually a PDF (checks the `%PDF` file signature), and renders each with `pdftoppm` (poppler-utils: `pdftoppm -jpeg -jpegopt quality=85 -scale-to-x 800 …`).
  - It commits `thumb.jpg` back onto the PR branch itself with a plain `git add`/`commit`/`push`.
  - **This does not run on PRs from forks** (the job is gated on `github.event.pull_request.head.repo.full_name == github.repository`, since fork PRs get a read-only token). For a fork-originated PR, run the workflow manually afterward via `workflow_dispatch`, or generate `thumb.jpg` locally and commit it.
  - `_includes/entry-thumb.html`'s fallback order for the card image: explicit `thumbnail` front-matter value → the first image of the entry's `images` field → an existing `<entry>/thumb.jpg` → nothing. There is no generated placeholder: an entry with no picture gets a text-first card, which is honest and reads better than a fake graphic.

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
- Open the **Update event attachments** issue (label `content:event-attachments`). Leave the event ID blank (or type `help`) and the workflow comments back the list of valid IDs for that year; an ID that does not exist fails the run with a comment naming it, so edit the issue and it re-runs.

All four cohort/event workflows follow the same pattern as new-entry: issue → scripted scaffold/update → PR for a maintainer to review and merge. None of them touch `main` directly. The new-event and event-attachments PRs close their issue on merge; the new-year and schedule PRs do not (their issues are often reused for follow-up), so close those by hand once the PR is in.

**Resource library** (module `resources`) has no issue-based flow — edit `_data/resources.yml` directly in a PR.

## Troubleshooting

**Build failing (`Build & Deploy` workflow red on `main`)**
- Check the Actions log for the failing step. Common culprits: invalid YAML in `_data/*.yml` (run `npm run validate` locally first), a schema change that broke `npm run generate`, or `bundle exec jekyll doctor` flagging a broken permalink/URL.
- `npm run validate` mirrors the CI content gate locally (YAML parse of every `_data/*.yml`, plus the two Ruby checks) — run it before pushing schema or data changes.

**Pull request not created after an issue was opened**
- Confirm the issue actually carries the expected label (`content:new-entry`, etc.) — GitHub only applies labels from an issue form if they already exist in the repo (see setup checklist above).
- Check Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" is enabled — this is the most common cause of a silently-failed `create-pull-request` step.
- Check the workflow run itself: on a scaffolding failure, `new-entry.yml` comments the error onto the issue and fails the job rather than opening an empty PR.

**Checks on a generated pull request say "waiting for approval"**
- Expected on a fresh repository, and not a failure: pull requests opened with the built-in token cannot start other workflows. Either click **Approve and run**, or read the check runs the workflow dispatched against the branch (see [Checks on a generated pull request](#checks-on-a-generated-pull-request)).
- If the workflow's run summary says a dispatch "could not be dispatched", the job lacked `actions: write` or the workflow file is not on the default branch yet — a dispatch can only target a workflow that already exists on `main`.
- To make PR checks run normally instead, add a `CONTENT_BOT_TOKEN` secret as described in that section.

**No "your entry is now live" comment after merging**
- The comment is posted by the `announce` job in `pages.yml` after a successful deploy, and it is deliberately non-fatal: it only fires for a push to `main` whose commit belongs to a merged pull request that closed an issue (`Closes #123` in the PR body — generated PRs always have it) and that added an entry page. A hand-merged squash that rewrote the body, or an edit rather than a new entry, will not produce one.
- Nothing about the site depends on it. Comment on the issue by hand and close it.

**Thumbnails missing on an entry**
- Confirm the PDF was actually added to `catalog/<slug>/` under the exact filename the schema expects (`deck.pdf` by default) and that the schema field has `thumbnail: true`.
- Check whether the PR came from a fork — the thumbnails workflow does not run on fork PRs (see above); trigger it manually or commit the thumbnail yourself.
- Confirm the PR actually changed a `catalog/**/*.pdf` path — the workflow only triggers on that path filter.

**A module toggle doesn't seem to do anything**
- Confirm you're looking at a full rebuild, not a cached preview — `_plugins/modules.rb` removes disabled-module pages at `post_read` time, so the effect only shows up after a Jekyll build, not a live-reload of unrelated content.

**Front-matter validation failing on a PR**
- `check_front_matter.rb` checks: `title`/`slug`/`summary` present, `slug` matches the folder name, `published` (and `updated` when present) is a valid `YYYY-MM-DD` date, every `required` field is present, `select`/`multiselect` values are within `options`, `url` fields start with `http(s)://`, `email` fields contain `@`, `images` items have a `src` that exists inside the entry folder, and `links` items have both a label and an `http(s)` or `mailto:` URL. The error message names the file, the line and the field.
- `render_with_liquid: false` is required on every entry, hand-written ones included: without it Jekyll runs the page body through Liquid at build time, so a Liquid `include` tag someone typed into their write-up would execute. The scaffolder emits it automatically.
- Warnings (a remote image `src`, a missing `alt`) are printed but do not fail the check. Fix them anyway.

**Weekly smoke build failing**
- `smoke.yml` runs every Monday and does a full validate + build without deploying, to catch drift (e.g. a stale dependency, a broken external asset) between real deploys. Treat a red run the same as a failing `Build & Deploy`.
