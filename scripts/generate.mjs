#!/usr/bin/env node
/**
 * Regenerate the files derived from _data/schema.yml and _data/site.yml.
 *
 *   npm run generate
 *
 * Writes  .github/ISSUE_TEMPLATE/new-entry.yml  (the public submission form)
 * Syncs   _config.yml  title/description  from _data/site.yml (SEO fallbacks)
 *
 * Run this after hand-editing _data/schema.yml. CI runs it before the Jekyll
 * build, so a stale issue form never ships. It is idempotent: a second run
 * reports no changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const core = await import(pathToFileURL(path.join(ROOT, 'assets/js/configurator/core.js')).href);

const ISSUE_TEMPLATE_PATH = '.github/ISSUE_TEMPLATE/new-entry.yml';
const CONFIG_PATH = '_config.yml';

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

/** Write only when the content differs. Returns true when the file changed. */
function writeIfChanged(relative, content) {
  const file = path.join(ROOT, relative);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (existing === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return existing === null ? 'created' : 'updated';
}

// --- load -------------------------------------------------------------------

const schema = readData('_data/schema.yml');
const site = readData('_data/site.yml');

const errors = core.validateSchema(schema);
if (errors.length > 0) {
  console.error('\n_data/schema.yml is not valid:\n');
  for (const error of errors) console.error(`  • ${error}`);
  console.error('\nFix the field definitions and run `npm run generate` again.\n');
  process.exit(1);
}

// --- issue form -------------------------------------------------------------

const changes = [];

const issueForm = core.issueTemplateFromSchema(schema, site);
const issueResult = writeIfChanged(ISSUE_TEMPLATE_PATH, issueForm);
if (issueResult) {
  const fieldCount = (Array.isArray(schema.fields) ? schema.fields : []).filter((f) => f.form !== false).length;
  changes.push(`${issueResult} ${ISSUE_TEMPLATE_PATH} (${fieldCount} fields)`);
}

// --- _config.yml title/description ------------------------------------------

const configFile = path.join(ROOT, CONFIG_PATH);
if (fs.existsSync(configFile)) {
  const original = fs.readFileSync(configFile, 'utf8');
  const patched = core.patchJekyllConfig(original, site);
  if (patched.text !== original) {
    fs.writeFileSync(configFile, patched.text, 'utf8');
    changes.push(`updated ${CONFIG_PATH} (${patched.changed.join(' and ')} synced from _data/site.yml)`);
  }
} else {
  console.warn(`Warning: ${CONFIG_PATH} not found; skipped the title/description sync.`);
}

// --- report -----------------------------------------------------------------

if (changes.length === 0) {
  console.log('Everything is up to date — no changes.');
} else {
  for (const change of changes) console.log(change);
}
