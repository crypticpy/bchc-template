/**
 * /setup/ — browser wizard.
 *
 * Vanilla ESM, no build step. This file is only the shell: step navigation,
 * the heading, the action bar and boot. The answers -> files logic lives in
 * ./core.js, the same module the Node CLI (`npm run setup`) uses, so the
 * terminal and the browser can never drift apart; the wizard's own state,
 * controls, validation and error summary live in ./wizard/, and one module per
 * step lives in ./steps/.
 *
 *   wizard/state.js       answers, field list, persistence, derived config
 *   wizard/controls.js    inputs bound to the answers
 *   wizard/errors.js      the focusable error summary
 *   wizard/validate.js    per-step rules
 *   steps/start.js        1. starting point
 *   steps/branding.js     2. branding, colours, type, copy
 *   steps/modules.js      3. module toggles
 *   steps/entry-model.js  4. the schema's fields
 *   steps/field-rows.js   which field rows are open, and their element ids
 *   steps/add-field.js    the "Add a field" form on step 4
 *   steps/review.js       5. the rendered files
 *
 * The page never writes anything: it renders the files and hands them to the
 * admin to copy, download, or paste into GitHub's web editor.
 */

import { el } from './dom.js';
import { renderBranding } from './steps/branding.js';
import { renderEntryModel } from './steps/entry-model.js';
import { renderModules } from './steps/modules.js';
import { renderReview } from './steps/review.js';
import { renderStart } from './steps/start.js';
import { clearSaved, loadStartingPoint, restore, save, state, STEPS } from './wizard/state.js';
import { validateStep } from './wizard/validate.js';

const STEP_META = [
  {
    label: 'Start',
    title: 'Choose a starting point',
    lead: 'Every field on every later step is pre-filled from this choice.',
    render: renderStart,
  },
  {
    label: 'Branding',
    title: 'Branding & contact',
    lead: 'Names, colors, type and the copy on the home page.',
    render: renderBranding,
  },
  {
    label: 'Modules',
    title: 'Modules',
    lead: 'Which sections of the site exist.',
    render: renderModules,
  },
  {
    label: 'Entry model',
    title: 'Entry model',
    lead: 'The fields every catalog entry has. Open a row to edit it.',
    render: renderEntryModel,
  },
  {
    label: 'Review',
    title: 'Review & publish',
    lead: 'Copy each file into GitHub. Nothing is changed until you commit.',
    render: renderReview,
  },
];

const root = document.querySelector('#wizard');
const stepNav = document.querySelector('#wizard-steps');

/** Render the numbered step pills above the wizard body. */
function renderStepNav() {
  stepNav.replaceChildren(
    ...STEP_META.map((meta, index) =>
      el('button', {
        type: 'button',
        class: `filter-pill${index === state.step ? ' is-active' : ''}`,
        'aria-current': index === state.step ? 'step' : null,
        text: `${index + 1}. ${meta.label}`,
        onclick: () => goTo(index),
      })
    )
  );
}

/**
 * Navigate to a step. A forward move (Continue, or a step pill further on)
 * validates every step it would skip, in order, and stops on the first one
 * with problems: that step is shown, its blamed rows come back open, and
 * focus lands on the error summary `validateStep` filled. Moving back is
 * always allowed.
 * @param {number} index target step index.
 */
function goTo(index) {
  const target = Math.min(Math.max(index, 0), STEPS.length - 1);
  for (let step = state.step; step < target; step += 1) {
    if (validateStep(step)) continue;
    state.step = step;
    save();
    render();
    document.getElementById('wizard-error-summary')?.focus();
    return;
  }
  state.step = target;
  save();
  render();
  document.getElementById('step-heading')?.focus();
}

/**
 * The Back / step actions / Start over / Continue bar under the step body.
 * @param {HTMLElement[]} actions extra buttons contributed by the step.
 * @param {boolean} sticky pin the bar to the bottom of the viewport (long steps).
 * @returns {HTMLElement}
 */
function actionBar(actions, sticky) {
  return el('div', { class: `wizard-actions${sticky ? ' is-sticky' : ''}` }, [
    state.step > 0
      ? el('button', {
          type: 'button',
          class: 'btn-secondary',
          text: 'Back',
          onclick: () => goTo(state.step - 1),
        })
      : el('span'),
    el('div', { class: 'flex flex-wrap gap-3' }, [
      ...actions,
      el('button', {
        type: 'button',
        class: 'btn-secondary',
        text: 'Start over',
        onclick: () => {
          if (!window.confirm('Discard everything you have entered and start again?')) return;
          clearSaved();
          state.step = 0;
          loadStartingPoint('current');
          render();
        },
      }),
      state.step < STEPS.length - 1
        ? el('button', {
            type: 'button',
            class: 'btn-primary',
            text: 'Continue',
            onclick: () => goTo(state.step + 1),
          })
        : null,
    ]),
  ]);
}

/** Repaint the whole wizard shell (step nav, heading, current step body, action bar). */
function render() {
  renderStepNav();
  const meta = STEP_META[state.step];
  const { body, actions = [], sticky = false } = meta.render(render);

  root.replaceChildren(
    el('header', { class: 'mb-6' }, [
      el('p', { class: 'eyebrow', text: `Step ${state.step + 1} of ${STEPS.length}` }),
      el('h2', { id: 'step-heading', class: 'section-title', tabindex: '-1', text: meta.title }),
      el('p', { class: 'section-lead', text: meta.lead }),
    ]),
    body,
    actionBar(actions, sticky)
  );
}

/** Entry point: restore or initialize `state`, then render. No-ops if `#wizard` isn't on the page. */
function boot() {
  if (!root) return;
  const resumed = restore();
  render();
  if (resumed) {
    const banner = document.querySelector('#resume-banner');
    if (banner) banner.hidden = false;
  }
}

boot();
