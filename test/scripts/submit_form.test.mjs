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
 * @param {{popupBlocked?: boolean, draft?: object}} [options]
 *   popupBlocked makes window.open return null the way a pop-up blocker does;
 *   draft seeds a saved draft in localStorage before the scripts boot.
 * @returns {Promise<object>}
 */
async function boot(options = {}) {
  const dom = new JSDOM('<!doctype html><body>' + HTML + '</body>', {
    url: 'https://example.org/submit/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  const opened = [];
  window.open = (url) => {
    opened.push(url);
    return options.popupBlocked ? null : { focus() {} };
  };
  const copied = [];
  window.navigator.clipboard = {
    writeText: (text) => {
      copied.push(text);
      return Promise.resolve();
    },
  };

  await new Promise((resolve) => {
    if (window.document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve);
  });

  const form = window.document.querySelector('[data-submit-form]');
  const draftKey = 'catalog-template:submit-draft:v2:' + form.dataset.draftKey;
  if (options.draft) {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({ saved: new Date().toISOString(), fields: options.draft })
    );
  }

  SCRIPTS.forEach((rel) => window.eval(fs.readFileSync(path.join(ROOT, rel), 'utf8')));

  return {
    window,
    document: window.document,
    form,
    opened,
    copied,
    draftKey,
    storedDraft: () => JSON.parse(window.localStorage.getItem(draftKey) || 'null'),
  };
}

/** Wait past the draft autosave debounce. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 700));

/**
 * Tick the first `count` options of a select/multiselect field.
 * @param {object} ctx
 * @param {string} key
 * @param {number} count
 */
function tick(ctx, key, count) {
  const wrap = ctx.form.querySelector('[data-field="' + key + '"]');
  Array.from(wrap.querySelectorAll('input[value]:not([data-clear])'))
    .slice(0, count)
    .forEach((input) => {
      input.checked = true;
      input.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    });
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
    const choice = Array.from(wrap.querySelectorAll('input[value]')).find((input) =>
      value ? input.value === value : input.value && !input.hasAttribute('data-clear')
    );
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
  assert.match(ctx.form.querySelector('[data-submit-status]').textContent, /cannot prefill tick boxes/);
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
    Array.from(ctx.form.querySelectorAll('[data-required="true"]')).map(
      (wrap) => wrap.closest('[data-section]').dataset.section
    )
  );
  fillRequired(ctx);
  assert.equal(line.textContent, expected.size + ' of ' + total + ' sections complete');
  const done = Array.from(ctx.document.querySelectorAll('[data-progress-link][data-done="true"]')).map(
    (link) => link.dataset.progressLink
  );
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

test('autosave is held while the restore prompt is unanswered', async () => {
  const ctx = await boot({ draft: { title: 'Saved earlier' } });
  assert.equal(ctx.form.querySelector('[data-draft-restore]').hidden, false);

  // Typing before the prompt is answered must not overwrite the saved draft.
  answer(ctx, 'title', 'Typed over the offer');
  await settle();
  assert.equal(ctx.storedDraft().fields.title, 'Saved earlier');

  ctx.form.querySelector('[data-draft-action="restore"]').click();
  assert.equal(ctx.form.querySelector('[data-field="title"] input').value, 'Saved earlier');
  assert.equal(ctx.form.querySelector('[data-draft-restore]').hidden, true);

  // ...and autosave resumes once the decision is made.
  answer(ctx, 'title', 'Typed after restoring');
  await settle();
  assert.equal(ctx.storedDraft().fields.title, 'Typed after restoring');
});

test('discarding the prompt clears the draft and resumes autosave', async () => {
  const ctx = await boot({ draft: { title: 'Saved earlier' } });
  ctx.form.querySelector('[data-draft-action="discard"]').click();
  assert.equal(ctx.storedDraft(), null);
  assert.equal(ctx.form.querySelector('[data-draft-restore]').hidden, true);

  answer(ctx, 'title', 'A fresh start');
  await settle();
  assert.equal(ctx.storedDraft().fields.title, 'A fresh start');
});

test('a blocked pop-up keeps the draft and offers the link instead', async () => {
  const ctx = await boot({ popupBlocked: true });
  fillRequired(ctx);
  await settle();
  assert.ok(ctx.storedDraft(), 'a draft should exist before submitting');

  ctx.form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));

  const link = ctx.form.querySelector('[data-fallback-link]');
  assert.equal(link.hidden, false);
  assert.equal(link.href, ctx.opened[0]);
  assert.match(ctx.form.querySelector('[data-submit-status]').textContent, /blocked the new tab/);
  // The answers are the submitter's only copy until the issue is actually filed.
  assert.ok(ctx.storedDraft(), 'the draft must survive a blocked pop-up');
});

test('a pop-up that opens clears the draft and leaves the fallback hidden', async () => {
  const ctx = await boot();
  fillRequired(ctx);
  await settle();
  ctx.form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));

  assert.equal(ctx.storedDraft(), null);
  assert.equal(ctx.form.querySelector('[data-fallback-link]').hidden, true);
});

test('a length warning appears before the link stops fitting', async () => {
  const ctx = await boot();
  const note = ctx.form.querySelector('[data-length-note]');
  assert.equal(note.getAttribute('role'), 'status');
  assert.equal(note.hidden, true);

  answer(ctx, 'summary', 'x'.repeat(6000));
  assert.equal(note.hidden, false);
  assert.match(note.textContent, /getting long|too long/);
});

test('the preview strip caps signals the way the card does', async () => {
  const ctx = await boot();
  tick(ctx, 'readiness', 3);
  tick(ctx, 'data_sensitivity', 3);

  const strip = ctx.document.querySelector('[data-preview-signals]');
  const items = strip.children;
  assert.equal(items.length, 4, 'at most four items, the "+n" included');
  assert.equal(items[items.length - 1].textContent, '+3');
  assert.equal(ctx.document.querySelector('[data-preview-foot]').hidden, false);
});

test('the preview card mirrors the real card element and class names', async () => {
  const ctx = await boot();
  const card = ctx.document.querySelector('[data-preview]');
  assert.equal(card.tagName, 'ARTICLE');
  assert.ok(card.classList.contains('entry-card'));
  [
    'entry-media',
    'entry-body',
    'entry-meta',
    'entry-title',
    'entry-line',
    'entry-summary',
    'entry-chips',
    'entry-foot',
    'signal-strip',
  ].forEach((name) => {
    assert.ok(card.querySelector('.' + name), name + ' is missing from the preview');
  });
  // The card's title is not a heading, so the preview's must not be either.
  assert.equal(ctx.document.querySelector('[data-preview-title]').tagName, 'P');
});

test('link rows are numbered for screen readers and adding one moves focus', async () => {
  const ctx = await boot();
  const wrap = ctx.form.querySelector('[data-field="resources"]');
  const add = wrap.querySelector('[data-links-add]');
  add.click();
  add.click();

  const labels = () =>
    Array.from(wrap.querySelectorAll('[data-links-remove]'), (button) => button.getAttribute('aria-label'));
  assert.deepEqual(labels(), ['Remove link 1', 'Remove link 2', 'Remove link 3']);
  const rows = wrap.querySelectorAll('[data-links-rows] > *');
  assert.equal(ctx.document.activeElement, rows[2].querySelector('[data-links-label]'));
  assert.equal(rows[2].querySelector('[data-links-url]').getAttribute('aria-label'), 'Link 3 address');

  wrap.querySelectorAll('[data-links-remove]')[0].click();
  assert.deepEqual(labels(), ['Remove link 1', 'Remove link 2']);
});

test('the preview meta line uses the card segment class that draws the separator', async () => {
  const ctx = await boot();
  answer(ctx, 'organization', 'City of Testville');
  answer(ctx, 'stage', '');
  const meta = ctx.document.querySelector('[data-preview-meta]');
  assert.equal(meta.hidden, false);
  const segments = Array.from(meta.querySelectorAll('.entry-meta-seg'));
  assert.ok(segments.length >= 2, 'expected at least two meta segments');
  assert.ok(segments[0].classList.contains('entry-meta-seg--lead'));
  // The dot is a ::before on the class, never an element in the strip.
  assert.equal(meta.textContent.includes('\u00b7'), false);
});
