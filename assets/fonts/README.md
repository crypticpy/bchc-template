# Bundled fonts

Two files, one per family:

| File | Family | Weights | Size |
|---|---|---|---|
| `Inter-Variable.woff2` | Inter | 400–700 | 57 KB |
| `SourceSans3-Variable.woff2` | Source Sans 3 | 400–700 | 49 KB |

Both are variable latin + latin-extended woff2 subsets under the SIL Open Font License 1.1.
They replaced seven static cuts (Inter 400/500/600/700, Source Sans 3 400/600/700, 219 KB on
disk, ~172 KB fetched per page): a variable file carries the whole weight range in one request,
so a stray `font-medium` can no longer pull an eighth file nobody preloaded.

Which family is used for headings and body comes from `_data/theme.yml → fonts`. Any other
family can be used by setting `fonts.google_fonts_url` there; the bundled files are then unused
and no longer preloaded.

`@font-face` lives in `assets/css/components/base.css`, next to the metric-matched
`"Inter Fallback"` / `"Source Sans 3 Fallback"` faces that keep `font-display: swap` from
reflowing the page. `_includes/head.html` preloads whichever of the two files the theme uses.

## Regenerating

```sh
npm run fonts
```

`scripts/build_fonts.sh` downloads the upstream variable TTFs, narrows the design space
(`fonttools varLib.instancer`: Inter's `opsz` axis is pinned, both `wght` axes clamped to
400–700), subsets the glyphs (`pyftsubset`), writes both `.woff2` files here, and prints the
`size-adjust` / `*-override` numbers for the fallback faces. Paste those into `base.css` if
they change, then re-run `npm run build:css`.

Two flags in that script are load-bearing and easy to get wrong:

- `--layout-features+=tnum` — the `+=` appends to pyftsubset's default feature set. The
  natural-looking `--layout-features=+tnum` instead keeps a single feature literally named
  `+tnum`, i.e. none, silently dropping kerning and ligatures.
- `--unicodes=…` — latin + latin-extended plus the punctuation, arrows and symbols the site's
  copy uses. If your catalog needs Cyrillic, Greek or Vietnamese, add those ranges (or drop the
  flag) and re-run.

Upstream: <https://github.com/rsms/inter/releases> and
<https://github.com/adobe-fonts/source-sans/releases>.
