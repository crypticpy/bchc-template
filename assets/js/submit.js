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

  /**
   * GitHub rejects very long URLs; well below that we switch to copy-paste.
   * Keep this in step with `prefillNoticeIfTooLong` in
   * assets/js/configurator/strings.js, which warns at the same length for the
   * configurator's prefilled "new file" links.
   */
  const MAX_URL = 7000;

  /** Warn the submitter once the prefilled URL is this close to the ceiling. */
  const URL_WARN_AT = Math.round(MAX_URL * 0.85);

  /**
   * Copy text to the clipboard, falling back to a selection when the
   * async API is unavailable (http:// origins, older Safari).
   * @param {string} text
   * @returns {Promise<boolean>} whether the copy succeeded
   */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => false
      );
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
    const lineSection = form.querySelector('[data-progress-section]');
    const total = links.length;

    const sections = Array.from(form.querySelectorAll('[data-section]'));
    if (typeof IntersectionObserver === 'function' && sections.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const key = entry.target.dataset.section;
            links.forEach((link) => {
              link.setAttribute('aria-current', String(link.dataset.progressLink === key));
            });
            // The sticky mobile bar is the only place a small screen shows which
            // section it is in, so it tracks the same observer as the rail.
            const heading = entry.target.querySelector('h2');
            if (lineSection && heading) lineSection.textContent = heading.textContent.trim();
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );
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
    const fallbackLink = form.querySelector('[data-fallback-link]');
    const lengthNote = form.querySelector('[data-length-note]');

    const paintPreview = ns.initPreview(root.documentElement || root, fields);
    const paintProgress = initProgress(root.documentElement || root, form, fields);
    const titleField = fields.find((field) => field.wrap.dataset.role === 'title');

    /** @returns {string} the entry title, for issue titles and filenames */
    function entryTitle() {
      return titleField ? String(ns.readValue(titleField)) : '';
    }

    let draft = { save: function () {}, clear: function () {}, flush: function () {} };

    /**
     * Warn while there is still time to do something about it: once the
     * prefilled link is near the ceiling, say so instead of waiting for the
     * submitter to press the button and be handed a copy-paste box.
     */
    function paintLength() {
      if (!lengthNote) return;
      const length = ns.issueUrl(form, fields, entryTitle()).length;
      const near = length >= URL_WARN_AT;
      if (near) {
        lengthNote.textContent =
          length > MAX_URL
            ? 'Your answers are now too long to carry in a link. Pressing the button below will hand you the text to paste into a blank issue instead.'
            : 'Your answers are getting long. A little more and they will not fit in a link — you will be given text to paste into a blank issue instead.';
      }
      lengthNote.hidden = !near;
    }

    /** Repaint everything that mirrors the answers. */
    function refresh() {
      paintPreview();
      paintProgress();
      paintLength();
      draft.save();
    }

    draft = ns.initDraft(form, fields, function afterRestore() {
      fields.filter((field) => field.type === 'images').forEach(ns.renderImagePreviews);
      paintPreview();
      paintProgress();
      paintLength();
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

    form.addEventListener(
      'blur',
      (event) => {
        const wrap = event.target.closest ? event.target.closest('[data-field]') : null;
        if (!wrap) return;
        const field = fields.find((candidate) => candidate.wrap === wrap);
        if (!field) return;
        const message = ns.checkField(field);
        if (message) ns.showError(field, message);
        else ns.clearError(field);
      },
      true
    );

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
        showFallback(
          'Your answers are too long to carry in a link. Copy the text below into a blank issue instead — the box is right under these buttons.',
          ''
        );
        return;
      }

      const missed = ns.unprefillable(fields).map((field) => field.label);
      const note =
        missed.length > 0
          ? ' GitHub cannot prefill tick boxes, so re-answer ' + missed.join(', ') + ' on that page.'
          : '';

      // Only drop the draft once the new tab actually exists. A blocked popup
      // used to clear it anyway, so the answers were gone and nothing had
      // opened; now the copy-paste route appears and the draft stays put.
      // Not `window.open(url, '_blank', 'noopener')`: with `noopener` in the
      // features string the call returns null even when the tab opened, which
      // made every successful submit look blocked. Sever the opener afterwards.
      const opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
      if (!opened) {
        showFallback(
          'Your browser blocked the new tab. Use the link below to open the prefilled issue, or copy the text and paste it into a blank issue.',
          url
        );
        return;
      }
      say(
        status,
        'Opening GitHub with your answers filled in. Check them over and press “Submit new issue”.' + note
      );
      draft.clear();
    });

    /**
     * Reveal the copy-paste route, optionally with a direct link to the
     * prefilled issue (present when a popup was blocked, absent when the URL
     * was too long to exist).
     * @param {string} message
     * @param {string} url
     */
    function showFallback(message, url) {
      if (fallbackBody) fallbackBody.value = ns.markdownBody(fields);
      if (fallbackLink) {
        if (url) fallbackLink.href = url;
        fallbackLink.hidden = !url;
      }
      if (fallback) fallback.hidden = false;
      say(status, message);
      if (fallbackBody) fallbackBody.focus();
    }

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

      const text =
        action === 'copy-yaml'
          ? ns.yamlFrontMatter(fields)
          : action === 'copy-markdown'
            ? ns.markdownBody(fields)
            : action === 'copy-fallback' && fallbackBody
              ? fallbackBody.value
              : null;
      if (text === null) return;
      if (!text.trim()) {
        say(status, 'There is nothing to copy yet.');
        return;
      }
      copy(text).then((ok) => {
        say(
          status,
          ok ? 'Copied to your clipboard.' : 'Copying failed — select the text and copy it by hand.'
        );
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
    paintLength();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }

  ns.init = init;
})((window.SubmitForm = window.SubmitForm || {}));
