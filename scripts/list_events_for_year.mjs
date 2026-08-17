#!/usr/bin/env node
/**
 * Build a markdown list of the events already scheduled for a cohort year, so
 * automation can comment it back on the issue as a reference.
 *
 * Env: ISSUE_BODY. Outputs: year, events_md.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

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

const year = (values.cohort_year || '').trim();

function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}<<GHEOF\n${value}\nGHEOF\n`);
}

function finish(md) {
  setOutput('year', year);
  setOutput('events_md', md);
  console.log(md);
  process.exit(0);
}

if (!year) finish('No cohort year was provided in the issue.');

const dataPath = path.join(process.cwd(), '_data', 'cohorts', `${year}.yml`);
if (!fs.existsSync(dataPath)) finish(`No schedule exists yet at \`_data/cohorts/${year}.yml\`.`);

let events = [];
try {
  const data = yaml.load(fs.readFileSync(dataPath, 'utf8')) || {};
  events = Array.isArray(data.events) ? data.events : [];
} catch (error) {
  finish(`Could not parse \`_data/cohorts/${year}.yml\`: ${error.message}`);
}

finish(
  events.length
    ? events
        .map(
          (event) =>
            `- \`${event.id || '(no id)'}\` — ${event.name || ''}${event.date ? ` (${event.date})` : ''}`
        )
        .join('\n')
    : 'No events are listed in this cohort schedule yet.'
);
