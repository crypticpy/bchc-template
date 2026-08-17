/**
 * Step 2 — branding, colours, type and home page copy.
 *
 * The palette swatches, the WCAG contrast checks and the live theme preview
 * all repaint from one `renderPalette()`, wired into every control on the step
 * as its `onChange`. Both preview nodes are recreated on each render, so the
 * module-level handles below never outlive the step body they belong to.
 */

import { COLOR_QUESTIONS, contrastRatio, isHexColor } from '../core.js';
import { el } from '../dom.js';
import { renderThemePreview } from '../theme-preview.js';
import { colorField, selectField, textField } from '../wizard/controls.js';
import { baseConfigFor, state } from '../wizard/state.js';

/** Text answers the live preview echoes; changes to these re-render it too. */
const PREVIEW_TEXT_KEYS = new Set([
  'siteName',
  'orgName',
  'orgShort',
  'logoText',
  'heroEyebrow',
  'heroTitle',
  'heroLead',
]);

let paletteNode = null;
let previewNode = null;

/**
 * Repaint the live preview, the colour swatches and the WCAG contrast checks.
 * No-ops before the step body exists.
 */
function renderPalette() {
  if (previewNode) {
    renderThemePreview(previewNode, state.answers, {
      singular: (state.answers.entrySingular || 'entry').toLowerCase(),
      plural: (state.answers.entryPlural || 'entries').toLowerCase(),
    });
  }
  if (!paletteNode) return;
  const { primaryDark } = state.answers;
  const base = baseConfigFor(state.startId).theme.colors;
  const swatches = [
    ...COLOR_QUESTIONS.map((q) => [q.label, state.answers[q.key]]),
    ['Card', base.card],
    ['Surface', base.surface],
  ];
  const inkOnCard = contrastRatio(base.ink, base.card);
  const onDarkOnPrimaryDark = contrastRatio(base.on_dark, primaryDark);
  const checks = [
    ['Body text on cards', inkOnCard],
    ['Text on the dark hero/footer', onDarkOnPrimaryDark],
  ];

  paletteNode.replaceChildren(
    el(
      'div',
      { class: 'flex flex-wrap gap-3' },
      swatches.map(([name, value]) =>
        el('div', { class: 'flex items-center gap-2' }, [
          el('span', {
            class: 'inline-block h-8 w-8 rounded-lg border border-brand-line',
            style: `background:${isHexColor(value) ? value : 'transparent'}`,
            'aria-hidden': 'true',
          }),
          el('span', { class: 'text-xs text-brand-muted' }, [
            el('span', { class: 'block font-semibold text-brand-ink', text: name }),
            el('span', { class: 'font-mono', text: value || '—' }),
          ]),
        ])
      )
    ),
    el(
      'ul',
      { class: 'mt-4 space-y-1 text-sm' },
      checks.map(([name, ratio]) => {
        if (ratio === null)
          return el('li', {
            class: 'text-brand-muted',
            text: `${name}: enter a valid hex color to check contrast.`,
          });
        const ok = ratio >= 4.5;
        return el('li', { class: ok ? 'text-brand-ink' : 'font-semibold text-brand-accent' }, [
          el('span', { text: `${name}: ${ratio.toFixed(1)}:1 — ` }),
          el('span', {
            text: ok
              ? 'passes WCAG AA.'
              : 'below the 4.5:1 minimum. Darken the background or lighten the text.',
          }),
        ]);
      })
    )
  );
}

/** A text field that repaints the preview when the answer feeds it. */
function copyField(key, label, options = {}) {
  return textField(key, label, {
    ...options,
    onChange: PREVIEW_TEXT_KEYS.has(key) ? renderPalette : undefined,
  });
}

/** @returns {{body: HTMLElement}} step 2 body — site/org, GitHub, colours/type and home-page copy. */
export function renderBranding() {
  paletteNode = el('div', { class: 'px-6 py-5' });
  previewNode = el('div', { class: 'p-4 sm:p-6' });
  const body = el('div', { class: 'space-y-6' }, [
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'Site & organization' }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        copyField('siteName', 'Site name', { help: 'Shown in the header and browser tab.' }),
        copyField('tagline', 'Tagline', { help: 'One short line under the site name.' }),
      ]),
      copyField('description', 'Description', {
        textarea: true,
        help: 'Used for search engines and the RSS feed.',
      }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        copyField('orgName', 'Organization name'),
        copyField('orgShort', 'Short name / initials', { help: 'Used in tight spaces.' }),
        copyField('logoText', 'Logo text mark', { help: 'Shown when no logo image is set.' }),
        copyField('logoImage', 'Logo image path', { help: 'Optional, e.g. /assets/images/logo.svg' }),
        copyField('orgUrl', 'Organization website', { type: 'url' }),
        copyField('contactEmail', 'Contact email', { type: 'email' }),
      ]),
    ]),
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'GitHub' }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        copyField('repository', 'Repository', {
          help: 'owner/repo — used for submission links and edit links.',
          placeholder: 'owner/repo',
        }),
        copyField('branch', 'Branch', { help: 'The branch GitHub Pages builds from.' }),
      ]),
    ]),
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'Colors & type' }),
      el(
        'div',
        { class: 'grid gap-4 sm:grid-cols-2' },
        COLOR_QUESTIONS.map((q) => colorField(q.key, q.label, q.help, renderPalette))
      ),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-header' }, [
          el('p', { class: 'card-title', text: 'Live preview' }),
          el('p', {
            class: 'section-lead mt-1',
            text: 'The real components under your palette, type and rounding — header, hero, an entry card and controls. Updates as you type.',
          }),
        ]),
        previewNode,
        el('div', { class: 'card-header border-t' }, [
          el('p', { class: 'card-title', text: 'Palette & contrast' }),
        ]),
        paletteNode,
      ]),
      el('div', { class: 'grid gap-4 sm:grid-cols-3' }, [
        selectField(
          'headingFont',
          'Heading font',
          [
            { value: 'Source Sans 3', label: 'Source Sans 3 (bundled)' },
            { value: 'Inter', label: 'Inter (bundled)' },
          ],
          undefined,
          renderPalette
        ),
        selectField(
          'bodyFont',
          'Body font',
          [
            { value: 'Inter', label: 'Inter (bundled)' },
            { value: 'Source Sans 3', label: 'Source Sans 3 (bundled)' },
          ],
          undefined,
          renderPalette
        ),
        selectField(
          'radius',
          'Corner rounding',
          [
            { value: 'sharp', label: 'Sharp' },
            { value: 'soft', label: 'Soft' },
            { value: 'round', label: 'Round' },
          ],
          undefined,
          renderPalette
        ),
      ]),
      copyField('googleFontsUrl', 'Google Fonts URL', {
        type: 'url',
        help: 'Only needed if you replace a bundled font with another family. Paste the href from fonts.google.com.',
      }),
    ]),
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'Home page & footer copy' }),
      copyField('heroEyebrow', 'Eyebrow', { help: 'Small line above the headline.' }),
      copyField('heroTitle', 'Headline'),
      copyField('heroLead', 'Lead paragraph', { textarea: true }),
      copyField('submitIntro', 'Submission page intro', { textarea: true }),
      copyField('footerAbout', 'Footer about', { textarea: true }),
      copyField('copyright', 'Copyright holder'),
    ]),
  ]);
  renderPalette();
  return { body };
}
