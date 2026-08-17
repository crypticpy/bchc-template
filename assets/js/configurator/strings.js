/**
 * String and GitHub-URL helpers used by both wizards.
 */

/** URL-safe slug: lowercase, non-alphanumerics collapsed to single hyphens. */
export function slugify(str) {
  return String(str ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** snake_case front matter key derived from a human label. */
export function snakeKey(str) {
  const base = String(str ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) return '';
  return /^[0-9]/.test(base) ? `field_${base}` : base;
}

/** "Create a new file" URL with the content prefilled (new files only). */
export function githubNewFileUrl(repository, branch, path, content) {
  const repo = String(repository ?? '').trim();
  if (!repo) return '';
  const ref = String(branch ?? 'main').trim() || 'main';
  const params = new URLSearchParams({ filename: String(path ?? ''), value: String(content ?? '') });
  return `https://github.com/${repo}/new/${encodeURIComponent(ref)}?${params.toString()}`;
}

/** "Edit this file" URL. GitHub cannot prefill the editor for existing files. */
export function githubEditFileUrl(repository, branch, path) {
  const repo = String(repository ?? '').trim();
  if (!repo) return '';
  const ref = String(branch ?? 'main').trim() || 'main';
  return `https://github.com/${repo}/edit/${encodeURIComponent(ref)}/${String(path ?? '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

/**
 * True when a prefilled URL is long enough that GitHub/browsers may reject it.
 * The same 7000 is the `MAX_URL` of assets/js/submit.js (a classic script, so
 * it cannot import this module); change one and change the other.
 */
export function prefillNoticeIfTooLong(url) {
  return String(url ?? '').length > 7000;
}
