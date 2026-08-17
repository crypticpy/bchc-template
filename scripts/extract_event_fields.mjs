#!/usr/bin/env node
/**
 * Pull the short routing fields out of an issue form body so a workflow can
 * branch on them before doing any real work.
 *
 * Env: ISSUE_BODY. Outputs: cohort_year, event_id, intro.
 */

import fs from 'node:fs';
import process from 'node:process';

const body = (process.env.ISSUE_BODY || '').replace(/\r\n/g, '\n');

const values = {};
for (const section of body.split(/^###[ \t]+/m).slice(1)) {
  const [heading, ...rest] = section.split('\n');
  const key = heading
    .replace(/\s*\([^)]*\)\s*$/, '') // drop trailing hints like "(optional)"
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  values[key] = rest.join('\n').trim();
}

function clean(value) {
  const trimmed = (value || '').trim();
  return trimmed.toLowerCase() === '_no response_' ? '' : trimmed;
}

const year = clean(values.cohort_year);
const eventId = clean(values.event_id);
// Collapsed to a single line so it is safe to pass through a workflow output.
const intro = clean(values.intro_paragraph || values.intro).replace(/\s*\n+\s*/g, ' ');

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `cohort_year=${year}\nevent_id=${eventId}\nintro=${intro}\n`
  );
}

console.log(`Extracted cohort_year='${year}', event_id='${eventId}'.`);
