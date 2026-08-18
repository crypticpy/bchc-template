/**
 * The entry scaffolder's review-status default (scripts/new_entry_from_issue.mjs).
 *
 *   npm test     (node --test)
 *
 * Runs the real script in `--dry-run` mode, which prints the front matter it
 * would write and touches nothing. Two schemas: the repository's own, which
 * names a `status_key`, and a throwaway one that does not — the second is the
 * promise that other presets' front matter is unchanged by the feature.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as yaml from 'js-yaml';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'new_entry_from_issue.mjs');
const ISSUE_BODY = fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'issue-basic.md'), 'utf8');

/**
 * @param {string} cwd checkout to run in
 * @returns {object} the parsed front matter of the dry run
 */
function dryRun(cwd) {
  const result = spawnSync(process.execPath, [SCRIPT, '--dry-run'], {
    cwd,
    env: { ...process.env, ISSUE_BODY, ISSUE_TITLE: '[Use case] Overdose spike brief', ISSUE_NUMBER: '7' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const match = result.stdout.match(/^---\n([\s\S]*?)\n---\n/m);
  assert.ok(match, `no front matter in:\n${result.stdout}`);
  return yaml.load(match[1]);
}

test('a schema with entry.status_key gets the scaffold value, whatever the issue said', () => {
  const schema = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'schema.yml'), 'utf8'));
  const { status_key: key, status_scaffold_value: start } = schema.entry;
  assert.ok(key && start, 'the repository schema names a status field and a scaffold value');
  const fm = dryRun(ROOT);
  assert.equal(fm[key], start);
});

test('a schema without entry.status_key writes no status at all', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-status-'));
  fs.mkdirSync(path.join(root, '_data'));
  const schema = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'schema.yml'), 'utf8'));
  delete schema.entry.status_key;
  delete schema.entry.deprecated_value;
  delete schema.entry.status_scaffold_value;
  fs.writeFileSync(path.join(root, '_data', 'schema.yml'), yaml.dump(schema), 'utf8');
  try {
    const fm = dryRun(root);
    // The field is still a schema field, so it is emitted as the (blank) answer
    // the issue carried; what must NOT happen is a default being invented.
    assert.notEqual(fm.review_status, 'Under review');
    assert.equal(fm.title, 'Overdose spike situational brief generator');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
