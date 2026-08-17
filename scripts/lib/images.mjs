/**
 * Download the images a submitter attached to a GitHub issue into the entry
 * folder, so the published page never hot-links someone else's host.
 *
 * Rules (docs/content-model.md, `images` field type):
 *   - at most `maxFiles` files and `maxTotalBytes` in total;
 *   - PNG, JPEG, GIF or WebP only, verified by BOTH the response content-type
 *     and the file's magic bytes;
 *   - one request per URL, `timeoutMs` each, redirects followed;
 *   - a failure is a warning, never a fatal error: the URL is left out of the
 *     front matter (so the page never shows a broken image) and named in the
 *     pull request so a maintainer can re-add it.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Allowed content types mapped to the extension we save them under. */
const TYPE_EXTENSIONS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
]);

export const MAX_FILES = 8;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
export const TIMEOUT_MS = 30_000;

/**
 * Extension for a `Content-Type` header, or `''` when the type is not allowed.
 * @param {string|null|undefined} contentType
 * @returns {string}
 */
export function extensionForContentType(contentType) {
  const type = String(contentType ?? '').split(';')[0].trim().toLowerCase();
  return TYPE_EXTENSIONS.get(type) ?? '';
}

/**
 * Identify an image by its magic bytes. Returns `'png' | 'jpg' | 'gif' |
 * 'webp'`, or `''` when the bytes are not one of those formats.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function sniffImageType(bytes) {
  const b = bytes ?? new Uint8Array();
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return '';
}

/** @returns {boolean} true when the URL is a plain http(s) URL we may fetch. */
function fetchable(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetch, verify and store image references.
 *
 * @param {Array<{url: string, alt?: string}>} refs parsed image references
 * @param {object} options
 * @param {string} options.destDir absolute folder the files are written to
 * @param {string} options.publicPrefix site-absolute prefix for `src`
 *   (e.g. `/catalog/my-entry/screenshots`)
 * @param {string} [options.altFallback] alt text used when the submitter gave none
 * @param {number} [options.maxFiles]
 * @param {number} [options.maxTotalBytes]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.token] GitHub token, sent to github.com hosts only
 * @param {typeof fetch} [options.fetchImpl] injected for tests
 * @param {{mkdirSync: Function, writeFileSync: Function}} [options.fsImpl] injected for tests
 * @returns {Promise<{items: Array<{src: string, alt: string}>, warnings: string[]}>}
 */
export async function downloadImages(refs, options) {
  const {
    destDir,
    publicPrefix,
    altFallback = '',
    maxFiles = MAX_FILES,
    maxTotalBytes = MAX_TOTAL_BYTES,
    timeoutMs = TIMEOUT_MS,
    token = '',
    fetchImpl = globalThis.fetch,
    fsImpl = fs,
  } = options ?? {};

  /** @type {Array<{src: string, alt: string}>} */
  const items = [];
  /** @type {string[]} */
  const warnings = [];
  const candidates = Array.isArray(refs) ? refs : [];

  if (candidates.length === 0) return { items, warnings };
  if (candidates.length > maxFiles) {
    warnings.push(`Only the first ${maxFiles} images were saved; ${candidates.length - maxFiles} were ignored.`);
  }

  let total = 0;
  let saved = 0;

  for (const ref of candidates.slice(0, maxFiles)) {
    const url = String(ref?.url ?? '');
    const alt = String(ref?.alt ?? '').trim();

    if (!fetchable(url)) {
      warnings.push(`Skipped \`${url}\` — only http(s) image URLs can be downloaded.`);
      continue;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        const headers = { accept: 'image/*' };
        if (token && /(^|\.)github(usercontent)?\.com$/i.test(new URL(url).hostname)) {
          headers.authorization = `Bearer ${token}`;
        }
        response = await fetchImpl(url, { redirect: 'follow', signal: controller.signal, headers });
      } finally {
        clearTimeout(timer);
      }

      if (!response || !response.ok) {
        warnings.push(`Could not download ${url} (HTTP ${response ? response.status : 'error'}). Left it out — re-add it in this pull request if it should be included.`);
        continue;
      }

      const declared = extensionForContentType(response.headers?.get?.('content-type'));
      if (!declared) {
        warnings.push(`Skipped ${url} — its content type is not PNG, JPEG, GIF or WebP.`);
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const sniffed = sniffImageType(bytes);
      if (!sniffed) {
        warnings.push(`Skipped ${url} — the file does not look like a PNG, JPEG, GIF or WebP image.`);
        continue;
      }
      if (total + bytes.length > maxTotalBytes) {
        warnings.push(`Skipped ${url} — the images add up to more than ${Math.round(maxTotalBytes / (1024 * 1024))} MB.`);
        continue;
      }

      saved += 1;
      total += bytes.length;
      const name = `${String(saved).padStart(2, '0')}.${sniffed}`;
      fsImpl.mkdirSync(destDir, { recursive: true });
      fsImpl.writeFileSync(path.join(destDir, name), bytes);
      items.push({ src: `${publicPrefix}/${name}`, alt: alt || altFallback });
    } catch (error) {
      warnings.push(`Could not download ${url} (${error.message}). Left it out — re-add it in this pull request if it should be included.`);
    }
  }

  return { items, warnings };
}
