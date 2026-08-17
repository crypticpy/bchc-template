/**
 * The mobile filter sheet: open/close, page inerting, focus trap and Escape.
 * The facet controls inside it are the same markup as the desktop rail and are
 * driven by assets/js/filters.js, which imports and owns this module.
 *
 * Markup contract (_includes/filter-sheet.html):
 *   [data-sheet-open]   trigger(s); aria-expanded is mirrored here
 *   [data-filter-sheet] role="dialog" aria-modal, `hidden` when closed
 *   [data-sheet-close] / [data-sheet-apply]  close the sheet
 */

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Wire the sheet up. Safe to call on a page without one.
 * @returns {{close: () => void, isOpen: () => boolean}}
 */
export function initFilterSheet() {
  const sheet = document.querySelector('[data-filter-sheet]');
  const openers = Array.from(document.querySelectorAll('[data-sheet-open]'));
  if (!sheet) return { close() {}, isOpen: () => false };

  let trigger = null;
  let inerted = [];

  /** @returns {HTMLElement[]} the sheet's reachable controls, in tab order. */
  function items() {
    return Array.from(sheet.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.classList.contains('hidden') && !el.closest('[hidden]')
    );
  }

  // aria-modal alone does not stop a screen reader reaching the rest of the page,
  // and the sheet is not a <body> child (it renders inside <main> next to its own
  // trigger). Walk from the sheet up to <body> marking every sibling on the way
  // `inert`, so the header, the results, the footer and the trigger itself all
  // drop out of the a11y tree and the tab ring while the dialog is open.
  function inertOutside() {
    releaseInert();
    let node = sheet;
    while (node && node !== document.body && node.parentElement) {
      Array.from(node.parentElement.children).forEach((sib) => {
        if (sib === node || sib.hasAttribute('inert')) return;
        sib.setAttribute('inert', '');
        inerted.push(sib);
      });
      node = node.parentElement;
    }
  }

  function releaseInert() {
    inerted.forEach((el) => el.removeAttribute('inert'));
    inerted = [];
  }

  /**
   * Escape and Tab while the sheet is open. Bound on `document`, not on the
   * sheet: a key pressed before focus has landed inside (or after something
   * moved it out) must still close the dialog.
   * @param {KeyboardEvent} e
   */
  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // The sheet is `lg:hidden`: if the viewport grew past the breakpoint while
    // it was open, it is display:none and cannot take focus — release the trap.
    if (!sheet.offsetParent && getComputedStyle(sheet).display === 'none') {
      close();
      return;
    }
    const list = items();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (!sheet.contains(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * Open the sheet, inert the rest of the page and move focus in.
   * @param {HTMLElement} [opener] the button that opened it, refocused on close.
   */
  function open(opener) {
    if (!sheet.hidden) return;
    trigger = opener || null;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    inertOutside();
    document.addEventListener('keydown', onKeydown);
    const first = items()[0];
    if (first) first.focus();
  }

  /** Close the sheet, release `inert`, and restore focus to its opener. */
  function close() {
    if (sheet.hidden) return;
    sheet.hidden = true;
    document.body.style.overflow = '';
    openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.removeEventListener('keydown', onKeydown);
    // Release before focusing: the trigger is one of the elements we made inert.
    releaseInert();
    if (trigger) trigger.focus();
    trigger = null;
  }

  openers.forEach((b) => b.addEventListener('click', () => open(b)));
  // Crossing into the desktop layout (resize, rotation, zooming back out) hides
  // the sheet with CSS; close it properly so `inert` and the scroll lock go too.
  const desktop = window.matchMedia('(min-width: 1024px)');
  const onDesktop = (mq) => {
    if (mq.matches) close();
  };
  if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onDesktop);
  else if (typeof desktop.addListener === 'function') desktop.addListener(onDesktop);
  document
    .querySelectorAll('[data-sheet-close],[data-sheet-apply]')
    .forEach((b) => b.addEventListener('click', close));

  return { close, isOpen: () => !sheet.hidden };
}
