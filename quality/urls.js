/**
 * URL lists for the quality gate (`quality/pa11yci.js`, `quality/lighthouserc.js`).
 *
 * The gate audits real entry pages, but which entries exist depends on the
 * deployment — `npm run setup` deletes the shipped samples — so the URLs are
 * discovered from the built site instead of being written into the configs.
 * Two entries are chosen: one with a screenshot gallery (the field whose type
 * is `images` is set) and one without, so both card/entry variants are covered.
 * With no entries yet, only the static pages are audited and CI stays green.
 *
 * CommonJS on purpose (see ./package.json): both tools `require()` their configs.
 */
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');

/** The `entry.path` from `_data/schema.yml` (`catalog` when unset). */
function entryPath() {
  try {
    const schema = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'schema.yml'), 'utf8'));
    return String(schema?.entry?.path || 'catalog').replace(/^\/+|\/+$/g, '');
  } catch {
    return 'catalog';
  }
}

/** Key of the first schema field of type `images`, or null. */
function imagesKey() {
  try {
    const schema = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'schema.yml'), 'utf8'));
    return (schema?.fields || []).find((f) => f && f.type === 'images')?.key ?? null;
  } catch {
    return null;
  }
}

/** Front matter of `<dir>/index.md` as an object ({} when unreadable). */
function frontMatter(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return match ? yaml.load(match[1]) || {} : {};
  } catch {
    return {};
  }
}

/**
 * Site-relative paths of the entry pages to audit: the first entry with images
 * and the first without (alphabetical), each only if it exists.
 * @param {string} [root] repo root (tests pass a fixture).
 * @returns {string[]} e.g. `['/catalog/epi-signal-triage/', '/catalog/coalition-meeting-notes/']`.
 */
function sampleEntryPaths(root = ROOT) {
  const dir = path.join(root, entryPath());
  if (!fs.existsSync(dir)) return [];
  const key = imagesKey();
  const slugs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.md')))
    .map((d) => d.name)
    .sort();
  const hasImages = (slug) => {
    const value = key ? frontMatter(path.join(dir, slug, 'index.md'))[key] : null;
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  };
  const withImages = slugs.find(hasImages);
  const without = slugs.find((slug) => !hasImages(slug));
  return [withImages, without].filter(Boolean).map((slug) => `/${entryPath()}/${slug}/`);
}

/**
 * Absolute URLs for the gate: the static pages plus the sample entries.
 * @param {string} base e.g. `http://127.0.0.1:4173`.
 * @returns {{ home: string, catalog: string, submit: string, entries: string[] }}
 */
function qualityUrls(base) {
  const at = (p) => `${base.replace(/\/$/, '')}${p}`;
  return {
    home: at('/'),
    catalog: at(`/${entryPath()}/`),
    submit: at('/submit/'),
    entries: sampleEntryPaths().map(at),
  };
}

module.exports = { entryPath, sampleEntryPaths, qualityUrls };
