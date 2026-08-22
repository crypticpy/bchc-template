import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { budgetFindings, configuredEntryPath, pageMetrics } from '../../scripts/performance_fixture.mjs';

const config = { supported_entries: 100, budgets: { build_ms: 1000, css_gzip_bytes: 100 } };
const metrics = {
  entries: 100,
  build_ms: 900,
  artifact: { bytes: 1, files: 1 },
  catalog: { gzip_bytes: 1, dom_nodes: 1 },
  css_gzip_bytes: 90,
  javascript_gzip_bytes: 1,
  search_json_gzip_bytes: 1,
  entries_json_gzip_bytes: 1,
};

test('budgets report the measured value and maximum', () => {
  assert.deepEqual(budgetFindings({ ...metrics, build_ms: 1001 }, config), [
    { name: 'build_ms', actual: 1001, maximum: 1000 },
  ]);
});

test('a probe above supported scale records evidence without failing release budgets', () => {
  assert.deepEqual(budgetFindings({ ...metrics, entries: 500, build_ms: 999999 }, config), []);
});

test('the performance probe derives a customized entry path from the fixture schema', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phct-performance-path-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '_data'));
  fs.writeFileSync(path.join(root, '_data', 'schema.yml'), 'entry:\n  path: /projects/\n');
  assert.equal(configuredEntryPath(root), 'projects');
});

test('missing catalog output cannot silently produce zero-valued metrics', (t) => {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phct-performance-site-'));
  t.after(() => fs.rmSync(siteDir, { recursive: true, force: true }));
  assert.throws(
    () => pageMetrics(siteDir, path.join('projects', 'index.html')),
    /required performance page was not built: projects\/index\.html/
  );
});
