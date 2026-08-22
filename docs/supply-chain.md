# Supply-chain policy

PHCT releases block on high or critical npm or Ruby dependency advisories, an expired/incomplete
security exception, an unreviewed dependency license, or failure to generate the release SBOM.
The `Supply chain` workflow runs on every pull request and `main`, weekly, and on demand.

Controls:

- `npm ci` and `bundle install` resolve only the committed lockfiles, including Ruby gem checksums;
- `npm audit --audit-level=high` and `bundle audit check --update` use current advisory databases;
- `quality/allowed-licenses.json` is fail-closed: a new or missing npm/gem license blocks review;
- `npm run sbom` creates a deterministic CycloneDX 1.5 inventory from both lockfiles; and
- all GitHub Actions are full-SHA pinned and Dependabot proposes their updates.

GPL/LGPL dependencies presently approved are build/development tools, not code copied into the
published static site: `eventmachine` is dual GPL-2.0/Ruby licensed, `bundler-audit` is GPL-3.0,
and Sharp's libvips distribution accounts for the LGPL metadata in npm's tree. Any change to how
those packages are distributed requires a fresh license review.

## Exceptions

The default is zero. If a vulnerability cannot be patched immediately, add a narrowly identified
record to `quality/security-exceptions.yml` with the advisory ID, package, severity, accountable
GitHub owner/team, concrete reason and mitigation, and an ISO expiry date. The register validator
fails when a field is absent or the date expires. A P0/P1 release blocker still cannot be waived;
the record exists for time-bounded P2 decisions only, and the pull request must link the tracking
issue and release approval.

## Release evidence

Download the `sbom-<sha>` artifact from the exact stable-tag workflow run and attach
`sbom.cdx.json` to the GitHub release. Record the CodeQL run, npm audit, Bundler audit, license
review, and exception count in the release notes. Organization administrators separately enable
secret scanning, push protection, Dependabot alerts, and private vulnerability reporting; those
settings cannot be enforced by repository files.
