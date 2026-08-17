/**
 * Submit form — entry point. Wires the pieces in assets/js/submit/*.js:
 * fields (registry) → validate → repeatable → preview → draft → handoff.
 *
 * Loaded last by the `scripts:` list in submit/index.md front matter, so every
 * window.SubmitForm helper it calls is already defined.
 *
 * DOM contract: see the comment block at the top of submit/index.md.
 */
(function (ns) {
  'use strict';

  /** GitHub rejects very long URLs; well below that we switch to copy-paste. */
  const MAX_URL = 7500;

  /**
   * Copy text to the clipboard, falling back to a selection when the
   * async API is unavailable (http:// origins, older Safari).
   * @param {string} text
   * @returns {Promise<boolean>} whether the copy succeeded
   */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => false);
    }
    return Promise.resolve(false);
  }

  /**
   * Show a message in the status region under the buttons.
   * @param {HTMLElement|null} box
   * @param {string} message
   */
  function say(box, message) {
    if (!box) return;
    box.textContent = message;
    box.hidden = message === '';
  }

  /**
   * Section completion: a section is done once every required field in it has
   * an answer and the submitter has answered something.
   * @param {object[]} fields
   * @param {string} sectionKey
   * @returns {boolean}
   */
  function sectionDone(fields, sectionKey) {
    const inSection = fields.filter((field) => field.section === sectionKey);
    if (inSection.length === 0) return false;
    const required = inSection.filter((field) => field.required);
    if (required.length > 0) return required.every((field) => ns.isAnswered(field));
    return inSection.some((field) => ns.isAnswered(field));
  }

  /**
   * Keep the sticky rail and the mobile counter in step with the answers.
   * @param {HTMLElement} root
   * @param {HTMLFormElement} form
   * @param {object[]} fields
   * @returns {() => void}
   */
  function initProgress(root, form, fields) {
    const links = Array.from(root.querySelectorAll('[data-progress-link]'));
    const count = root.querySelector('[data-progress-count]');
    const lineText = form.querySelector('[data-progress-line]');
    const total = links.length;

    const sections = Array.from(form.querySelectorAll('[data-section]'));
    if (typeof IntersectionObserver === 'function' && links.length > 0) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.dataset.section;
          links.forEach((link) => {
            link.setAttribute('aria-current', String(link.dataset.progressLink === key));
          });
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      sections.forEach((section) => observer.observe(section));
    }

    return function update() {
      let done = 0;
      links.forEach((link) => {
        const complete = sectionDone(fields, link.dataset.progressLink);
        if (complete) done += 1;
        link.dataset.done = String(complete);
        const state = link.querySelector('[data-progress-state]');
        if (state) state.textContent = complete ? ' — complete' : ' — not started';
      });
      const message = done + ' of ' + total + ' sections complete';
      if (count) count.textContent = message;
      if (lineText) lineText.textContent = message;
    };
  }

  /**
   * Boot the page.
   * @param {Document|HTMLElement} root
   */
  function init(root) {
    const form = root.querySelector('[data-submit-form]');
    if (!form) return;

    const fields = ns.readFields(form);
    const summary = form.querySelector('[data-error-summary]');
    const status = form.querySelector('[data-submit-status]');
    const fallback = form.querySelector('[data-fallback]');
    const fallbackBody = form.querySelector('[data-fallback-body]');

    const paintPreview = ns.initPreview(root.documentElement || root, fields);
    const paintProgress = initProgress(root.documentElement || root, form, fields);
    const titleField = fields.find((field) => field.wrap.dataset.role === 'title');

    /** @returns {string} the entry title, for issue titles and filenames */
    function entryTitle() {
      return titleField ? String(ns.readValue(titleField)) : '';
    }

    let draft = { save: function () {}, clear: function () {}, flush: function () {} };

    /** Repaint everything that mirrors the answers. */
    function refresh() {
      paintPreview();
      paintProgress();
      draft.save();
    }

    draft = ns.initDraft(form, fields, function afterRestore() {
      fields.filter((field) => field.type === 'images').forEach(ns.renderImagePreviews);
      paintPreview();
      paintProgress();
    });

    ns.initRepeatables(fields, refresh);

    form.addEventListener('input', (event) => {
      const wrap = event.target.closest ? event.target.closest('[data-field]') : null;
      const field = wrap ? fields.find((candidate) => candidate.wrap === wrap) : null;
      if (field && field.type === 'images') ns.renderImagePreviews(field);
      if (field && !ns.checkField(field)) ns.clearError(field);
      refresh();
    });
    form.addEventListener('change', refresh);

    form.addEventListener('blur', (event) => {
      const wrap = event.target.closest ? event.target.closest('[data-field]') : null;
      if (!wrap) return;
      const field = fields.find((candidate) => candidate.wrap === wrap);
      if (!field) return;
      const message = ns.checkField(field);
      if (message) ns.showError(field, message); else ns.clearError(field);
    }, true);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const problems = ns.validateAll(fields);
      if (problems.length > 0) {
        ns.renderSummary(summary, problems);
        say(status, '');
        return;
      }
      ns.hideSummary(summary);

      const url = ns.issueUrl(form, fields, entryTitle());
      if (url.length > MAX_URL) {
        if (fallbackBody) fallbackBody.value = ns.markdownBody(fields);
        if (fallback) fallback.hidden = false;
        say(status, 'Your answers are too long to carry in a link. Copy the text below into a blank issue instead — the box is right under these buttons.');
        if (fallbackBody) fallbackBody.focus();
        return;
      }

      const missed = ns.unprefillable(fields).map((field) => field.label);
      const note = missed.length > 0
        ? ' GitHub cannot prefill tick boxes, so re-answer ' + missed.join(', ') + ' on that page.'
        : '';
      say(status, 'Opening GitHub with your answers filled in. Check them over and press “Submit new issue”.' + note);
      draft.clear();
      window.open(url, '_blank', 'noopener');
    });

    form.addEventListener('click', (event) => {
      const button = event.target.closest ? event.target.closest('[data-action]') : null;
      if (!button) return;
      const action = button.dataset.action;

      if (action === 'email') {
        const email = form.dataset.fallbackEmail || '';
        if (!email) {
          say(status, 'No email address is configured for this catalog. Use the GitHub button instead.');
          return;
        }
        const subject = (form.dataset.titlePrefix || '') + (entryTitle() || 'New entry');
        window.location.href = ns.mailtoUrl(email, subject, ns.markdownBody(fields));
        return;
      }

      const text = action === 'copy-yaml' ? ns.yamlFrontMatter(fields)
        : action === 'copy-markdown' ? ns.markdownBody(fields)
          : action === 'copy-fallback' && fallbackBody ? fallbackBody.value
            : null;
      if (text === null) return;
      if (!text.trim()) {
        say(status, 'There is nothing to copy yet.');
        return;
      }
      copy(text).then((ok) => {
        say(status, ok ? 'Copied to your clipboard.' : 'Copying failed — select the text and copy it by hand.');
      });
    });

    // The preview is a scripting feature: reveal it only now, and start it
    // collapsed on narrow screens so it doesn't push the form down.
    const panel = root.querySelector('[data-preview-panel]');
    if (panel) {
      panel.hidden = false;
      panel.open = !window.matchMedia || window.matchMedia('(min-width: 1024px)').matches;
    }

    fields.filter((field) => field.type === 'images').forEach(ns.renderImagePreviews);
    paintPreview();
    paintProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }

  ns.init = init;
})(window.SubmitForm = window.SubmitForm || {});
