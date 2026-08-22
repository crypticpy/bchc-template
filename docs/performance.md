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

The fixture generator reads the active schema and creates valid long-form content, deterministic
320×180 images, common/rare facets, deprecated rows, and cross-entry relationships. It builds each
size in an isolated temporary tree, then records build time, artifact size/file count,
catalog HTML and DOM size, CSS and JavaScript (including transitive module imports), font/image
transfer totals, and both JSON payloads.
Generated local evidence is excluded from the scratch trees so an old coverage report or SBOM
cannot change the result. The preset build matrix also reports elapsed time for every setup,
validation, and Jekyll step. The result is `performance-report.json` (ignored by Git); CI retains
it as an artifact.

The Performance workflow retains the 100-entry build and drives it in real Chrome at a 390×844
viewport with 4× CPU slowdown. It records cold search initialization; warm search, filter, sort,
and compare samples; cumulative main-thread task time; JavaScript heap use; and the local fixture
server's cache header. It serves the configured Pages `baseurl`, including downstream repository
subpaths. Warm-search and filter p95 are blocking; the remaining values are diagnostics until a
reviewed baseline supports another threshold. The deployed candidate's real Pages URL and CDN
headers must still be checked during the release soak.

To reproduce that second phase locally, install the exact Puppeteer version declared in
`quality/package.json`, retain the supported fixture outside the repository, and point the probe
at Chrome:

```sh
performance_tmp="$(mktemp -d)"
quality_puppeteer="$(node -p "require('./quality/package.json').devDependencies.puppeteer")"
PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-save --no-audit --no-fund "puppeteer@$quality_puppeteer"
npm run performance -- --counts 100 --output "$performance_tmp/report.json" --site-output "$performance_tmp/site"
PUPPETEER_EXECUTABLE_PATH="/path/to/Chrome" npm run performance:interactions -- --site "$performance_tmp/site" --report "$performance_tmp/report.json"
```

Budgets live in [`quality/performance-budgets.json`](../quality/performance-budgets.json). At the
100-entry supported ceiling, the release gates enforce:

- build in at most 60 seconds and stay below 100 MiB/5,000 output files;
- catalog HTML at most 100 KiB gzip and 12,000 DOM nodes;
- CSS at most 30 KiB gzip and catalog JavaScript at most 40 KiB gzip; and
- `search.json` and `entries.json` at most 500 KiB gzip each at the supported ceiling, with the
  `search.json` cap also enforced at the 500-entry target;
- filter response p95 at most 100 ms; and
- warm-search response p95 at most 250 ms, including the input debounce. The controlled Linux
  baseline replaced the initial 150 ms proposal after the representative workload was introduced.

The exact-toolchain parent baseline on 2026-08-22 passed every supported-scale budget. It measured
100 entries at 5.5 seconds, 523 files/19.6 MiB, 59.5 KiB catalog HTML gzip, 8,894 DOM nodes, 24.9
KiB CSS gzip, 39.9 KiB JavaScript gzip, 147.4 KiB fonts, 1.26 MiB images, 16.8 KiB search gzip, and
20.1 KiB comparison data gzip. Chrome 151 under the low-end-mobile profile measured 249.7 ms cold
search initialization, 93.3 ms warm-search p95, 15.9 ms filter p95 across rare/mid/common visible
facets, 27.4 ms sort p95, and 0.9 ms comparison p95. A 12× CPU diagnostic used to approximate the
slower hosted runner measured 191 ms search p95, within the reviewed 250 ms gate. The run used Node
22.22.2, npm 10.9.4, Ruby 3.3.11, and Bundler 4.0.11.

The representative 500-entry target built successfully in 25.1 seconds with an 81.5 KiB search
payload, but its catalog page reached 150.7 KiB gzip and 36,860 DOM nodes. The 1,000-entry stress
case built in 64.3 seconds and produced a 102.4 MiB artifact plus a 262.1 KiB/71,819-node catalog
page. Those 1,000-entry values exceed the budgets enforced at the supported ceiling, as expected
for an unsupported stress case. PHCT must add a
progressively enhanced pagination or incremental-card
strategy before raising the supported ceiling. That work must preserve server-rendered/no-JS
browsing, complete filtering/search across the catalog, focus behavior, and accessible result
announcements. Raising numeric budgets alone is not an acceptable resolution.
