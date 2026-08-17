/**
 * The /setup/ wizard, driven through a real DOM.
 *
 * setup-page.js boots on import and renders into the page, so the shell below
 * has to exist first. It mirrors setup/index.md — the test asserts that, so the
 * fixture cannot drift from the page the site actually ships — and the modules
 * are imported once, after the globals are in place. Every test then works the
 * same live wizard, in order, the way a person would.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

import { defaultConfig } from '../../assets/js/configurator/default-config.js';

const setupPage = readFileSync(fileURLToPath(new URL('../../setup/index.md', import.meta.url)), 'utf8');

/** The ids setup-page.js reaches for. Each one has to be on the real page too. */
const REQUIRED_IDS = [
  'wizard',
  'wizard-steps',
  'wizard-errors',
  'resume-banner',
  'current-config',
  'current-theme',
  'current-schema',
];

const shipped = defaultConfig();

const dom = new JSDOM(
  `<!doctype html><html><body>
     <div id="resume-banner" hidden></div>
     <nav id="wizard-steps" aria-label="Setup steps"></nav>
     <div id="wizard-errors" role="alert" aria-live="polite"></div>
     <div id="wizard"></div>
     <script id="current-config" type="application/json">${JSON.stringify(shipped.site)}</script>
     <script id="current-theme" type="application/json">${JSON.stringify(shipped.theme)}</script>
     <script id="current-schema" type="application/json">${JSON.stringify(shipped.schema)}</script>
     <script id="current-repository" type="application/json">"bigcities/ai-catalog"</script>
   </body></html>`,
  { url: 'https://example.org/setup/' }
);

const { window } = dom;
const { document } = window;

// jsdom has neither of these; the wizard uses both.
window.confirm = () => true;
window.Element.prototype.scrollIntoView = () => {};

globalThis.window = window;
globalThis.document = document;
globalThis.localStorage = window.localStorage;
globalThis.Blob = window.Blob;
globalThis.URL.createObjectURL ??= () => 'blob:preview';
globalThis.URL.revokeObjectURL ??= () => {};

const errors = [];
window.addEventListener('error', (event) => errors.push(String(event.error || event.message)));

const wizardState = await import('../../assets/js/configurator/wizard/state.js');
await import('../../assets/js/configurator/setup-page.js');

/* --- helpers -------------------------------------------------------------- */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/** Click the numbered step pill, the way an admin jumps between steps. */
function goToStep(oneBased) {
  const pill = $$('#wizard-steps button').find((button) => button.textContent.startsWith(`${oneBased}.`));
  assert.ok(pill, `no step pill ${oneBased}`);
  pill.click();
}

/** Type into a control and fire the event its listener is bound to. */
function type(selector, value, eventName = 'input') {
  const node = $(selector);
  assert.ok(node, `missing ${selector}`);
  node.value = value;
  node.dispatchEvent(new window.Event(eventName, { bubbles: true }));
  return node;
}

const fieldRows = () => $$('#wizard .schema-field-row');
const rowFor = (key) => fieldRows().find((row) => row.querySelector('.font-mono')?.textContent === key);
const toggleFor = (key) => rowFor(key).querySelector('button[aria-expanded]');
const isOpen = (key) => toggleFor(key).getAttribute('aria-expanded') === 'true';
const setOpen = (key, open) => {
  if (isOpen(key) !== open) toggleFor(key).click();
};

/** Press one of the wizard's buttons by its label. */
function press(label) {
  const button = $$('#wizard button').find((node) => node.textContent === label);
  assert.ok(button, `no "${label}" button`);
  button.click();
}

/** Rewrite one field row's options textarea, one option per line. */
function setOptions(key, text) {
  const textarea = rowFor(key).querySelector('textarea[id$="-options"]');
  assert.ok(textarea, `no options textarea on the ${key} row`);
  textarea.value = text;
  textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
}

/* --- the page shell ------------------------------------------------------- */

test('setup/index.md still provides every id the wizard renders into', () => {
  for (const id of REQUIRED_IDS) {
    assert.ok(setupPage.includes(`id="${id}"`), `setup/index.md no longer has #${id}`);
  }
  // The entry point path is referenced by the page and must stay stable.
  assert.match(setupPage, /assets\/js\/configurator\/setup-page\.js/);
});

test('the wizard boots on step 1 with the five step pills', () => {
  assert.equal($$('#wizard-steps button').length, 5);
  assert.equal($('#step-heading').textContent, 'Choose a starting point');
  assert.deepEqual(errors, []);
});

/* --- branding ------------------------------------------------------------- */

test('jumping ahead by step pill validates the steps it would skip', () => {
  goToStep(2);
  type('#field-primary', 'nope');
  goToStep(5);
  assert.equal($('#step-heading').textContent, 'Branding & contact', 'the jump skipped an invalid step');
  assert.ok($('#wizard-error-summary'), 'no error summary for the skipped step');
  type('#field-primary', '#1D4E89');
});

test('the Branding step asks every colour question the CLI asks, and offers a custom font', () => {
  goToStep(2);
  for (const key of ['primary', 'primaryDark', 'secondary', 'accent', 'lineStrong', 'warn']) {
    assert.ok($(`#field-${key}`), `no colour field for ${key}`);
  }
  assert.ok(wizardState.state.answers.lineStrong, 'lineStrong was not seeded from the starting point');
  assert.ok(wizardState.state.answers.warn, 'warn was not seeded from the starting point');

  wizardState.state.answers.headingFont = 'Roboto';
  goToStep(1);
  goToStep(2);
  const select = $('#field-headingFont');
  assert.equal(select.value, 'Roboto', 'a custom font left the select unselected');
  assert.ok([...select.options].some((o) => o.value === 'Roboto'));
  wizardState.state.answers.headingFont = 'Source Sans 3';
});

test('the Branding step renders and the live preview follows the primary colour', () => {
  goToStep(2);
  assert.equal($('#step-heading').textContent, 'Branding & contact');
  const preview = $('#wizard .theme-preview');
  assert.ok(preview, 'the theme preview is missing');
  assert.match(preview.getAttribute('style'), /--c-primary: 29 78 137/);

  type('#field-primary', '#AA0011');
  assert.match($('#wizard .theme-preview').getAttribute('style'), /--c-primary: 170 0 17/);
  assert.deepEqual(errors, []);
});

test('an invalid colour blocks Continue and focuses the error summary, linked to the field', () => {
  type('#field-primary', 'not-a-colour');
  $$('#wizard button')
    .find((button) => button.textContent === 'Continue')
    .click();

  const summary = $('#wizard-error-summary');
  assert.ok(summary, 'no error summary was rendered');
  assert.equal(summary.getAttribute('tabindex'), '-1');
  assert.equal(document.activeElement, summary, 'focus did not move to the error summary');
  assert.equal($('#wizard-errors').getAttribute('role'), 'alert');

  const link = summary.querySelector('a[href="#field-primary"]');
  assert.ok(link, 'the problem does not link to the field it belongs to');
  assert.match(link.textContent, /Main colour must be a 6-digit hex/);
  assert.equal($('#step-heading').textContent, 'Branding & contact', 'the step advanced anyway');

  // Fixing it clears the summary and lets the step advance.
  type('#field-primary', '#1D4E89');
  $$('#wizard button')
    .find((button) => button.textContent === 'Continue')
    .click();
  assert.equal($('#wizard-error-summary'), null);
  assert.equal($('#step-heading').textContent, 'Modules');
});

/* --- entry model ---------------------------------------------------------- */

test('every field row starts collapsed behind a real expand button', () => {
  goToStep(4);
  assert.equal($('#step-heading').textContent, 'Entry model');
  const rows = fieldRows();
  assert.ok(rows.length > 5, 'expected the shipped schema to have several fields');
  for (const row of rows) {
    const toggle = row.querySelector('button[aria-expanded]');
    assert.ok(toggle, 'a row has no expand button');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(toggle.getAttribute('aria-controls'), row.querySelector('.schema-field-details').id);
    assert.equal(row.querySelector('.schema-field-details').hidden, true);
  }
});

test('the collapsed summary carries the label, key, type and the presentation badges', () => {
  const row = rowFor('title');
  assert.ok(row, 'no row for the title field');
  const summary = row.querySelector('button[aria-expanded]').textContent;
  assert.match(summary, /Title/);
  assert.match(summary, /title/);
  assert.match(summary, /text/);
  assert.match(summary, /Required/);
});

test('expanding a row reveals its controls, including the card-slot select', () => {
  const row = rowFor('audience') || rowFor('title');
  const toggle = row.querySelector('button[aria-expanded]');
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(row.querySelector('.schema-field-details').hidden, false);
  assert.ok(row.querySelector('input[id$="-label"]'), 'the label input is missing');
  assert.ok(row.querySelector('select[id$="-group"]'), 'the group select is missing');
  assert.ok(row.querySelector('input[id$="-weight"]'), 'the weight input is missing');
  assert.ok(row.querySelector('select[id$="-card-slot"]'), 'the card-slot select is missing');
});

test('expanded rows survive a re-render of the step', () => {
  const key = 'title';
  rowFor(key).querySelector('button[aria-expanded]').getAttribute('aria-expanded') === 'true' ||
    rowFor(key).querySelector('button[aria-expanded]').click();
  goToStep(3);
  goToStep(4);
  const toggle = rowFor(key).querySelector('button[aria-expanded]');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(rowFor(key).querySelector('.schema-field-details').hidden, false);
});

test('the Entry model step pins its actions, including Add a field, to the bottom', () => {
  const bar = $('#wizard .wizard-actions');
  assert.ok(bar.classList.contains('is-sticky'), 'the action bar is not sticky on this step');
  const labels = [...bar.querySelectorAll('button')].map((button) => button.textContent);
  assert.deepEqual(labels, ['Back', 'Add a field', 'Start over', 'Continue']);
});

test('a new field can be given a group and a weight, and they reach the schema', () => {
  $('#new-field-label').value = 'Budget range';
  $('#new-field-label').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal($('#new-field-key').value, 'budget_range', 'the key did not derive from the label');

  type('#new-field-type', 'select', 'change');
  type('#new-field-group', 'reuse', 'change');
  type('#new-field-weight', '7');
  $$('#wizard button')
    .find((button) => button.textContent === 'Add field')
    .click();

  const added = wizardState.state.fields.find((field) => field.key === 'budget_range');
  assert.ok(added, 'the field was not added');
  assert.equal(added.group, 'reuse');
  assert.equal(added.weight, 7);

  const emitted = wizardState.schemaFields().find((field) => field.key === 'budget_range');
  assert.deepEqual(emitted, {
    key: 'budget_range',
    label: 'Budget range',
    type: 'select',
    group: 'reuse',
    weight: 7,
    options: ['Option one', 'Option two'],
  });
  assert.equal(emitted.enabled, undefined, 'the wizard-only `enabled` flag leaked into the schema');

  // The new row opens straight away so it can be filled in.
  assert.equal(
    rowFor('budget_range').querySelector('button[aria-expanded]').getAttribute('aria-expanded'),
    'true'
  );
});

test('an out-of-range weight is rejected and linked to its input', () => {
  $('#new-field-label').value = 'Too heavy';
  $('#new-field-label').dispatchEvent(new window.Event('input', { bubbles: true }));
  type('#new-field-weight', '42');
  $$('#wizard button')
    .find((button) => button.textContent === 'Add field')
    .click();

  const summary = $('#wizard-error-summary');
  assert.ok(
    summary.querySelector('a[href="#new-field-weight"]'),
    'the weight problem does not link to the input'
  );
  assert.equal(
    wizardState.state.fields.some((field) => field.key === 'too_heavy'),
    false
  );
});

test('a schema problem opens the row it blames and links to its toggle', () => {
  // A select field with no options is invalid. Empty it, then collapse the row.
  setOpen('budget_range', true);
  setOptions('budget_range', '');
  setOpen('budget_range', false);
  assert.equal(
    rowFor('budget_range').querySelector('.schema-field-details').hidden,
    true,
    'a collapsed row must keep its controls hidden'
  );

  press('Continue');

  const summary = $('#wizard-error-summary');
  assert.ok(summary, 'no error summary');
  assert.equal(document.activeElement, summary);
  const link = summary.querySelector('a[href="#schema-field-budget_range-toggle"]');
  assert.ok(link, 'the schema problem does not link to the field row');
  assert.match(link.textContent, /needs at least one option/);
  assert.equal(isOpen('budget_range'), true, 'the blamed row was not re-opened');
  assert.equal(
    rowFor('budget_range').querySelector('.schema-field-details').hidden,
    false,
    'the re-opened row still hides its controls'
  );
});

test('a blocked Continue keeps what was typed into "Add a field"', () => {
  // budget_range is still invalid from the previous test, so Continue repaints
  // the step; the half-filled add-field form must survive that repaint.
  type('#new-field-label', 'Cost centre');
  type('#new-field-weight', '3');
  press('Continue');
  assert.ok($('#wizard-error-summary'), 'expected the step to still be blocked');
  assert.equal($('#new-field-label').value, 'Cost centre');
  assert.equal($('#new-field-key').value, 'cost_centre');
  assert.equal($('#new-field-weight').value, '3');
  // Clean up: clear the draft and restore the options so the review test can pass.
  type('#new-field-label', '');
  type('#new-field-weight', '');
  setOptions('budget_range', 'Under 10k\nOver 10k');
});

test('changing a group or label updates the collapsed row header immediately', () => {
  setOpen('budget_range', true);
  const row = rowFor('budget_range');
  const groupSelect = row.querySelector('select[id$="-group"]');
  const firstReal = Array.from(groupSelect.options).find((o) => o.value && o.value !== groupSelect.value);
  groupSelect.value = firstReal.value;
  groupSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  const badges = () =>
    Array.from(row.querySelectorAll('.schema-field-toggle .chip')).map((c) => c.textContent);
  assert.ok(badges().includes(`Group: ${firstReal.value}`), `header badges ${badges()} lack the new group`);
  const labelInput = row.querySelector('input[id$="-label"]');
  labelInput.value = 'Budget band';
  labelInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(row.querySelector('.schema-field-name').textContent, 'Budget band');
  setOpen('budget_range', false);
});

/* --- review --------------------------------------------------------------- */

test('the review step renders every file, and the new field is in the schema output', () => {
  setOptions('budget_range', 'Under $10k\nOver $10k');
  press('Continue');
  assert.equal($('#step-heading').textContent, 'Review & publish');
  assert.equal($('#wizard-error-summary'), null);

  const paths = $$('#wizard section.card .card-title.font-mono').map((node) => node.textContent);
  assert.deepEqual(paths, [
    '_data/site.yml',
    '_data/theme.yml',
    '_data/schema.yml',
    '_data/navigation.yml',
    '_config.yml',
    '.github/ISSUE_TEMPLATE/new-entry.yml',
  ]);

  const schemaYaml = $$('#wizard section.card')
    .find((section) => section.textContent.includes('_data/schema.yml'))
    .querySelector('pre').textContent;
  assert.match(schemaYaml, /key: budget_range/);
  assert.match(schemaYaml, /group: reuse/);
  assert.match(schemaYaml, /weight: 7/);

  assert.ok($$('#wizard button').some((button) => button.textContent === 'Copy'));
  assert.ok($$('#wizard button').some((button) => button.textContent === 'Download'));
  assert.deepEqual(errors, []);
});

test('nothing in the whole run raised a page error', () => {
  assert.deepEqual(errors, []);
});
