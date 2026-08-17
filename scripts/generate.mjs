#!/usr/bin/env node
/**
 * Regenerate everything derived from _data/*.yml.
 *
 *   npm run generate            write the files that changed
 *   npm run generate -- --check exit 1 if anything would change (CI gate)
 *
 * Writes  assets/js/configurator/defaults.generated.js  (wizard defaults)
 * Writes  .github/ISSUE_TEMPLATE/new-entry.yml          (public submission form)
 * Syncs   _config.yml title/description from _data/site.yml (SEO fallbacks)
 *
 * Run this after hand-editing _data/schema.yml or _data/site.yml. It is
 * idempotent: a second run reports no changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { renderDefaults, OUTPUT_PATH as DEFAULTS_PATH } from './build_defaults.mjs';

const ROOT = process.cwd();
const ISSUE_TEMPLATE_PATH = '.github/ISSUE_TEMPLATE/new-entry.yml';
const CONFIG_PATH = '_config.yml';

const check = process.argv.slice(2).some((arg) => arg === '--check');
const changes = [];
const stale = [];

function abort(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function readData(relative) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) abort(`Missing ${relative}. Run \`npm run setup\` first.`);
  try {
    return yaml.load(fs.readFileSync(file, 'utf8')) || {};
  } catch (error) {
    abort(`Could not parse ${relative}:\n  ${error.message}`);
  }
}

/**
 * Write when the content differs — or, under `--check`, just record it.
 * @returns {boolean} true when the file was already up to date.
 */
function sync(relative, content, note = '') {
  const file = path.join(ROOT, relative);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (existing === content) return true;
  if (check) {
    stale.push(relative);
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  changes.push(`${existing === null ? 'created' : 'updated'} ${relative}${note ? ` (${note})` : ''}`);
  return false;
}

// --- 1. wizard defaults, compiled from _data/*.yml --------------------------
// Written first: core.js imports the generated module.

sync(DEFAULTS_PATH, renderDefaults(ROOT));

const core = await import(pathToFileURL(path.join(ROOT, 'assets/js/configurator/core.js')).href);

// --- 2. schema check --------------------------------------------------------

const schema = readData('_data/schema.yml');
const site = readData('_data/site.yml');

const result = core.checkSchema(schema);
if (!result.ok) {
  console.error('\n_data/schema.yml is not valid:\n');
  for (const { path: where, message } of result.errors) console.error(`  • ${where}: ${message}`);
  console.error('\nFix the field definitions and run `npm run generate` again.\n');
  process.exit(1);
}
for (const { path: where, message } of result.warnings) console.warn(`  ! ${where}: ${message}`);

// --- 3. issue form ----------------------------------------------------------

const fieldCount = (Array.isArray(schema.fields) ? schema.fields : []).filter((f) => f.form !== false).length;
sync(ISSUE_TEMPLATE_PATH, core.issueTemplateFromSchema(schema, site), `${fieldCount} fields`);

// --- 4. _config.yml title/description ---------------------------------------

const configFile = path.join(ROOT, CONFIG_PATH);
if (fs.existsSync(configFile)) {
  const original = fs.readFileSync(configFile, 'utf8');
  const patched = core.patchJekyllConfig(original, site);
  sync(CONFIG_PATH, patched.text, `${patched.changed.join(' and ')} synced from _data/site.yml`);
} else {
  console.warn(`Warning: ${CONFIG_PATH} not found; skipped the title/description sync.`);
}

// --- report -----------------------------------------------------------------

if (check) {
  if (stale.length === 0) {
    console.log('Generated files are in sync.');
  } else {
    console.error('\nThese generated files are out of date:\n');
    for (const file of stale) console.error(`  • ${file}`);
    console.error('\nRun `npm run generate` and commit the result.\n');
    process.exit(1);
  }
} else if (changes.length === 0) {
  console.log('Everything is up to date — no changes.');
} else {
  for (const change of changes) console.log(change);
}
