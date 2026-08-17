/**
 * Submit form — live card preview.
 *
 * Mirrors _includes/entry-card.html using the same classes, so what the
 * submitter sees here is what the catalog renders. Every fragment that carries
 * schema styling (badge tone, chip, signal glyph, line icon) is cloned from a
 * Liquid-rendered <template> in submit/index.md; everything the submitter typed
 * is written with textContent. No HTML is ever built from a string.
 *
 * DOM contract: [data-preview-media|image|meta|title|line|summary|chips|signals]
 * and the <template> set under [data-preview-templates].
 *
 * Exposes: window.SubmitForm.initPreview
 */
(function (ns) {
  'use strict';

  /** Card slot caps, from the design brief's card contract. */
  const MAX_META = 2;
  const MAX_CHIPS = 2;
  const MAX_SIGNALS = 4;

  /**
   * Options currently chosen in a select/multiselect field.
   * @param {object} field descriptor from readFields
   * @returns {Array<{value: string, index: string, short: string}>}
   */
  function chosenOptions(field) {
    const controls = Array.from(
      field.wrap.querySelectorAll('input[type=radio]:checked, input[type=checkbox]:checked, select')
    );
    const picked = [];
    controls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        const option = control.options[control.selectedIndex];
        if (option && option.value) {
          picked.push({ value: option.value, index: option.dataset.optionIndex, short: option.dataset.short || option.value });
        }
        return;
      }
      if (control.hasAttribute('data-clear') || !control.value) return;
      picked.push({ value: control.value, index: control.dataset.optionIndex, short: control.dataset.short || control.value });
    });
    return picked;
  }

  /**
   * Escape a value for use inside an [attr="…"] selector. Schema keys are
   * slugs, but this keeps the selector honest without relying on CSS.escape
   * (absent in some test DOMs).
   * @param {string} value
   * @returns {string}
   */
  function attrValue(value) {
    return String(value).replace(/(["\\])/g, '\\$1');
  }

  /**
   * Clone the pre-rendered view of one option.
   * @param {HTMLElement} templates the [data-preview-templates] container
   * @param {string} key field key
   * @param {string} index option index
   * @returns {DocumentFragment|null}
   */
  function optionView(templates, key, index) {
    if (index === undefined || index === null) return null;
    const tpl = templates.querySelector('[data-option-view="' + attrValue(key + '__' + index) + '"]');
    return tpl ? tpl.content.cloneNode(true) : null;
  }

  /** @param {HTMLElement} node @param {boolean} on */
  function toggle(node, on) {
    if (node) node.hidden = !on;
  }

  /**
   * Wire the card preview to a set of fields.
   * @param {HTMLElement} root element containing the preview markup
   * @param {object[]} fields descriptors from readFields
   * @returns {() => void} call to repaint the card
   */
  ns.initPreview = function initPreview(root, fields) {
    const templates = root.querySelector('[data-preview-templates]');
    const media = root.querySelector('[data-preview-media]');
    const image = root.querySelector('[data-preview-image]');
    const meta = root.querySelector('[data-preview-meta]');
    const title = root.querySelector('[data-preview-title]');
    const line = root.querySelector('[data-preview-line]');
    const summary = root.querySelector('[data-preview-summary]');
    const chips = root.querySelector('[data-preview-chips]');
    const signals = root.querySelector('[data-preview-signals]');
    if (!templates) return function noop() {};

    const bySlot = (slot) => fields.filter((field) => field.slot === slot);
    const byRole = (role) => fields.find((field) => field.wrap.dataset.role === role);
    const titleField = byRole('title');
    const summaryField = byRole('summary');
    const badgeField = bySlot('badge')[0];
    const chipField = bySlot('chip')[0];
    const metaFields = bySlot('meta');
    const lineFields = bySlot('line');
    const iconFields = bySlot('icon');
    const imageFields = fields.filter((field) => field.type === 'images' || field.type === 'image');
    const titlePlaceholder = title ? title.textContent : '';
    const summaryPlaceholder = summary ? summary.textContent : '';

    /** Media band — only when there is a real image. */
    function paintMedia() {
      if (!media || !image) return;
      let src = '';
      let alt = '';
      imageFields.some((field) => {
        const value = ns.readValue(field);
        if (Array.isArray(value) && value.length > 0) {
          src = value[0].url;
          alt = value[0].alt || '';
          return true;
        }
        if (!Array.isArray(value) && String(value).trim()) {
          src = String(value).trim();
          return true;
        }
        return false;
      });
      image.alt = alt;
      if (src) image.src = src; else image.removeAttribute('src');
      toggle(media, Boolean(src));
    }

    /** Meta line: badge first, then up to two meta values separated by a dot. */
    function paintMeta() {
      if (!meta) return;
      meta.textContent = '';
      if (badgeField) {
        const picked = chosenOptions(badgeField)[0];
        const view = picked ? optionView(templates, badgeField.key, picked.index) : null;
        if (view) meta.appendChild(view);
      }
      const parts = [];
      metaFields.forEach((field) => {
        if (parts.length >= MAX_META) return;
        const picked = chosenOptions(field);
        if (picked.length > 0) {
          parts.push(picked[0].short);
          return;
        }
        const value = ns.readValue(field);
        const text = Array.isArray(value) ? value[0] : String(value);
        if (text) parts.push(typeof text === 'string' ? text : String(text));
      });
      parts.forEach((part, index) => {
        if (index > 0) {
          const dot = document.createElement('span');
          dot.setAttribute('aria-hidden', 'true');
          dot.textContent = '·';
          meta.appendChild(dot);
        }
        const span = document.createElement('span');
        span.textContent = part;
        meta.appendChild(span);
      });
      toggle(meta, meta.childNodes.length > 0);
    }

    /** The first answered `card: line` field, with its schema icon. */
    function paintLine() {
      if (!line) return;
      line.textContent = '';
      const field = lineFields.find((candidate) => ns.isAnswered(candidate));
      if (!field) {
        toggle(line, false);
        return;
      }
      const tpl = templates.querySelector('[data-line-view="' + attrValue(field.key) + '"]');
      if (!tpl) {
        toggle(line, false);
        return;
      }
      const view = tpl.content.cloneNode(true);
      const slot = view.querySelector('[data-line-text]');
      const picked = chosenOptions(field)[0];
      const value = ns.readValue(field);
      if (slot) slot.textContent = picked ? picked.short : (Array.isArray(value) ? value.join(', ') : String(value));
      line.appendChild(view);
      toggle(line, true);
    }

    /** One chip family only, capped, with a neutral "+n" overflow chip. */
    function paintChips() {
      if (!chips) return;
      chips.textContent = '';
      if (!chipField) {
        toggle(chips, false);
        return;
      }
      const picked = chosenOptions(chipField);
      picked.slice(0, MAX_CHIPS).forEach((option) => {
        const view = optionView(templates, chipField.key, option.index);
        if (view) chips.appendChild(view);
      });
      const extra = picked.length - MAX_CHIPS;
      if (extra > 0) {
        const tpl = templates.querySelector('[data-chip-overflow]');
        if (tpl) {
          const view = tpl.content.cloneNode(true);
          const slot = view.querySelector('[data-overflow-text]');
          if (slot) slot.textContent = '+' + extra;
          chips.appendChild(view);
        }
      }
      toggle(chips, picked.length > 0);
    }

    /** Signal strip: short glyphs for the `card: icon` fields. */
    function paintSignals() {
      if (!signals) return;
      signals.textContent = '';
      let count = 0;
      iconFields.forEach((field) => {
        if (count >= MAX_SIGNALS) return;
        chosenOptions(field).forEach((option) => {
          if (count >= MAX_SIGNALS) return;
          const view = optionView(templates, field.key, option.index);
          if (view) {
            signals.appendChild(view);
            count += 1;
          }
        });
      });
      toggle(signals, count > 0);
    }

    return function update() {
      if (title) {
        const value = titleField ? String(ns.readValue(titleField)) : '';
        title.textContent = value || titlePlaceholder;
        title.classList.toggle('text-brand-muted', !value);
      }
      if (summary) {
        const value = summaryField ? String(ns.readValue(summaryField)) : '';
        summary.textContent = value || summaryPlaceholder;
        toggle(summary, true);
      }
      paintMedia();
      paintMeta();
      paintLine();
      paintChips();
      paintSignals();
    };
  };
})(window.SubmitForm = window.SubmitForm || {});
