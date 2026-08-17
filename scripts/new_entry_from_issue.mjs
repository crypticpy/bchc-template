#!/usr/bin/env node
/**
 * Scaffold a catalog entry from a GitHub issue form submission.
 *
 * Input (env):  ISSUE_BODY, ISSUE_TITLE, ISSUE_NUMBER
 * Output:       catalog/<slug>/index.md
 *               $GITHUB_OUTPUT: slug, branch, title  (or `error` on failure)
 *
 * The set of front matter keys is driven entirely by _data/schema.yml, so this
 * script never needs editing when the content model changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, '_data', 'schema.yml');

// Keys emitted by the fixed header block; schema fields with these keys are not
// repeated in the generated front matter (duplicate YAML keys are invalid).
const HEADER_KEYS = new Set(['title', 'slug', 'published', 'featured', 'thumbnail']);
const NO_RESPONSE = '_no response_';

function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delim = `GHEOF_${key}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}<<${delim}\n${value}\n${delim}\n`);
}

function fail(message) {
  console.error(message);
  setOutput('error', message);
  process.exit(1);
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalize a heading or label so the two can be compared. */
function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\((optional|required)\)\s*$/, '');
}

/** Escape a value for a double-quoted YAML scalar. */
function yamlString(value) {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

/** Split a GitHub issue form body into { normalized heading -> raw value }. */
function parseSections(body) {
  const sections = new Map();
  const parts = body.split(/^###[ \t]+/m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    const heading = newline === -1 ? part : part.slice(0, newline);
    const value = newline === -1 ? '' : part.slice(newline + 1);
    sections.set(normalizeLabel(heading), value.trim());
  }
  return sections;
}

/**
 * GitHub renders a multi-select dropdown as "A, B, C", but an option may itself
 * contain a comma ("Cloud deployment (AWS, Azure, GCP)"). Match known options
 * greedily (longest first) at the head of the string before falling back to a
 * plain comma split.
 */
function parseMultiselect(raw, options) {
  const byLength = [...options].sort((a, b) => b.length - a.length);
  const selected = [];

  for (const line of raw.split('\n')) {
    // Tolerate checkbox-style rendering as well as plain comma lists.
    let rest = line.replace(/^\s*[-*]\s*\[[xX ]\]\s*/, '').trim();
    while (rest.length > 0) {
      const match = byLength.find((opt) => rest.toLowerCase().startsWith(opt.toLowerCase()));
      if (match) {
        selected.push(match);
        rest = rest.slice(match.length);
      } else {
        const idx = rest.indexOf(',');
        const piece = (idx === -1 ? rest : rest.slice(0, idx)).trim();
        if (piece) selected.push(piece);
        rest = idx === -1 ? '' : rest.slice(idx);
      }
      rest = rest.replace(/^\s*,\s*/, '').trim();
    }
  }
  return selected;
}

function parseList(raw) {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(raw) {
  return /^(true|yes|y|on|1|checked)$/i.test(raw.trim());
}

function renderBlockList(items) {
  if (items.length === 0) return ' []';
  return '\n' + items.map((item) => `  - ${yamlString(item)}`).join('\n');
}

// --- load inputs -----------------------------------------------------------

const issueBody = (process.env.ISSUE_BODY || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const issueTitle = (process.env.ISSUE_TITLE || '').trim();
const issueNumber = (process.env.ISSUE_NUMBER || '').trim();

if (!issueBody.trim()) fail('The issue body is empty, so there is nothing to scaffold.');

let schema;
try {
  schema = yaml.load(fs.readFileSync(SCHEMA_PATH, 'utf8')) || {};
} catch (error) {
  fail(`Could not read _data/schema.yml: ${error.message}`);
}

const fields = Array.isArray(schema.fields) ? schema.fields : [];
if (fields.length === 0) fail('_data/schema.yml defines no `fields`.');

const sections = parseSections(issueBody);

/** Raw value for a schema field, or '' when absent / "_No response_". */
function rawValue(field) {
  const candidates = [normalizeLabel(field.label), normalizeLabel(field.key)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = sections.get(candidate);
    if (value === undefined) continue;
    return value.trim().toLowerCase() === NO_RESPONSE ? '' : value.trim();
  }
  return '';
}

// --- title, slug -----------------------------------------------------------

const titleField = fields.find((f) => f.key === 'title');
const title = (titleField ? rawValue(titleField) : '') || issueTitle;
if (!title) fail('No title was provided in the issue form or the issue title.');

const slugOverride = sections.get('slug');
const slug = slugify(slugOverride && slugOverride.toLowerCase() !== NO_RESPONSE ? slugOverride : title);
if (!slug) fail(`Could not derive a URL slug from the title ${JSON.stringify(title)}.`);

const entryPath = schema.entry?.path || 'catalog';
const entryDir = path.join(ROOT, entryPath, slug);
if (fs.existsSync(entryDir)) {
  fail(
    `An entry already exists at ${entryPath}/${slug}/. ` +
      'Add a "### Slug" section to the issue with a different slug, or edit the existing entry instead.'
  );
}

// --- front matter ----------------------------------------------------------

const published = new Date().toISOString().slice(0, 10);
const lines = [
  '---',
  'layout: entry',
  `title: ${yamlString(title)}`,
  `slug: ${slug}`,
  `published: ${yamlString(published)}`,
  'featured: false',
  'thumbnail: ""',
];

let bodyText = '';

for (const field of fields) {
  const raw = rawValue(field);

  if (field.type === 'markdown') {
    if (!bodyText) bodyText = raw;
    continue;
  }
  if (HEADER_KEYS.has(field.key)) continue;

  switch (field.type) {
    case 'multiselect': {
      const options = Array.isArray(field.options) ? field.options : [];
      lines.push(`${field.key}:${renderBlockList(raw ? parseMultiselect(raw, options) : [])}`);
      break;
    }
    case 'list':
      lines.push(`${field.key}:${renderBlockList(raw ? parseList(raw) : [])}`);
      break;
    case 'boolean':
      lines.push(`${field.key}: ${parseBoolean(raw)}`);
      break;
    case 'file':
      lines.push(`${field.key}: ${yamlString(`/${entryPath}/${slug}/${field.filename || `${field.key}.pdf`}`)}`);
      break;
    default:
      // text, textarea, url, email, date, number, select, image
      lines.push(`${field.key}: ${yamlString(raw)}`);
  }
}

lines.push('---');

const content = `${lines.join('\n')}\n\n${bodyText || 'Write-up forthcoming.'}\n`;

fs.mkdirSync(entryDir, { recursive: true });
fs.writeFileSync(path.join(entryDir, 'index.md'), content, 'utf8');

setOutput('slug', slug);
setOutput('branch', `entry/${slug}`);
setOutput('title', title);

console.log(`Scaffolded ${entryPath}/${slug}/index.md from issue #${issueNumber || '?'}.`);
