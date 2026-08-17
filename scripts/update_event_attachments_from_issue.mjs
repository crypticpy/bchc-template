#!/usr/bin/env node
/**
 * Replace or extend the `attachments:` list on an existing cohort event page.
 *
 * Input (env): ISSUE_BODY
 * Output:      rewrites cohorts/<year>/events/<event_id>/index.md
 *              $GITHUB_OUTPUT: changed, and (when changed) slug, year, branch
 *
 * The rest of the front matter is spliced through untouched rather than
 * re-serialized, so hand-written keys, ordering and comments survive.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const body = (process.env.ISSUE_BODY || '').replace(/\r\n/g, '\n');

function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

/** Report "nothing changed" and exit cleanly — the workflow comments instead of failing. */
function noChange(reason) {
  console.error(reason);
  setOutput('changed', 'false');
  process.exit(0);
}

function yamlString(value) {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

if (!body.trim()) noChange('The issue body is empty; nothing to update.');

const values = {};
for (const section of body.split(/^###[ \t]+/m).slice(1)) {
  const [heading, ...rest] = section.split('\n');
  const key = heading
    .replace(/\s*\([^)]*\)\s*$/, '') // drop trailing hints like "(optional)"
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const value = rest.join('\n').trim();
  values[key] = value.toLowerCase() === '_no response_' ? '' : value;
}

const year = (values.cohort_year || '').trim();
const eventId = (values.event_id || '').trim();
const mode = (values.update_mode || values.mode || 'REPLACE').toUpperCase().includes('APPEND')
  ? 'APPEND'
  : 'REPLACE';

const newItems = (values.attachments || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separator = line.includes('|') ? '|' : line.includes(' - ') ? ' - ' : null;
    if (!separator) return null;
    const parts = line.split(separator);
    const title = parts[0].trim();
    const url = parts.slice(1).join(separator).trim();
    return title && url ? { title, url } : null;
  })
  .filter(Boolean);

if (!year || !eventId) noChange('The cohort year and event id are both required.');
if (newItems.length === 0) noChange('No attachments could be parsed. Use one "Title | URL" pair per line.');

const relPath = path.join('cohorts', year, 'events', eventId, 'index.md');
const absPath = path.join(process.cwd(), relPath);
if (!fs.existsSync(absPath)) noChange(`No event page at ${relPath}.`);

const content = fs.readFileSync(absPath, 'utf8').replace(/\r\n/g, '\n');
const match = content.match(/^---\n(.*?)\n---\n?(.*)$/s);
if (!match) noChange(`${relPath} has no YAML front matter.`);

const [, frontMatter, pageBody] = match;

let existing = [];
try {
  const parsed = yaml.load(frontMatter) || {};
  existing = Array.isArray(parsed.attachments) ? parsed.attachments.filter((a) => a && a.title && a.url) : [];
} catch (error) {
  noChange(`${relPath} has invalid front matter: ${error.message}`);
}

// Drop the existing `attachments:` block; everything else passes through verbatim.
const kept = [];
const lines = frontMatter.split('\n');
for (let i = 0; i < lines.length; i += 1) {
  if (!/^attachments\s*:/.test(lines[i])) {
    kept.push(lines[i]);
    continue;
  }
  while (i + 1 < lines.length && /^(\s+\S|\s*$)/.test(lines[i + 1])) i += 1;
}

let merged = newItems;
if (mode === 'APPEND') {
  const seen = new Set();
  merged = [];
  for (const item of [...existing, ...newItems]) {
    const key = `${item.title.toLowerCase()}|${item.url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ title: item.title, url: item.url });
  }
}

const rendered = ['attachments:'];
for (const item of merged) {
  rendered.push(`  - title: ${yamlString(item.title)}`);
  rendered.push(`    url: ${yamlString(item.url)}`);
}

while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();

const updated = `---\n${[...kept, ...rendered].join('\n')}\n---\n\n${pageBody.replace(/^\n+/, '')}`;

if (updated === content) noChange('The attachments already match what was submitted.');

fs.writeFileSync(absPath, updated, 'utf8');

setOutput('changed', 'true');
setOutput('slug', `${year}-${eventId}`);
setOutput('year', year);
setOutput('branch', `event-attachments/${year}-${eventId}-${Date.now()}`);

console.log(`Updated attachments for ${relPath} (${mode.toLowerCase()}, ${merged.length} item(s)).`);
