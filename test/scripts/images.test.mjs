import assert from 'node:assert/strict';
import test from 'node:test';

import { downloadImages, extensionForContentType, sniffImageType } from '../../scripts/lib/images.mjs';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const TEXT = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]);

/** Build a minimal fetch stand-in returning the given body and headers. */
function stubResponse(bytes, contentType, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

/** Collect writes instead of touching the disk. */
function stubFs() {
  const written = new Map();
  return {
    written,
    mkdirSync() {},
    writeFileSync(file, data) {
      written.set(file, data);
    },
  };
}

test('sniffImageType recognises the four allowed formats and rejects others', () => {
  assert.equal(sniffImageType(PNG), 'png');
  assert.equal(sniffImageType(JPG), 'jpg');
  assert.equal(sniffImageType(GIF), 'gif');
  assert.equal(sniffImageType(WEBP), 'webp');
  assert.equal(sniffImageType(TEXT), '');
  assert.equal(sniffImageType(new Uint8Array()), '');
});

test('extensionForContentType ignores parameters and rejects other types', () => {
  assert.equal(extensionForContentType('image/png; charset=binary'), 'png');
  assert.equal(extensionForContentType('IMAGE/JPEG'), 'jpg');
  assert.equal(extensionForContentType('image/svg+xml'), '');
  assert.equal(extensionForContentType(null), '');
});

test('downloadImages numbers files and writes site-absolute src values', async () => {
  const files = stubFs();
  const result = await downloadImages(
    [
      { url: 'https://e.org/a.png', alt: 'Queue view' },
      { url: 'https://e.org/b', alt: '' },
    ],
    {
      destDir: '/repo/catalog/x/screenshots',
      publicPrefix: '/catalog/x/screenshots',
      altFallback: 'X — screenshot',
      fsImpl: files,
      fetchImpl: async (url) => stubResponse(url.endsWith('a.png') ? PNG : JPG, url.endsWith('a.png') ? 'image/png' : 'image/jpeg'),
    }
  );

  assert.deepEqual(result.items, [
    { src: '/catalog/x/screenshots/01.png', alt: 'Queue view' },
    { src: '/catalog/x/screenshots/02.jpg', alt: 'X — screenshot' },
  ]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual([...files.written.keys()], [
    '/repo/catalog/x/screenshots/01.png',
    '/repo/catalog/x/screenshots/02.jpg',
  ]);
});

test('downloadImages rejects a disallowed content type and a lying content type', async () => {
  const files = stubFs();
  const result = await downloadImages(
    [
      { url: 'https://e.org/a.svg' },
      { url: 'https://e.org/b.png' },
    ],
    {
      destDir: '/d',
      publicPrefix: '/p',
      fsImpl: files,
      fetchImpl: async (url) =>
        url.endsWith('.svg') ? stubResponse(TEXT, 'image/svg+xml') : stubResponse(TEXT, 'image/png'),
    }
  );

  assert.deepEqual(result.items, []);
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0], /content type/);
  assert.match(result.warnings[1], /does not look like/);
  assert.equal(files.written.size, 0);
});

test('downloadImages caps the file count and the total size', async () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ url: `https://e.org/${i}.png` }));
  const files = stubFs();
  const result = await downloadImages(many, {
    destDir: '/d',
    publicPrefix: '/p',
    maxFiles: 3,
    maxTotalBytes: PNG.length * 2,
    fsImpl: files,
    fetchImpl: async () => stubResponse(PNG, 'image/png'),
  });

  assert.equal(result.items.length, 2);
  assert.ok(result.warnings.some((w) => /Only the first 3 images/.test(w)));
  assert.ok(result.warnings.some((w) => /add up to more than/.test(w)));
});

test('downloadImages keeps the remote URL when a fetch fails', async () => {
  const files = stubFs();
  const result = await downloadImages([{ url: 'https://e.org/gone.png', alt: 'Gone' }], {
    destDir: '/d',
    publicPrefix: '/p',
    fsImpl: files,
    fetchImpl: async () => stubResponse(PNG, 'image/png', false, 404),
  });

  assert.deepEqual(result.items, [{ src: 'https://e.org/gone.png', alt: 'Gone' }]);
  assert.match(result.warnings[0], /HTTP 404/);
});

test('downloadImages refuses non-http URLs and returns early with no refs', async () => {
  const blocked = await downloadImages([{ url: 'file:///etc/passwd' }], {
    destDir: '/d',
    publicPrefix: '/p',
    fsImpl: stubFs(),
    fetchImpl: async () => {
      throw new Error('should not be called');
    },
  });
  assert.deepEqual(blocked.items, []);
  assert.match(blocked.warnings[0], /only http\(s\)/i);

  const none = await downloadImages([], { destDir: '/d', publicPrefix: '/p' });
  assert.deepEqual(none, { items: [], warnings: [] });
});
