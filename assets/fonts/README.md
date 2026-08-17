# Bundled fonts

Inter and Source Sans 3 (both SIL Open Font License 1.1) ship as **latin + latin-extended woff2
subsets** — roughly 35 KB per weight instead of ~320 KB for the full TTF. Only the weights the
design system uses are bundled (Inter 400/500/600/700, Source Sans 3 400/600/700).

Which family is used for headings and body comes from `_data/theme.yml → fonts`. Any other family
can be used by setting `fonts.google_fonts_url` there; the bundled files are then unused.

## Regenerating a subset

```sh
python3 -m venv .fontenv && .fontenv/bin/pip install fonttools brotli
.fontenv/bin/pyftsubset Inter-Regular.ttf \
  --unicodes="U+0000-00FF,U+0100-024F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+2000-206F,U+20AC,U+2113,U+2122,U+2190-2199,U+2212,U+2215,U+2C60-2C7F,U+A720-A7FF,U+FEFF,U+FFFD" \
  --flavor=woff2 --layout-features='*' --no-hinting --desubroutinize \
  --output-file=Inter-Regular.woff2
```

Full TTFs: https://github.com/rsms/inter/releases and https://github.com/adobe-fonts/source-sans/releases.
If your catalog needs Cyrillic, Greek or Vietnamese text, re-subset with those ranges added (or drop
`--unicodes` entirely) and re-run `npm run build:css` — `@font-face` lives in
`assets/css/components/base.css`.
