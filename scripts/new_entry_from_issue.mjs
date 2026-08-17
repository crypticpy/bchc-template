#!/usr/bin/env node
/**
 * Scaffold a catalog entry from a GitHub issue-form submission.
 *
 * Input (env):   ISSUE_BODY, ISSUE_TITLE, ISSUE_NUMBER, GITHUB_TOKEN (optional)
 * Output:        <entry path>/<slug>/index.md
 *                <entry path>/<slug>/screenshots/NN.<ext>  (downloaded images)
 *                $GITHUB_OUTPUT:  slug, branch, title, warnings, summary
 *                $GITHUB_STEP_SUMMARY: a human-readable report
 *
 * Flags:         --dry-run   print the front matter instead of writing files
 *
 * Every front matter key comes from _data/schema.yml, so this script never
 * needs editing when the content model changes. The pure parsing/serialising
 * helpers live in scripts/lib/ and are unit-tested in test/scripts/.
 *
 * Exit code is non-zero only for genuinely fatal problems (no title, no
 * schema, a slug that cannot be derived). A screenshot that fails to download
 * is reported as a warning on the pull request, never a failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

import { frontMatter } from './lib/yaml.mjs';
import { downloadImages, MAX_FILES } from './lib/images.mjs';
import {
  NO_RESPONSE,
  coerce,
  parseImageRefs,
  parseIssueForm,
  rawValue,
  slugify,
  uniqueSlug,
} from './lib/issue_body.mjs';

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, '_data', 'schema.yml');
const DRY_RUN = process.argv.includes('--dry-run');

/** Keys written by the fixed header block; a schema field with one of these
 * keys must not be emitted twice (duplicate YAML keys are invalid). */
const HEADER_KEYS = new Set(['title', 'slug', 'published', 'featured', 'thumbnail', 'render_with_liquid']);

/** Extra headings the form may carry that are not schema fields. Put a
 * `### Slug` block BEFORE the write-up section: everything after the write-up
 * heading is treated as prose (see parseIssueForm). */
const SLUG_HEADING = 'slug';

/** A slug is a folder name under the entry path, so keep it to this shape. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Append a `key<<EOF … EOF` pair to $GITHUB_OUTPUT (no-op outside Actions).
 * @param {string} key
 * @param {string} value
 */
function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delimiter = `GHEOF_${key}_${Math.random().toString(36).slice(2, 10)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}

/**
 * Report a fatal problem on stderr and in $GITHUB_OUTPUT, then exit.
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(message);
  setOutput('error', message);
  process.exit(1);
}

/**
 * Write the run report to stdout and, in Actions, to the job summary.
 * @param {string} markdown
 */
function report(markdown) {
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }
}

// --- inputs ----------------------------------------------------------------

const issueBody = String(process.env.ISSUE_BODY ?? '').replace(/\r\n?/g, '\n');
const issueTitle = String(process.env.ISSUE_TITLE ?? '').trim();
const issueNumber = String(process.env.ISSUE_NUMBER ?? '').trim();

if (!issueBody.trim()) fail('The issue body is empty, so there is nothing to scaffold.');

let schema;
try {
  schema = yaml.load(fs.readFileSync(SCHEMA_PATH, 'utf8')) || {};
} catch (error) {
  fail(`Could not read _data/schema.yml: ${error.message}`);
}

const fields = Array.isArray(schema.fields) ? schema.fields : [];
if (fields.length === 0) fail('_data/schema.yml defines no `fields`.');

const knownHeadings = [SLUG_HEADING];
for (const field of fields) {
  if (field?.label) knownHeadings.push(field.label);
  if (field?.key) knownHeadings.push(field.key);
  if (field?.prompt) knownHeadings.push(field.prompt);
}

// The free-form write-up is the last `markdown` field of the schema, so it is
// also the last section of the generated issue form. Naming it lets the parser
// treat everything after its heading as prose: a `### Organization` the
// submitter types inside their write-up can no longer overwrite a real answer.
const writeUpField = [...fields].reverse().find((f) => f?.type === 'markdown');
const writeUpLabel = writeUpField ? (writeUpField.label || writeUpField.key || '') : '';

/** @type {string[]} */
const warnings = [];

const { sections, warnings: parseWarnings } = parseIssueForm(issueBody, knownHeadings, writeUpLabel);
warnings.push(...parseWarnings);

// --- title and slug --------------------------------------------------------

const titleField = fields.find((f) => f.key === 'title');
const title = (titleField ? rawValue(sections, titleField) : '') || issueTitle;
if (!title) fail('No title was provided in the issue form or the issue title.');

const entryPath = String(schema.entry?.path || 'catalog');
// The schema may cap how many screenshots an entry keeps; MAX_FILES is the ceiling.
const maxImages = Math.min(Number(schema.entry?.max_images) || MAX_FILES, MAX_FILES);
const slugOverride = sections.get(SLUG_HEADING);
const slugSeed = slugify(
  slugOverride && slugOverride.toLowerCase() !== NO_RESPONSE ? slugOverride : title
);
if (!slugSeed) fail(`Could not derive a URL slug from the title ${JSON.stringify(title)}.`);

const slug = uniqueSlug(slugSeed, (candidate) => fs.existsSync(path.join(ROOT, entryPath, candidate)));
if (!slug) fail(`Too many entries already exist under ${entryPath}/${slugSeed}*. Add a "### Slug" section with a different slug.`);
// `slugify` already strips everything outside [a-z0-9-], but this job runs with
// `contents: write` on issue text from anyone, so the folder name it is about
// to create is re-checked rather than trusted.
if (!SLUG_PATTERN.test(slug)) fail(`Refusing to use ${JSON.stringify(slug)} as a folder name.`);

const entryDir = path.join(ROOT, entryPath, slug);

/**
 * Guard every write: the scaffolder may only create files inside this entry's
 * own folder, never anywhere else in the checkout.
 * @param {string} target absolute path about to be written
 * @returns {string} the same path
 */
function insideEntryDir(target) {
  const resolved = path.resolve(target);
  const base = path.resolve(entryDir);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    fail(`Refusing to write outside ${entryPath}/${slug}/ (${resolved}).`);
  }
  return resolved;
}

// --- images ----------------------------------------------------------------

/** @type {Record<string, Array<{src: string, alt: string}>>} */
const imageValues = {};

for (const field of fields.filter((f) => f.type === 'images')) {
  const refs = parseImageRefs(rawValue(sections, field));
  if (refs.length === 0) {
    imageValues[field.key] = [];
    continue;
  }
  if (DRY_RUN) {
    imageValues[field.key] = refs.map((ref, index) => ({
      src: `/${entryPath}/${slug}/screenshots/${String(index + 1).padStart(2, '0')}.png`,
      alt: ref.alt || `${title} — screenshot ${index + 1}`,
    }));
    warnings.push(`Dry run: ${refs.length} image URL(s) were parsed but not downloaded.`);
    continue;
  }
  const result = await downloadImages(refs, {
    destDir: path.join(entryDir, 'screenshots'),
    publicPrefix: `/${entryPath}/${slug}/screenshots`,
    altFallback: `${title} — screenshot`,
    maxFiles: maxImages,
    token: process.env.GITHUB_TOKEN || '',
    fsImpl: {
      mkdirSync: (dir, opts) => fs.mkdirSync(insideEntryDir(dir), opts),
      writeFileSync: (file, data) => fs.writeFileSync(insideEntryDir(file), data),
    },
  });
  imageValues[field.key] = result.items;
  warnings.push(...result.warnings);
}

// --- front matter ----------------------------------------------------------

const published = new Date().toISOString().slice(0, 10);
/** @type {Array<[string, unknown]>} */
const entries = [
  ['layout', 'entry'],
  // The page body is markdown someone we do not know typed into an issue.
  // Without this, Jekyll would run it through Liquid at build time and a
  // `{% include %}` or `{{ site… }}` in the write-up would execute. Jekyll 4
  // honours the flag per document (Jekyll::Convertible#render_with_liquid?);
  // hand-written entries should carry it too.
  ['render_with_liquid', false],
  ['title', title],
  ['slug', slug],
  ['published', published],
  ['featured', false],
  ['thumbnail', ''],
];

let bodyText = '';

for (const field of fields) {
  const key = String(field.key ?? '');
  if (!key) continue;
  const raw = rawValue(sections, field);

  if (field.type === 'markdown') {
    if (!bodyText) bodyText = raw;
    continue;
  }
  if (HEADER_KEYS.has(key)) continue;

  if (field.type === 'images') {
    entries.push([key, imageValues[key] ?? []]);
    continue;
  }
  if (field.type === 'file') {
    entries.push([key, `/${entryPath}/${slug}/${field.filename || `${key}.pdf`}`]);
    continue;
  }
  entries.push([key, coerce(field, raw)]);
}

const content = `${frontMatter(entries)}\n${bodyText || 'Write-up forthcoming.'}\n`;

// --- write and report ------------------------------------------------------

const savedImages = Object.values(imageValues).flat().filter((item) => item.src.startsWith('/'));

if (DRY_RUN) {
  console.log(`# dry run — would write ${entryPath}/${slug}/index.md\n`);
  console.log(content);
  if (warnings.length > 0) console.log(`\n# warnings\n${warnings.map((w) => `- ${w}`).join('\n')}`);
  process.exit(0);
}

fs.mkdirSync(insideEntryDir(entryDir), { recursive: true });
fs.writeFileSync(insideEntryDir(path.join(entryDir, 'index.md')), content, 'utf8');

const summaryLines = [
  `## Scaffolded \`${entryPath}/${slug}/index.md\``,
  '',
  `- Source: issue #${issueNumber || '?'}`,
  `- Title: ${title}`,
  `- Files written: ${1 + savedImages.length}`,
];
if (savedImages.length > 0) {
  summaryLines.push('', '### Screenshots saved', ...savedImages.map((item) => `- \`${item.src}\``));
}
if (warnings.length > 0) {
  summaryLines.push('', '### Warnings', ...warnings.map((warning) => `- ${warning}`));
}

report(summaryLines.join('\n'));

setOutput('slug', slug);
setOutput('branch', `entry/${slug}${issueNumber ? `-${issueNumber}` : ''}`);
setOutput('title', title);
setOutput('images', savedImages.map((item) => `- \`${item.src}\``).join('\n'));
setOutput('warnings', warnings.map((warning) => `- ${warning}`).join('\n'));
