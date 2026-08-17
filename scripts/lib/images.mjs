/**
 * Download the images a submitter attached to a GitHub issue into the entry
 * folder, so the published page never hot-links someone else's host.
 *
 * Rules (docs/content-model.md, `images` field type):
 *   - at most `maxFiles` files and `maxTotalBytes` in total;
 *   - PNG, JPEG, GIF or WebP only, verified by BOTH the response content-type
 *     and the file's magic bytes;
 *   - one request per URL, `timeoutMs` each (covering the body, not just the
 *     headers), redirects followed by hand so every hop can be re-checked;
 *   - the host of every hop must resolve to a public address — see
 *     `assertPublicHost`. The URLs come from an issue anyone can open and the
 *     runner sits inside a network with a metadata service on it, so a link to
 *     169.254.169.254 or 10.0.0.5 must never turn into a request;
 *   - a failure is a warning, never a fatal error: the URL is left out of the
 *     front matter (so the page never shows a broken image) and named in the
 *     pull request so a maintainer can re-add it.
 */

import dnsPromises from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
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
/** Redirect hops followed before giving up (each one is re-checked). */
export const MAX_REDIRECTS = 5;

/** Host suffixes that only ever name something on the runner's own network. */
const PRIVATE_SUFFIXES = ['.internal', '.local', '.localhost', 'localhost'];

/**
 * Is this literal IP address one we refuse to talk to? Covers loopback,
 * link-local (including the cloud metadata address), the RFC1918 ranges,
 * carrier-grade NAT, the unspecified address, multicast and reserved space,
 * plus the IPv6 equivalents and IPv4-mapped IPv6.
 * @param {string} address
 * @returns {boolean}
 */
export function isBlockedAddress(address) {
  const value = String(address ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!value) return true;

  const version = net.isIP(value);
  if (version === 4) {
    const parts = value.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true; //                         0.0.0.0/8 "this network"
    if (a === 10) return true; //                        10/8 private
    if (a === 127) return true; //                       127/8 loopback
    if (a === 169 && b === 254) return true; //          169.254/16 link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 private
    if (a === 192 && b === 168) return true; //          192.168/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
    if (a === 192 && b === 0) return true; //            192.0.0/24 + 192.0.2/24
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
    if (a >= 224) return true; //                        multicast + reserved + broadcast
    return false;
  }
  if (version !== 6) return true; // not an IP at all — caller must resolve first

  // IPv4-mapped / IPv4-compatible forms reuse the IPv4 rules.
  const mapped = /^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  if (mapped) return isBlockedAddress(mapped[1]);

  if (value === '::' || value === '::1') return true; //  unspecified, loopback
  if (/^fe[89ab]/.test(value)) return true; //            fe80::/10 link-local
  if (/^f[cd]/.test(value)) return true; //               fc00::/7 unique-local
  if (/^ff/.test(value)) return true; //                  ff00::/8 multicast
  return false;
}

/**
 * Throw unless every address `url`'s host resolves to is publicly routable.
 * IP-literal URLs skip DNS but go through exactly the same address rules.
 * @param {string} url
 * @param {{lookup: Function}} [dnsImpl] injected for tests
 * @returns {Promise<void>}
 */
export async function assertPublicHost(url, dnsImpl = dnsPromises) {
  const hostname = new URL(url).hostname;
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');

  if (PRIVATE_SUFFIXES.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix))) {
    throw new Error(`${hostname} is a private hostname`);
  }

  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new Error(`${hostname} is a private or reserved address`);
    return;
  }

  const resolved = await dnsImpl.lookup(host, { all: true });
  const addresses = (Array.isArray(resolved) ? resolved : [resolved]).map((item) => item?.address ?? item);
  if (addresses.length === 0) throw new Error(`${hostname} does not resolve`);
  const blocked = addresses.find((address) => isBlockedAddress(address));
  if (blocked) throw new Error(`${hostname} resolves to the private address ${blocked}`);
}

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
 * One guarded download: every redirect hop is followed by hand so its host can
 * be re-checked, and the abort timer stays armed until the body has been read
 * (clearing it after the headers arrive would let a server dribble bytes for
 * ever and hang the job).
 *
 * @param {string} url
 * @param {object} options
 * @param {typeof fetch} options.fetchImpl
 * @param {{lookup: Function}} options.dnsImpl
 * @param {number} options.timeoutMs
 * @param {number} options.maxBytes budget left for this file
 * @param {string} options.token
 * @returns {Promise<{response: Response, bytes: Uint8Array|null}>}
 */
async function fetchImage(url, { fetchImpl, dnsImpl, timeoutMs, maxBytes, token }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      await assertPublicHost(current, dnsImpl);

      const headers = { accept: 'image/*' };
      // Re-decided per hop, so a redirect off github.com does not leak the token.
      if (token && /(^|\.)github(usercontent)?\.com$/i.test(new URL(current).hostname)) {
        headers.authorization = `Bearer ${token}`;
      }
      const response = await fetchImpl(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers,
      });
      if (!response) throw new Error('no response');

      const status = Number(response.status);
      const location = response.headers?.get?.('location');
      if (status >= 300 && status < 400 && location) {
        const next = new URL(location, current);
        if (next.protocol !== 'http:' && next.protocol !== 'https:') {
          throw new Error(`it redirects to a ${next.protocol} URL`);
        }
        current = next.toString();
        continue;
      }

      if (!response.ok) return { response, bytes: null };

      const declared = Number(response.headers?.get?.('content-length'));
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw new Error(`it is larger than the ${Math.round(maxBytes / (1024 * 1024))} MB size cap`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > maxBytes) {
        throw new Error(`it is larger than the ${Math.round(maxBytes / (1024 * 1024))} MB size cap`);
      }
      return { response, bytes };
    }
    throw new Error(`it redirects more than ${MAX_REDIRECTS} times`);
  } finally {
    clearTimeout(timer);
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
 * @param {{lookup: Function}} [options.dnsImpl] injected for tests
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
    dnsImpl = dnsPromises,
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
      const { response, bytes } = await fetchImage(url, {
        fetchImpl,
        dnsImpl,
        timeoutMs,
        // Per-file ceiling. Nothing bigger than the whole budget is ever
        // buffered, so a 4 GB "image" is refused on its Content-Length.
        maxBytes: maxTotalBytes,
        token,
      });

      if (!bytes) {
        warnings.push(`Could not download ${url} (HTTP ${response.status}). Left it out — re-add it in this pull request if it should be included.`);
        continue;
      }

      const declared = extensionForContentType(response.headers?.get?.('content-type'));
      if (!declared) {
        warnings.push(`Skipped ${url} — its content type is not PNG, JPEG, GIF or WebP.`);
        continue;
      }

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
