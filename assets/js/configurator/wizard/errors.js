/**
 * The wizard's single error summary.
 *
 * `#wizard-errors` (declared in setup/index.md with `role="alert"`) is the one
 * place validation problems appear. The panel inside it takes focus when it
 * fills, so a keyboard or screen-reader user is taken to the problems instead
 * of being told about them somewhere off screen, and each problem that knows
 * which control it belongs to links straight to it.
 */

import { el } from '../dom.js';

/**
 * @typedef {string|{message: string, target?: string}} Problem
 *   `target` is the id of the control the problem belongs to.
 */

let region = null;

function errorRegion() {
  if (!region) region = document.getElementById('wizard-errors');
  return region;
}

/** @param {Problem} problem @returns {{message: string, target: string|null}} */
function normalize(problem) {
  if (typeof problem === 'string') return { message: problem, target: null };
  return { message: String(problem?.message ?? ''), target: problem?.target || null };
}

/** Move the page to a control and focus it, if it is still on the page. */
function jumpTo(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  node.focus({ preventScroll: true });
}

/**
 * Render the shared validation-error panel above the step body.
 *
 * @param {Problem[]} [problems] problems to show; clears the panel when empty.
 * @param {{focus?: boolean}} [options] `focus: false` leaves focus alone (used
 *   when the panel is painted as part of a step render that focuses elsewhere).
 */
export function announce(problems, { focus = true } = {}) {
  const target = errorRegion();
  if (!target) return;
  target.replaceChildren();
  if (!problems || problems.length === 0) return;

  const items = problems.map(normalize).filter((item) => item.message !== '');
  if (items.length === 0) return;

  const panel = el('div', { id: 'wizard-error-summary', class: 'card border-brand-accent', tabindex: '-1' }, [
    el('div', { class: 'card-header bg-brand-accent/10' }, [
      el('p', {
        class: 'card-title',
        text: items.length === 1 ? 'One problem to fix' : `${items.length} problems to fix`,
      }),
    ]),
    el(
      'ul',
      { class: 'list-disc space-y-1 px-10 py-4 text-sm text-brand-ink' },
      items.map((item) =>
        el('li', {}, [
          item.target
            ? el('a', {
                class: 'font-medium underline decoration-brand-accent underline-offset-2',
                href: `#${item.target}`,
                text: item.message,
                onclick: (event) => {
                  event.preventDefault();
                  jumpTo(item.target);
                },
              })
            : el('span', { text: item.message }),
        ])
      )
    ),
  ]);

  target.append(panel);
  if (focus) panel.focus();
}
