import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPublicHost,
  downloadImages,
  extensionForContentType,
  isBlockedAddress,
  sniffImageType,
} from '../../scripts/lib/images.mjs';

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

/** DNS stand-in: every hostname resolves to one ordinary public address. */
const PUBLIC_DNS = { lookup: async () => [{ address: '93.184.216.34', family: 4 }] };

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
      dnsImpl: PUBLIC_DNS,
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
      dnsImpl: PUBLIC_DNS,
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
    dnsImpl: PUBLIC_DNS,
    fsImpl: files,
    fetchImpl: async () => stubResponse(PNG, 'image/png'),
  });

  assert.equal(result.items.length, 2);
  assert.ok(result.warnings.some((w) => /Only the first 3 images/.test(w)));
  assert.ok(result.warnings.some((w) => /add up to more than/.test(w)));
});

test('downloadImages leaves a failed URL out of the items and warns', async () => {
  const files = stubFs();
  const result = await downloadImages([{ url: 'https://e.org/gone.png', alt: 'Gone' }], {
    destDir: '/d',
    publicPrefix: '/p',
    dnsImpl: PUBLIC_DNS,
    fsImpl: files,
    fetchImpl: async () => stubResponse(PNG, 'image/png', false, 404),
  });

  assert.deepEqual(result.items, []);
  assert.match(result.warnings[0], /HTTP 404/);
  assert.match(result.warnings[0], /gone\.png/);
});

test('downloadImages refuses non-http URLs and returns early with no refs', async () => {
  const blocked = await downloadImages([{ url: 'file:///etc/passwd' }], {
    destDir: '/d',
    publicPrefix: '/p',
    dnsImpl: PUBLIC_DNS,
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

test('isBlockedAddress covers loopback, link-local, private and multicast space', () => {
  ['127.0.0.1', '127.1.2.3', '169.254.169.254', '10.0.0.5', '172.16.0.1', '172.31.255.255',
    '192.168.1.1', '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12::3', 'ff02::1', '::ffff:127.0.0.1', 'nonsense',
  ].forEach((address) => assert.equal(isBlockedAddress(address), true, address));

  ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:2800:220:1:248:1893:25c8:1946']
    .forEach((address) => assert.equal(isBlockedAddress(address), false, address));
});

test('assertPublicHost refuses private hostnames, private DNS answers and IP literals', async () => {
  const never = { lookup: async () => { throw new Error('DNS should not be consulted'); } };

  await assert.rejects(assertPublicHost('http://metadata.internal/x', never), /private hostname/);
  await assert.rejects(assertPublicHost('http://db.local/x', never), /private hostname/);
  await assert.rejects(assertPublicHost('http://localhost:8080/x', never), /private hostname/);
  await assert.rejects(assertPublicHost('http://169.254.169.254/latest/meta-data/', never), /private or reserved/);
  await assert.rejects(assertPublicHost('http://[::1]/x', never), /private or reserved/);

  // A public name that resolves inward (DNS rebinding) is refused too, and one
  // bad address among several is enough.
  const rebind = { lookup: async () => [{ address: '93.184.216.34' }, { address: '10.1.2.3' }] };
  await assert.rejects(assertPublicHost('https://evil.example/x', rebind), /private address 10\.1\.2\.3/);

  await assert.doesNotReject(assertPublicHost('https://example.org/x', PUBLIC_DNS));
});

test('downloadImages never requests a URL whose host resolves inward', async () => {
  const files = stubFs();
  const result = await downloadImages(
    [{ url: 'http://169.254.169.254/latest/meta-data/iam/' }, { url: 'https://intranet.example/a.png' }],
    {
      destDir: '/d',
      publicPrefix: '/p',
      dnsImpl: { lookup: async () => [{ address: '10.0.0.7' }] },
      fsImpl: files,
      fetchImpl: async () => {
        throw new Error('fetch should never be reached');
      },
    }
  );

  assert.deepEqual(result.items, []);
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0], /private or reserved address/);
  assert.match(result.warnings[1], /private address 10\.0\.0\.7/);
  // Nothing that looks like an HTTP status leaked into the pull request text.
  result.warnings.forEach((warning) => assert.doesNotMatch(warning, /HTTP \d/));
});

test('downloadImages re-checks every redirect hop and caps the hop count', async () => {
  const files = stubFs();
  const seen = [];
  const redirectTo = (location) => ({
    ok: false,
    status: 302,
    headers: { get: (name) => (name.toLowerCase() === 'location' ? location : null) },
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  const bounced = await downloadImages([{ url: 'https://cdn.example/a.png' }], {
    destDir: '/d',
    publicPrefix: '/p',
    // The first host is public, the host it redirects to is not.
    dnsImpl: {
      lookup: async (host) => [{ address: host === 'cdn.example' ? '93.184.216.34' : '169.254.169.254' }],
    },
    fsImpl: files,
    fetchImpl: async (url) => {
      seen.push(url);
      return redirectTo('http://metadata.example/token');
    },
  });

  assert.deepEqual(seen, ['https://cdn.example/a.png']);
  assert.deepEqual(bounced.items, []);
  assert.match(bounced.warnings[0], /private address 169\.254\.169\.254/);

  const looped = await downloadImages([{ url: 'https://cdn.example/a.png' }], {
    destDir: '/d',
    publicPrefix: '/p',
    dnsImpl: PUBLIC_DNS,
    fsImpl: files,
    fetchImpl: async (url) => redirectTo(`${url}/again`),
  });
  assert.match(looped.warnings[0], /redirects more than 5 times/);
});

test('downloadImages refuses a body larger than the size cap, declared or actual', async () => {
  const withLength = (bytes, length) => ({
    ok: true,
    status: 200,
    headers: {
      get: (name) => {
        const key = name.toLowerCase();
        if (key === 'content-type') return 'image/png';
        if (key === 'content-length') return length === null ? null : String(length);
        return null;
      },
    },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });

  const lying = await downloadImages([{ url: 'https://e.org/huge.png' }, { url: 'https://e.org/liar.png' }], {
    destDir: '/d',
    publicPrefix: '/p',
    maxTotalBytes: 8,
    dnsImpl: PUBLIC_DNS,
    fsImpl: stubFs(),
    // The first declares its size honestly; the second under-reports it and is
    // still caught once the bytes are in hand.
    fetchImpl: async (url) => (url.endsWith('huge.png')
      ? withLength(PNG, 1024 * 1024)
      : withLength(PNG, null)),
  });

  assert.deepEqual(lying.items, []);
  assert.equal(lying.warnings.length, 2);
  lying.warnings.forEach((warning) => assert.match(warning, /size cap/));
});

test('the abort timer stays armed until the body has been read', async () => {
  // A server that answers its headers instantly and then dribbles the body used
  // to hang the job: the timeout was cleared as soon as the headers arrived.
  const files = stubFs();
  const result = await downloadImages([{ url: 'https://e.org/slow.png' }], {
    destDir: '/d',
    publicPrefix: '/p',
    timeoutMs: 20,
    dnsImpl: PUBLIC_DNS,
    fsImpl: files,
    fetchImpl: async (_url, init) => ({
      ok: true,
      status: 200,
      headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'image/png' : null) },
      arrayBuffer: () => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(PNG.buffer), 5_000);
        init.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('The operation was aborted'));
        });
      }),
    }),
  });

  assert.deepEqual(result.items, []);
  assert.match(result.warnings[0], /aborted/i);
  assert.equal(files.written.size, 0);
});
