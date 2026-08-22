import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function workflow(name) {
  return fs.readFileSync(path.join(ROOT, '.github', 'workflows', name), 'utf8');
}

test('the PHCT updater can start cleanly and refuses an inconsistent parent lock', () => {
  const source = workflow('update-phct.yml');
  assert.match(source, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(source, /refs\/phct-update\/from\/\$from/);
  assert.match(source, /refs\/phct-update\/to\/\$RELEASE/);
  assert.match(source, /resolved_from=.*git rev-parse/);
  assert.match(source, /\[ "\$resolved_from" != "\$locked_commit" \]/);
  assert.match(source, /FROM_REF: \$\{\{ steps\.release\.outputs\.from_ref \}\}/);
  assert.match(source, /--from "\$FROM_REF" --to "\$TAG_REF"/);
  const merge = source.indexOf('Merge the immutable PHCT candidate');
  const candidateRuby = source.indexOf('Setup candidate Ruby from the merged .ruby-version');
  const candidateNode = source.indexOf('Setup candidate Node from the merged .node-version');
  assert.ok(merge >= 0 && candidateRuby > merge && candidateNode > candidateRuby);
});

test('the PHCT updater preserves review evidence and never blindly overwrites a branch', () => {
  const source = workflow('update-phct.yml');
  assert.match(source, /deployment-protected-before\.json/);
  assert.match(source, /deployment-protected-after\.json/);
  assert.match(source, /git push --force-with-lease origin/);
  assert.doesNotMatch(source, /git push --force origin/);
  assert.match(source, /BASE_BRANCH: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(source, /gh pr list --head "\$BRANCH" --state open/);
  assert.match(source, /gh pr create --base "\$BASE_BRANCH"/);
});

test('a built-in-token update dispatches every release gate', () => {
  const source = workflow('update-phct.yml');
  for (const name of ['validate.yml', 'quality.yml', 'performance.yml', 'supply-chain.yml', 'codeql.yml']) {
    assert.match(source, new RegExp(name.replace('.', '\\.'), 'u'));
  }
  for (const name of ['performance.yml', 'supply-chain.yml', 'codeql.yml']) {
    assert.match(workflow(name), /Report the dispatched run on its commit/);
  }
});
test('release performance always exercises the complete deterministic matrix', () => {
  const source = workflow('performance.yml');
  assert.match(source, /DISPATCH_COUNTS:-0,1,10,100,500,1000/);
  assert.match(source, /push:\n\s+branches: \[main\]/);
  assert.doesNotMatch(source, /pull_request:\n\s+paths:/);
});

test('the canonical PHCT Pages and quality workflows cannot silently skip the showcase', () => {
  for (const name of ['pages.yml', 'quality.yml']) {
    const source = workflow(name);
    assert.match(source, /REPOSITORY: \$\{\{ github\.repository \}\}/);
    assert.match(source, /"\$REPOSITORY" == "crypticpy\/phct"/);
    assert.match(source, /"\$CATALOG_SHOWCASE" == "true"/);
  }
});

test('machine-maintained branches use lease-protected force pushes', () => {
  for (const name of ['apply-setup.yml', 'new-entry.yml', 'update-phct.yml']) {
    const source = workflow(name);
    assert.doesNotMatch(source, /git push --force origin/);
    assert.match(source, /git push --force-with-lease origin/);
  }
});

test('every npm dependency install selects the exact package manager after setup-node', () => {
  const directory = path.join(ROOT, '.github', 'workflows');
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith('.yml'))) {
    const source = workflow(name);
    for (const match of source.matchAll(/^\s+(?:run:\s*)?npm ci\b/gmu)) {
      const cursor = match.index;
      const setup = source.lastIndexOf('actions/setup-node@', cursor);
      const exact = source.lastIndexOf('node scripts/install_exact_npm.mjs', cursor);
      assert.ok(setup >= 0 && exact > setup, `${name} runs npm ci without selecting exact npm`);
    }
  }
});
