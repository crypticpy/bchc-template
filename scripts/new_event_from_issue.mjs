#!/usr/bin/env node
/**
 * Scaffold a cohort event page from an issue form submission.
 *
 * Input (env): ISSUE_BODY, ISSUE_TITLE
 * Output:      cohorts/<year>/events/<event_id>/index.md
 *              $GITHUB_OUTPUT: slug, year, branch
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const body = (process.env.ISSUE_BODY || '').replace(/\r\n/g, '\n');
const issueTitle = (process.env.ISSUE_TITLE || '').trim();

if (!body.trim()) {
  console.error('The issue body is empty, so there is nothing to scaffold.');
  process.exit(1);
}

function yamlString(value) {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const values = {};
for (const section of body.split(/^###[ \t]+/m).slice(1)) {
  const [heading, ...rest] = section.split('\n');
  const key = heading
    .replace(/\s*\([^)]*\)\s*$/, '') // drop trailing hints like "(Markdown, optional)"
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const value = rest.join('\n').trim();
  values[key] = value.toLowerCase() === '_no response_' ? '' : value;
}

const year = (values.cohort_year || '').trim();
const title = (values.event_title || issueTitle).trim();
const details = (values.event_details || values.details || '').trim();

if (!/^\d{4}$/.test(year) || !title) {
  console.error('A four-digit cohort year and an event title are both required.');
  process.exit(1);
}

const eventId = slugify(values.event_id || title);
if (!eventId) {
  console.error(`Could not derive an event id from ${JSON.stringify(values.event_id || title)}.`);
  process.exit(1);
}

// "Title | URL" per line; also tolerates "Title - URL".
const attachments = (values.attachments || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separator = line.includes('|') ? '|' : line.includes(' - ') ? ' - ' : null;
    if (!separator) return null;
    const parts = line.split(separator);
    const attachmentTitle = parts[0].trim();
    const url = parts.slice(1).join(separator).trim();
    return attachmentTitle && url ? { title: attachmentTitle, url } : null;
  })
  .filter(Boolean);

const lines = [
  '---',
  'layout: event',
  `title: ${yamlString(title)}`,
  `cohort: ${year}`,
  `event_id: ${eventId}`,
];

const optional = [
  ['summary', values.event_summary],
  ['event_date', values.event_date],
  ['event_time', values.event_time],
  ['event_location', values.event_location],
];
for (const [key, value] of optional) {
  if (value && value.trim()) lines.push(`${key}: ${yamlString(value.trim())}`);
}

if (attachments.length > 0) {
  lines.push('attachments:');
  for (const item of attachments) {
    lines.push(`  - title: ${yamlString(item.title)}`);
    lines.push(`    url: ${yamlString(item.url)}`);
  }
}

lines.push('---');

const dir = path.join(process.cwd(), 'cohorts', year, 'events', eventId);
if (fs.existsSync(dir)) {
  console.error(
    `An event already exists at cohorts/${year}/events/${eventId}. Aborting rather than overwriting it.`
  );
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, 'index.md'),
  `${lines.join('\n')}\n\n${details || 'Event details will be added here.'}\n`,
  'utf8'
);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `slug=${eventId}\nyear=${year}\nbranch=event/${year}-${eventId}\n`
  );
}

console.log(`Scaffolded cohorts/${year}/events/${eventId}/index.md.`);
