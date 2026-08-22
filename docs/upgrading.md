# Staying up to date with the template

Your catalog is a fork of a template that keeps moving. New releases fix layout bugs, harden the
submission workflows, and add features you did not have when you launched. None of that reaches
you automatically — a fork is a copy, not a subscription.

This is how to pull a release in without losing your own site.

## The split

One repository, two kinds of file:

| | Files | On upgrade |
|---|---|---|
| **Template code** | `_layouts/`, `_includes/`, `_plugins/`, `assets/` (except `assets/images/`), `scripts/`, `test/`, `.github/workflows/`, `quality/`, `docs/`, `package.json`, `Gemfile` | Take the template's version. |
| **Yours** | `.phct-version.json`, `_config.yml`, deployment-owned `_data/` files, `catalog/`, `cohorts/`, `events/`, `resources/`, `about/`, `assets/images/`, `docs/bchc/`, `.github/CODEOWNERS`, `MAINTAINERS.md`, `SUPPORT.md`, `README.md`, `CNAME` | Keep yours. These include deployment identity, content, governance, maintainers, and support commitments. |
| **The template's own** | `_showcase/`, `_data/showcase.yml`, `assets/images/showcase/` | The landing page and example sites the template publishes about itself. Nothing in your build reads them (they are only built while `demo` is `true`), so if `npm run eject:samples` removed them, delete whatever a merge brings back. |
| **Generated** | `.github/ISSUE_TEMPLATE/new-entry.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `assets/js/configurator/defaults.generated.js` | Keep yours, then `npm run generate` — they are built from *your* `_data/`. |

That split lives in [`.gitattributes`](../.gitattributes), which marks every file in the **Yours** and
**Generated** rows `merge=ours`. Git then keeps your version of those files during a merge, without a
conflict, while merging the template's changes into everything else.

The machine-readable source is [`.phct/ownership.yml`](../.phct/ownership.yml). `npm run
ownership:check` fails if that manifest, `.gitattributes`, the generator output list, or the PHCT
version lock drift apart. In particular, `_data/governance.yml`, `_data/search.yml`, and
`_data/derivatives.json` are deployment-owned; `_data/modules.yml`, `_data/showcase.yml`,
`_showcase/`, and showcase images are PHCT-owned.

## One-time setup

```sh
git remote add template https://github.com/crypticpy/phct.git
git config merge.ours.driver true
```

**Both lines matter.** `merge=ours` in `.gitattributes` does nothing until `merge.ours.driver`
exists in the clone — git refuses to run a merge driver a repository has not opted into. Skip the
second line and the rules are silently inert: you get an ordinary conflict in every file you own,
and if you resolve one the wrong way you have quietly reverted your site to the demo's settings.

The setting is per clone. Anyone else who will run upgrades needs it too.

A repository created directly from a PHCT release may not have a `.phct-version.json` yet. On that
repository's first **Update from PHCT** run, the workflow derives the current release from
`package.json`, resolves that release tag to a full commit, and calls this out in the update pull
request. Review that previous commit against the named PHCT release before approving. The update
then records the target tag and full commit, so every later run can fail closed if the previously
consumed tag has moved or the lock is inconsistent.

## Recommended: one protected update pull request

From the repository's **Actions** tab, run **Update from PHCT**, enter the exact release tag (for
example `v1.9.0-rc.1`), and wait for it to open a pull request. The workflow:

1. fetches the current and target immutable tags and records both full commit SHAs;
2. snapshots every deployment-owned file;
3. merges the release with the configured ownership driver;
4. proves protected files are byte-identical before and after the merge;
5. installs the candidate dependencies and regenerates only derived outputs;
6. records the tag and commit in `.phct-version.json`;
7. runs `npm run verify` and uploads an inspectable site artifact; and
8. opens a human-reviewed pull request, dispatching validation and quality checks when needed.

The workflow is manual-only until the first candidate upgrade and rollback have been rehearsed.
It never merges its own pull request.

## Manual recovery path

```sh
git fetch template tag v1.9.0
npm run upgrade:check -- --to v1.9.0
```

`upgrade:check` is read-only. It compares `.phct-version.json` with the exact tag and prints the
incoming diff in two lists — what you will take, and what you own and will keep — plus a reminder
if the merge driver is missing. Moving branches and abbreviated SHAs are rejected.

To look further ahead, or back:

```sh
npm run upgrade:check -- --from v1.2.0 --to v1.3.0
```

Then:

```sh
npm run ownership:snapshot -- /tmp/deployment-protected.json
git checkout -b upgrade/phct-v1.9.0
git merge --no-commit --no-ff v1.9.0
```

If your repository was created with **Use this template**, it shares no history with the template
and git will refuse the first merge. Say so once:

```sh
git merge --no-commit --no-ff v1.9.0 --allow-unrelated-histories
```

Expect conflicts in template code you have edited yourself — that is the point of the exercise, and
the resolution is usually "take the template's and re-apply my change on top". You should *not* see
conflicts in `_data/` or `catalog/`; if you do, `merge.ours.driver` is not set.

Before generating or committing anything, prove the merge kept deployment content intact. Then install
the release's dependencies, regenerate downstream outputs, update the lock, and run the same gates
CI runs:

```sh
npm run ownership:verify -- /tmp/deployment-protected.json
npm ci
bundle install
npm run generate
npm run version:record -- --release v1.9.0 --commit <full-tag-commit-sha>
npm run ownership:verify -- /tmp/deployment-protected.json
npm run verify
```

Push the branch, let the checks run, and merge. The deploy is the same one your content uses.

## What the merge cannot do for you

`merge=ours` protects your files; it cannot adopt a change the template made *inside* one.

- **New schema field types or options.** `_data/schema.yml` is yours, so a new field type the
  release added is available but unused. Read the release notes, then add it with the field editor
  at `/setup/`, the [Apply setup issue](launch.md#3-configure-the-site), or by hand — followed by
  `npm run generate`.
- **New `_data/site.yml` keys.** Same story: a new copy block is empty and a new module's header
  and footer links stay hidden until you add the key — but the module's *pages* are only removed
  from the build by an explicit `<module>: false`, so add that line for a module you are not ready
  to show. `docs/configuration.md` lists every key with its default.
- **Renamed template files.** If a release moves `_includes/foo.html` to `_includes/bar.html` and
  you referenced the old name in your own content, the merge succeeds and the build fails. That is
  what `bundle exec jekyll build` above is for.

## Deciding whether to upgrade at all

You do not have to. A fork that never merges again keeps working — it is a static site with no
runtime dependencies, and GitHub Pages will keep serving it.

Upgrade when the release notes name something you want, and always read
[`CHANGELOG.md`](../CHANGELOG.md) first:

```sh
git log --oneline v1.2.0..template/main -- CHANGELOG.md
```

## If it goes wrong

Nothing here touches your published site until you merge the upgrade branch into your default
branch, so the whole thing is disposable:

```sh
git merge --abort                 # mid-merge
git checkout main && git branch -D upgrade-template   # after
```

If you already merged and deployed, revert the merge commit — the deploy re-runs from the reverted
state:

```sh
git revert -m 1 <merge commit>
```
