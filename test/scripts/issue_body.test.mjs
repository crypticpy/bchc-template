import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  coerce,
  hostOf,
  isHttpUrl,
  normalizeLabel,
  parseBoolean,
  parseImageRefs,
  parseLinks,
  parseList,
  parseMultiselect,
  parseSections,
  rawValue,
  slugify,
  uniqueSlug,
} from '../../scripts/lib/issue_body.mjs';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const basic = fs.readFileSync(path.join(FIXTURES, 'issue-basic.md'), 'utf8');
const minimal = fs.readFileSync(path.join(FIXTURES, 'issue-minimal.md'), 'utf8');

const LABELS = [
  'Title', 'One-sentence summary', 'Result in one line', 'Organization', 'What is being shared',
  'Area of work', 'Stage', 'How AI is involved', 'Types of AI', 'AI tools & models', 'Where it runs',
  'Vendor or partner', 'Skills needed to set it up', 'Readiness', 'Source code', 'Live site or demo',
  'Documentation or write-up', 'Other resources', 'Screenshots', 'Data it touches', 'Data sources',
  'Who sees the output', 'Contact name', 'Contact email', 'Full write-up',
];

test('normalizeLabel folds case, whitespace and an (optional) suffix', () => {
  assert.equal(normalizeLabel('  Contact   Email (optional) '), 'contact email');
  assert.equal(normalizeLabel('AI tools & models'), 'ai tools & models');
  assert.equal(normalizeLabel(undefined), '');
});

test('parseSections only breaks on known headings', () => {
  const sections = parseSections(basic, LABELS);
  assert.equal(sections.get('title'), 'Overdose spike situational brief generator');
  const writeUp = sections.get('full write-up');
  assert.match(writeUp, /### Deep dive/);
  assert.match(writeUp, /One hour, same quality\./);
  assert.equal(sections.has('deep dive'), false);
});

test('parseSections tolerates CRLF and treats every ### as a break with no known labels', () => {
  const sections = parseSections('### A\r\n\r\nfirst\r\n\r\n### B\r\n\r\nsecond');
  assert.equal(sections.get('a'), 'first');
  assert.equal(sections.get('b'), 'second');
});

test('rawValue matches by label, then key, and blanks _No response_', () => {
  const sections = parseSections(minimal, LABELS);
  assert.equal(rawValue(sections, { key: 'title', label: 'Title' }), '');
  assert.equal(rawValue(sections, { key: 'organization', label: 'Organization' }), 'City of Testville');
  assert.equal(rawValue(sections, { key: 'nope', label: 'Nope' }), '');
});

test('parseMultiselect reads comma lists, ticked checkboxes and ignores unticked ones', () => {
  const sections = parseSections(basic, LABELS);
  const aiTypes = ['Generative text (LLM)', 'Chat assistant', 'Classification & NLP'];
  assert.deepEqual(parseMultiselect(sections.get('types of ai'), aiTypes), [
    'Generative text (LLM)',
    'Classification & NLP',
  ]);
});

test('parseMultiselect drops every unticked checkbox line', () => {
  // A GitHub `checkboxes` control renders EVERY option, ticked or not.
  const options = ['Alpha', 'Beta', 'Gamma'];
  assert.deepEqual(parseMultiselect('- [ ] Alpha\n- [X] Beta\n- [ ] Gamma', options), ['Beta']);
  assert.deepEqual(parseMultiselect('- [ ] Alpha\n- [ ] Beta\n- [ ] Gamma', options), []);
});

test('parseMultiselect keeps options that contain a comma', () => {
  const options = ['Cloud deployment (AWS, Azure, GCP)', 'Internal tool'];
  assert.deepEqual(
    parseMultiselect('Cloud deployment (AWS, Azure, GCP), Internal tool', options),
    options
  );
});

test('parseMultiselect de-duplicates and falls back to a comma split', () => {
  assert.deepEqual(parseMultiselect('Alpha, Beta, Alpha', []), ['Alpha', 'Beta']);
});

test('parseList splits on newlines and commas', () => {
  assert.deepEqual(parseList('Azure OpenAI GPT-4o\nLangChain'), ['Azure OpenAI GPT-4o', 'LangChain']);
  assert.deepEqual(parseList('a, b,  c '), ['a', 'b', 'c']);
  assert.deepEqual(parseList(''), []);
});

test('parseBoolean accepts the shapes GitHub can produce', () => {
  assert.equal(parseBoolean('Yes'), true);
  assert.equal(parseBoolean('true'), true);
  assert.equal(parseBoolean('No'), false);
  assert.equal(parseBoolean(''), false);
});

test('parseLinks understands pipe, dash, markdown and bare URLs', () => {
  const sections = parseSections(basic, LABELS);
  assert.deepEqual(parseLinks(sections.get('other resources')), [
    { label: 'Evaluation report', url: 'https://example.org/eval.pdf' },
    { label: 'example.org', url: 'https://example.org/model-card' },
    { label: 'Model card', url: 'https://example.org/cards/gpt' },
  ]);
  assert.deepEqual(parseLinks('[Report](https://example.org/r)'), [
    { label: 'Report', url: 'https://example.org/r' },
  ]);
  assert.deepEqual(parseLinks('Notes: https://example.org/n'), [
    { label: 'Notes', url: 'https://example.org/n' },
  ]);
});

test('parseLinks drops lines without an http(s) URL', () => {
  assert.deepEqual(parseLinks('Just a note\nftp://example.org/x\n'), []);
});

test('parseImageRefs reads markdown, html, "url | alt" and bare URLs', () => {
  const sections = parseSections(basic, LABELS);
  assert.deepEqual(parseImageRefs(sections.get('screenshots')), [
    { url: 'https://github.com/user-attachments/assets/aaa.png', alt: 'Daily brief' },
    { url: 'https://example.org/shot2.jpg', alt: 'The queue view' },
  ]);
  assert.deepEqual(parseImageRefs('<img src="https://example.org/a.png" alt="A">'), [
    { url: 'https://example.org/a.png', alt: 'A' },
  ]);
  assert.deepEqual(parseImageRefs(''), []);
});

test('slugify and uniqueSlug', () => {
  assert.equal(slugify('Overdose Spike: Brief Generator!'), 'overdose-spike-brief-generator');
  assert.equal(slugify(''), '');
  const taken = new Set(['brief', 'brief-2']);
  assert.equal(uniqueSlug('brief', (s) => taken.has(s)), 'brief-3');
  assert.equal(uniqueSlug('fresh', () => false), 'fresh');
  assert.equal(uniqueSlug('brief', () => true, 3), '');
});

test('isHttpUrl and hostOf', () => {
  assert.equal(isHttpUrl('https://example.org/a'), true);
  assert.equal(isHttpUrl('mailto:a@b.c'), false);
  assert.equal(hostOf('https://www.example.org/a'), 'example.org');
  assert.equal(hostOf('not a url'), 'not a url');
});

test('coerce maps each schema type to its front matter shape', () => {
  assert.deepEqual(coerce({ type: 'list' }, 'a\nb'), ['a', 'b']);
  assert.deepEqual(coerce({ type: 'multiselect', options: ['A', 'B'] }, 'A, B'), ['A', 'B']);
  assert.deepEqual(coerce({ type: 'multiselect', options: ['A'] }, ''), []);
  assert.deepEqual(coerce({ type: 'links' }, 'X | https://e.org'), [{ label: 'X', url: 'https://e.org' }]);
  assert.equal(coerce({ type: 'boolean' }, 'Yes'), true);
  assert.equal(coerce({ type: 'number' }, '42 people'), 42);
  assert.equal(coerce({ type: 'number' }, 'many'), '');
  assert.equal(coerce({ type: 'date' }, 'around 2026-03-04'), '2026-03-04');
  assert.equal(coerce({ type: 'date' }, 'soon'), '');
  assert.equal(coerce({ type: 'text' }, '  hi  '), 'hi');
  assert.equal(coerce({ type: 'markdown' }, 'x'), null);
  assert.equal(coerce({ type: 'images' }, 'x'), null);
});
