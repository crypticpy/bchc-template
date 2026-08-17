/**
 * Submit form — draft autosave.
 *
 * The form is long, so answers are saved to localStorage as they're typed and
 * offered back on the next visit. Nothing leaves the browser.
 *
 * DOM contract: [data-draft-key] on the form (a site slug, so two catalogs on
 * the same origin don't collide), [data-draft-restore] bar with
 * [data-draft-action=restore|discard|clear], and [data-draft-status].
 *
 * Exposes: window.SubmitForm.initDraft
 */
(function (ns) {
  'use strict';

  /** Bump the version segment when the stored shape changes. */
  const KEY_PREFIX = 'catalog-template:submit-draft:v2';
  const DEBOUNCE_MS = 500;

  /**
   * @param {HTMLFormElement} form
   * @returns {string} the localStorage key for this site's draft
   */
  function storageKey(form) {
    return KEY_PREFIX + ':' + (form.dataset.draftKey || 'catalog');
  }

  /**
   * localStorage, or null when the browser refuses it (private mode, quota).
   * @returns {Storage|null}
   */
  function store() {
    try {
      const probe = window.localStorage;
      probe.setItem(KEY_PREFIX + ':probe', '1');
      probe.removeItem(KEY_PREFIX + ':probe');
      return probe;
    } catch (error) {
      return null;
    }
  }

  /**
   * Wire autosave, the restore bar and the "clear" link.
   * @param {HTMLFormElement} form
   * @param {object[]} fields descriptors from readFields
   * @param {() => void} onRestore called after a draft is written into the form
   * @returns {{save: Function, clear: Function, flush: Function}}
   */
  ns.initDraft = function initDraft(form, fields, onRestore) {
    const key = storageKey(form);
    const memory = store();
    const status = form.querySelector('[data-draft-status]');
    const bar = form.querySelector('[data-draft-restore]');
    let timer = null;

    /** @returns {object} the current answers, keyed by schema key */
    function snapshot() {
      const data = {};
      fields.forEach((field) => {
        if (ns.isAnswered(field)) data[field.key] = ns.readValue(field);
      });
      return data;
    }

    /** Write the current answers to storage and announce it. */
    function write() {
      if (!memory) return;
      const data = snapshot();
      if (Object.keys(data).length === 0) {
        memory.removeItem(key);
        if (status) status.textContent = '';
        return;
      }
      try {
        memory.setItem(key, JSON.stringify({ saved: new Date().toISOString(), fields: data }));
      } catch (error) {
        if (status) status.textContent = 'This browser would not save a draft. Copy your answers before leaving.';
        return;
      }
      if (status) status.textContent = 'Draft saved on this device.';
    }

    /** Debounced autosave. */
    function save() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(write, DEBOUNCE_MS);
    }

    /** Drop the saved draft. */
    function clear() {
      if (timer) window.clearTimeout(timer);
      if (memory) memory.removeItem(key);
      if (status) status.textContent = '';
      if (bar) bar.hidden = true;
    }

    /** @returns {object|null} the stored answers, if any */
    function read() {
      if (!memory) return null;
      try {
        const parsed = JSON.parse(memory.getItem(key) || 'null');
        return parsed && parsed.fields ? parsed.fields : null;
      } catch (error) {
        return null;
      }
    }

    /** Write the stored answers back into the form. */
    function restore() {
      const data = read();
      if (!data) return;
      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data, field.key)) ns.setValue(field, data[field.key]);
      });
      if (bar) bar.hidden = true;
      if (status) status.textContent = 'Draft restored.';
      onRestore();
    }

    if (bar && read()) bar.hidden = false;

    form.addEventListener('click', (event) => {
      const button = event.target.closest ? event.target.closest('[data-draft-action]') : null;
      if (!button) return;
      const action = button.dataset.draftAction;
      if (action === 'restore') restore();
      if (action === 'discard' || action === 'clear') {
        clear();
        if (action === 'clear' && status) status.textContent = 'Saved draft cleared.';
      }
    });

    return { save: save, clear: clear, flush: write };
  };
})(window.SubmitForm = window.SubmitForm || {});
