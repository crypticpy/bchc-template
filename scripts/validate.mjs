#!/usr/bin/env node
/**
 * Local mirror of the CI validation gate: `npm run validate`.
 *
 * 1. Parses every _data/*.yml and _data/cohorts/*.yml file.
 * 2. Runs scripts/check_front_matter.rb and scripts/check_file_sizes.rb.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

const ROOT = process.cwd();
let failed = false;

function report(ok, label, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`);
  if (!ok) failed = true;
}

// --- YAML data files -------------------------------------------------------

const dataFiles = [
  ...listYaml(path.join(ROOT, '_data')),
  ...listYaml(path.join(ROOT, '_data', 'cohorts')),
];

function listYaml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

for (const file of dataFiles) {
  const rel = path.relative(ROOT, file);
  try {
    yaml.load(fs.readFileSync(file, 'utf8'));
    report(true, rel);
  } catch (error) {
    report(false, rel, error.message);
  }
}

if (dataFiles.length === 0) console.log('SKIP  no YAML data files found under _data/');

// --- Ruby checks -----------------------------------------------------------

const rubyAvailable = spawnSync('ruby', ['--version'], { stdio: 'ignore' }).status === 0;

if (!rubyAvailable) {
  console.log(
    '\nSKIP  Ruby checks — `ruby` was not found on your PATH.\n' +
      '      Front matter and file size validation were NOT run locally; CI will still run them.\n' +
      '      Install Ruby 3.3+ (e.g. `brew install ruby`) to run the full gate.'
  );
} else {
  for (const script of ['check_front_matter.rb', 'check_file_sizes.rb']) {
    const result = spawnSync('ruby', [path.join('scripts', script)], { cwd: ROOT, stdio: 'inherit' });
    report(result.status === 0, `scripts/${script}`);
  }
}

console.log(failed ? '\nValidation failed.' : '\nValidation passed.');
process.exit(failed ? 1 : 0);
