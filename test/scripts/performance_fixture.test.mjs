import test from 'node:test';
import assert from 'node:assert/strict';

import { budgetFindings } from '../../scripts/performance_fixture.mjs';

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
