# Security

This is a Jekyll site published by GitHub Pages. There is no server, no
database and no user session: the whole site is static files, and every change
to it arrives as a commit on the default branch.

What follows is the trust model — what the automation assumes about the people
who use it, and what it does not assume.

## Where untrusted input enters

One place: **GitHub issues**. Anyone with a GitHub account can open one, and
several workflows react to them. The submission form at `/submit/` does not
send anything anywhere; it composes a prefilled issue URL and the submitter
presses the button on GitHub.

Everything below is about keeping that input from turning into anything more
than text in a pull request.

## What the automation guarantees

**Issue content never executes.**
Issue bodies and titles reach a workflow step only through `env:`, never
interpolated into a `run:` script, so shell metacharacters in a submission are
inert. Nothing a submitter writes is passed to `eval`, a shell, or a template
that renders it as code.

**The generated page is not run through Liquid.**
A scaffolded entry carries `render_with_liquid: false` in its front matter.
Without it, Jekyll would evaluate the page body at build time and a Liquid tag
typed into a write-up would execute against the site's data. `check_front_matter.rb`
warns about any entry that is missing the flag.

**The scaffolder writes inside one folder.**
`scripts/new_entry_from_issue.mjs` derives a slug, re-checks it against
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, and then resolves every path it is about to
write and refuses anything that does not sit under `catalog/<slug>/` — file
writes and image downloads alike.

**The issue-form parser cannot be spoofed.**
A GitHub issue form renders as `### <label>` sections in template order. The
parser takes the first occurrence of each known heading and treats everything
after the final free-form section as prose, so a `### Contact email` typed
inside someone's write-up cannot overwrite the answer GitHub collected.
Repeated headings are reported on the pull request, not silently applied.

**Images are fetched behind an SSRF guard.**
Before each request — and again after every redirect hop, up to five — the
target host is resolved and refused if any resolved address is loopback,
link-local (including the cloud metadata address at `169.254.169.254`),
private, unique-local, multicast or unspecified, or if the hostname ends in
`.internal`, `.local` or `localhost`. IP-literal URLs go through the same
check. Redirects are followed by hand so a credential is never carried to a
host it was not meant for. Downloads are capped by count, by total size and by
a request timeout that covers the response body, and each file must be a PNG,
JPEG, GIF or WebP by both its `Content-Type` and its magic bytes before it is
written.

**Values written into YAML are quoted unless provably safe.**
`scripts/lib/yaml.mjs` emits a plain scalar only for prose-shaped values and
double-quotes everything else, escaping control characters. A submitted value
cannot change the type or the structure of the front matter it lands in.

**Nothing publishes itself.**
Every workflow ends at a pull request. A maintainer reviews and merges it, and
only then does the site rebuild. The `contents: write` token is scoped to a
generated branch; the default branch is never written to directly.

**Third-party actions are pinned.**
Every `uses:` in `.github/workflows/` names a full commit SHA with the release
tag in a trailing comment. Dependabot proposes updates weekly.

## Who can submit

Open by default: the catalog is meant to collect work from people without
write access. To restrict it, set the repository variable `SUBMISSIONS_OPEN` to
`false` (Settings → Secrets and variables → Actions → Variables). The
`new-entry` workflow then scaffolds only for issues opened by the repository
owner, an organization member or a collaborator. See
[docs/admin-guide.md](docs/admin-guide.md) for the maintainer view.

## What is out of scope

- Content accuracy. Maintainers review submissions; the automation does not.
- Anything a maintainer merges by hand. The review checklist on each generated
  pull request is the control there.
- Denial of service against GitHub Actions minutes. The workflows use a
  per-issue `concurrency` group so re-runs replace each other rather than
  stacking, but a determined spammer can still consume minutes; disable the
  workflow or set `SUBMISSIONS_OPEN=false` if that happens.

## Reporting a vulnerability

Please report privately rather than opening a public issue. Use GitHub's
private vulnerability reporting: the **Security** tab of this repository →
**Report a vulnerability**. (A repository admin enables it under Settings →
Advanced Security → Private vulnerability reporting.) See
[GitHub's documentation](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
for what the reporting form looks like.

If private reporting is not enabled, email the address in
`_data/site.yml` → `organization.contact_email` and say that the report is a
security issue, so it is not handled as a normal submission.

Expect an acknowledgement within a few working days. There is no bounty.
