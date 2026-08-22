# Performance and supported scale

PHCT release gates currently support catalogs through **100 published entries**. Every release
also probes 500 entries as the next target and 1,000 entries as an architectural stress case. This
is a declared support boundary, not a data-loss boundary: larger sites still build, but their
catalog page is not yet held to the release payload and DOM budgets below.

Run the deterministic matrix with the exact toolchain:

```sh
npm run build:css
npm run performance -- --counts 0,1,10,100,500,1000
```

The fixture generator reads the active schema, creates valid varied content and relationships,
builds each size in an isolated temporary tree, then records build time, artifact size/file count,
catalog HTML and DOM size, CSS and JavaScript, and both JSON payloads. The result is
`performance-report.json` (ignored by Git); CI retains it as an artifact.

Budgets live in [`quality/performance-budgets.json`](../quality/performance-budgets.json). At the
100-entry supported ceiling, the release gates enforce:

- build in at most 60 seconds and stay below 100 MiB/5,000 output files;
- catalog HTML at most 100 KiB gzip and 12,000 DOM nodes;
- CSS at most 30 KiB gzip and catalog JavaScript at most 40 KiB gzip; and
- `search.json` and `entries.json` at most 500 KiB gzip each.

The exact-toolchain parent baseline on 2026-08-22 passed every supported-scale budget. It measured
100 entries at 5.3 seconds, 474 files/20.2 MiB, 61.3 KiB catalog HTML gzip, 9,081 DOM nodes, 24.9
KiB CSS gzip, 30.3 KiB JavaScript gzip, 6.2 KiB search gzip, and 19.3 KiB comparison data gzip. The
run used Node 22.22.2, npm 10.9.4, Ruby 3.3.11, and Bundler 4.0.11.

The 500-entry target built successfully in 19.9 seconds, but its catalog page reached 175.1 KiB
gzip and 37,800 DOM nodes. The 1,000-entry stress case also built in 51.3 seconds and stayed below
the build/artifact caps, but produced a 319.6 KiB/73,700-node catalog page. PHCT must add a
progressively enhanced pagination or incremental-card
strategy before raising the supported ceiling. That work must preserve server-rendered/no-JS
browsing, complete filtering/search across the catalog, focus behavior, and accessible result
announcements. Raising numeric budgets alone is not an acceptable resolution.
