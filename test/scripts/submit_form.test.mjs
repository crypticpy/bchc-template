/**
 * Submit page behaviour, driven through a real DOM.
 *
 * The fixture is a snapshot of the Liquid-rendered /submit/ page (see the
 * comment at the top of test/fixtures/submit-form.html), so these tests
 * exercise the same markup the site ships.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'submit-form.html'), 'utf8');
const SCRIPTS = [
  'assets/js/submit/fields.js',
  'assets/js/submit/validate.js',
  'assets/js/submit/repeatable.js',
  'assets/js/submit/preview.js',
  'assets/js/submit/draft.js',
  'assets/js/submit/handoff.js',
  'assets/js/submit.js',
];

/**
 * A booted submit page. The scripts are evaluated only once the document is
 * complete, mirroring the deferred <script> tags the layout emits.
 * @returns {Promise<{window: object, document: object, form: object, opened: string[]}>}
 */
async function boot() {
  const dom = new JSDOM('<!doctype html><body>' + HTML + '</body>', {
    url: 'https://example.org/submit/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  const opened = [];
  window.open = (url) => { opened.push(url); return null; };
  const copied = [];
  window.navigator.clipboard = { writeText: (text) => { copied.push(text); return Promise.resolve(); } };

  await new Promise((resolve) => {
    if (window.document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve);
  });

  SCRIPTS.forEach((rel) => window.eval(fs.readFileSync(path.join(ROOT, rel), 'utf8')));

  return {
    window,
    document: window.document,
    form: window.document.querySelector('[data-submit-form]'),
    opened,
    copied,
  };
}

/**
 * Type a value into a field the way a person would, events and all.
 * @param {object} ctx from boot()
 * @param {string} key schema key
 * @param {string} value
 */
function answer(ctx, key, value) {
  const wrap = ctx.form.querySelector('[data-field="' + key + '"]');
  const type = wrap.dataset.type;
  if (type === 'select' || type === 'multiselect') {
    const choice = Array.from(wrap.querySelectorAll('input[value]'))
      .find((input) => (value ? input.value === value : input.value && !input.hasAttribute('data-clear')));
    choice.checked = true;
    choice.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    return;
  }
  const control = wrap.querySelector('input, textarea');
  control.value = value;
  control.dispatchEvent(new ctx.window.Event('input', { bubbles: true }));
}

/** Fill every required field with something plausible. @param {object} ctx */
function fillRequired(ctx) {
  ctx.form.querySelectorAll('[data-required="true"]').forEach((wrap) => {
    const key = wrap.dataset.field;
    const type = wrap.dataset.type;
    if (type === 'email') answer(ctx, key, 'someone@example.org');
    else if (type === 'url') answer(ctx, key, 'https://example.org');
    else if (type === 'select' || type === 'multiselect') answer(ctx, key, '');
    else answer(ctx, key, 'Value for ' + key);
  });
}

test('the card preview mirrors what has been typed', async () => {
  const ctx = await boot();
  answer(ctx, 'title', 'Overdose spike brief');
  answer(ctx, 'summary', 'A daily brief for the response team.');
  assert.equal(ctx.document.querySelector('[data-preview-title]').textContent, 'Overdose spike brief');
  assert.equal(
    ctx.document.querySelector('[data-preview-summary]').textContent,
    'A daily brief for the response team.'
  );
});

test('choosing a chip option renders the schema-styled chip, not raw text', async () => {
  const ctx = await boot();
  const chipField = ctx.form.querySelector('[data-slot="chip"]');
  const first = chipField.querySelector('input[value]:not([data-clear])');
  first.checked = true;
  first.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
  const chips = ctx.document.querySelector('[data-preview-chips]');
  assert.equal(chips.hidden, false);
  assert.equal(chips.querySelectorAll('.chip').length, 1);
});

test('an image address fills the media band', async () => {
  const ctx = await boot();
  answer(ctx, 'screenshots', 'https://example.org/shot.png | The queue view');
  const media = ctx.document.querySelector('[data-preview-media]');
  assert.equal(media.hidden, false);
  assert.equal(ctx.document.querySelector('[data-preview-image]').alt, 'The queue view');
  assert.equal(ctx.form.querySelectorAll('[data-image-previews] img').length, 1);
});

test('submitting an empty form is blocked and announced', async () => {
  const ctx = await boot();
  ctx.form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));

  const summary = ctx.form.querySelector('[data-error-summary]');
  assert.equal(summary.hidden, false);
  assert.equal(summary.getAttribute('role'), 'alert');
  assert.ok(summary.querySelectorAll('.error-summary-link').length >= 10);
  const title = ctx.form.querySelector('[data-field="title"] input');
  assert.equal(title.getAttribute('aria-invalid'), 'true');
  assert.equal(ctx.opened.length, 0);
});

test('a bad email is caught on blur', async () => {
  const ctx = await boot();
  answer(ctx, 'contact_email', 'not-an-address');
  const control = ctx.form.querySelector('[data-field="contact_email"] input');
  control.dispatchEvent(new ctx.window.Event('blur', { bubbles: true }));
  const error = ctx.form.querySelector('[data-field="contact_email"] .field-error');
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /email address/);
});

test('a complete form opens a prefilled issue URL', async () => {
  const ctx = await boot();
  fillRequired(ctx);
  answer(ctx, 'title', 'Overdose spike brief');
  ctx.form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));

  assert.equal(ctx.form.querySelector('[data-error-summary]').hidden, true);
  assert.equal(ctx.opened.length, 1);
  const url = new ctx.window.URL(ctx.opened[0]);
  assert.equal(url.hostname, 'github.com');
  assert.equal(url.searchParams.get('template'), 'new-entry.yml');
  assert.match(url.searchParams.get('title'), /Overdose spike brief$/);
  assert.equal(url.searchParams.get('title_key'), null);
  assert.equal(url.searchParams.get('title'), url.searchParams.get('title'));
  assert.equal(url.searchParams.get('contact_email'), 'someone@example.org');
  // GitHub cannot prefill `checkboxes`, so multiselect answers are left out.
  assert.equal(url.searchParams.get('area'), null);
  assert.match(
    ctx.form.querySelector('[data-submit-status]').textContent,
    /cannot prefill tick boxes/
  );
});

test('the Markdown fallback keeps the answers GitHub cannot prefill', async () => {
  const ctx = await boot();
  fillRequired(ctx);
  const fields = ctx.window.SubmitForm.readFields(ctx.form);
  const body = ctx.window.SubmitForm.markdownBody(fields);
  const areaWrap = ctx.form.querySelector('[data-field="area"]');
  const chosen = areaWrap.querySelector('input:checked').value;
  assert.ok(body.includes('### ' + areaWrap.dataset.label));
  assert.ok(body.includes(chosen));
});

test('YAML front matter renders lists and links as blocks', async () => {
  const ctx = await boot();
  answer(ctx, 'title', 'Overdose spike brief');
  answer(ctx, 'ai_tools', 'Azure OpenAI\nLangChain');
  answer(ctx, 'screenshots', 'https://example.org/shot.png | The queue view');
  const yaml = ctx.window.SubmitForm.yamlFrontMatter(ctx.window.SubmitForm.readFields(ctx.form));
  assert.match(yaml, /^---\n/);
  assert.match(yaml, /ai_tools:\n {2}- Azure OpenAI\n {2}- LangChain/);
  assert.match(yaml, /screenshots:\n {2}- src: https:\/\/example\.org\/shot\.png\n {4}alt: The queue view/);
});

test('a draft is autosaved and can be restored', async () => {
  const ctx = await boot();
  answer(ctx, 'title', 'Draft in progress');
  await new Promise((resolve) => setTimeout(resolve, 700));

  const key = 'catalog-template:submit-draft:v2:' + ctx.form.dataset.draftKey;
  const saved = JSON.parse(ctx.window.localStorage.getItem(key));
  assert.equal(saved.fields.title, 'Draft in progress');
  assert.match(ctx.form.querySelector('[data-draft-status]').textContent, /Draft saved/);

  answer(ctx, 'title', '');
  ctx.form.querySelector('[data-draft-action="restore"]').click();
  assert.equal(ctx.form.querySelector('[data-field="title"] input').value, 'Draft in progress');
  assert.equal(ctx.document.querySelector('[data-preview-title]').textContent, 'Draft in progress');

  ctx.form.querySelector('[data-draft-action="clear"]').click();
  assert.equal(ctx.window.localStorage.getItem(key), null);
});

test('the progress rail counts completed sections', async () => {
  const ctx = await boot();
  const line = ctx.form.querySelector('[data-progress-line]');
  assert.match(line.textContent, /^0 of /);
  const total = Number(/of (\d+) sections/.exec(line.textContent)[1]);

  // Answering every required field completes every section that has one.
  const expected = new Set(
    Array.from(ctx.form.querySelectorAll('[data-required="true"]'))
      .map((wrap) => wrap.closest('[data-section]').dataset.section)
  );
  fillRequired(ctx);
  assert.equal(line.textContent, expected.size + ' of ' + total + ' sections complete');
  const done = Array.from(ctx.document.querySelectorAll('[data-progress-link][data-done="true"]'))
    .map((link) => link.dataset.progressLink);
  assert.deepEqual(new Set(done), expected);
});

test('links rows can be added, filled and serialized', async () => {
  const ctx = await boot();
  const wrap = ctx.form.querySelector('[data-field="resources"]');
  wrap.querySelector('[data-links-add]').click();
  const rows = wrap.querySelectorAll('[data-links-rows] > *');
  assert.equal(rows.length, 2);
  rows[0].querySelector('[data-links-label]').value = 'Evaluation';
  rows[0].querySelector('[data-links-url]').value = 'https://example.org/eval.pdf';
  const field = ctx.window.SubmitForm.readFields(ctx.form).find((f) => f.key === 'resources');
  assert.equal(ctx.window.SubmitForm.serialize(field), 'Evaluation | https://example.org/eval.pdf');
});
