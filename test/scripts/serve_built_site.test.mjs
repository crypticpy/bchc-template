import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveRequest, shouldGzip } from '../../scripts/serve_built_site.mjs';

test('built-site requests stay inside the configured directory', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'phct-static-'));
  fs.mkdirSync(path.join(directory, 'catalog'));
  fs.writeFileSync(path.join(directory, 'catalog', 'index.html'), '<h1>Catalog</h1>');
  try {
    assert.equal(resolveRequest(directory, '/catalog/'), path.join(directory, 'catalog', 'index.html'));
    assert.equal(resolveRequest(directory, '/%2e%2e/package.json'), null);
    assert.equal(resolveRequest(directory, '/missing/'), null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('only substantial text responses are gzipped for clients that accept it', () => {
  assert.equal(
    shouldGzip({ acceptEncoding: 'br, gzip', contentType: 'text/css; charset=utf-8', byteLength: 2048 }),
    true
  );
  assert.equal(shouldGzip({ acceptEncoding: 'gzip', contentType: 'image/png', byteLength: 2048 }), false);
  assert.equal(shouldGzip({ acceptEncoding: 'identity', contentType: 'text/html', byteLength: 2048 }), false);
  assert.equal(
    shouldGzip({ acceptEncoding: 'gzip', contentType: 'application/json', byteLength: 100 }),
    false
  );
});
