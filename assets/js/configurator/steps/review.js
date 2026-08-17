/**
 * Step 5 — review and publish.
 *
 * Renders every file the configurator owns and hands it to the admin to copy,
 * download, or paste into GitHub's web editor. Nothing is written from here.
 */

import { githubEditFileUrl, renderFiles, validateSchema } from '../core.js';
import { el } from '../dom.js';
import { announce } from '../wizard/errors.js';
import { buildConfig, state } from '../wizard/state.js';

const FILE_HELP = {
  '_data/site.yml': 'Branding, contact details and module toggles.',
  '_data/theme.yml': 'Colors, fonts and corner rounding.',
  '_data/schema.yml': 'The entry content model — fields, filters and cards.',
  '_data/navigation.yml': 'The header navigation, derived from your modules.',
  '_config.yml':
    'Jekyll build settings. Only the title and description lines change — if you have customised this file, edit those two lines on GitHub instead of pasting the whole thing.',
  '.github/ISSUE_TEMPLATE/new-entry.yml':
    'The GitHub issue form contributors fill in. Generated from the schema.',
};

/**
 * A "Copy" button for one rendered file's contents. The result shows as a
 * transient button label for sighted users and is announced through a
 * visually-hidden polite live region beside it, so a screen-reader user hears
 * "Copied" (or the fallback) without focus moving.
 * @param {string} text file contents to copy.
 * @returns {HTMLElement} the button and its status region.
 */
function copyButton(text) {
  const button = el('button', { type: 'button', class: 'btn-secondary', text: 'Copy' });
  const status = el('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  button.addEventListener('click', async () => {
    let result;
    try {
      await navigator.clipboard.writeText(text);
      result = 'Copied';
    } catch {
      result = 'Press Ctrl/Cmd+C';
    }
    button.textContent = result;
    status.textContent = result === 'Copied' ? 'Copied to the clipboard.' : 'Copy failed. Press Ctrl/Cmd+C.';
    window.setTimeout(() => {
      button.textContent = 'Copy';
      status.textContent = '';
    }, 2000);
  });
  return el('span', { class: 'contents' }, [button, status]);
}

/**
 * A "Download" button that saves one rendered file via an object URL,
 * revoked a second after the click so the download has time to start.
 * @param {string} relative the file's repo-relative path; only its basename is used for the download filename.
 * @param {string} text file contents.
 * @returns {HTMLButtonElement}
 */
function downloadButton(relative, text) {
  const button = el('button', { type: 'button', class: 'btn-secondary', text: 'Download' });
  button.addEventListener('click', () => {
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = el('a', { href: url, download: relative.split('/').pop() });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return button;
}

/**
 * @returns {{body: HTMLElement}} step 5 body — publish instructions plus every
 *   rendered file with copy/download/"Open on GitHub" actions. Re-validates the
 *   schema and, on failure, shows the problems via `announce()` instead of
 *   rendering the files.
 */
export function renderReview() {
  const config = buildConfig();
  const errors = validateSchema(config.schema);
  if (errors.length > 0) {
    announce(errors);
    return {
      body: el('div', { class: 'card p-6' }, [
        el('p', {
          class: 'text-sm text-brand-ink',
          text: 'Fix the problems listed above on the "Entry model" step, then come back here.',
        }),
      ]),
    };
  }
  announce([]);

  const files = renderFiles(config, { url: '', baseurl: '' });
  const repository = String(state.answers.repository || '').trim();
  const branch = String(state.answers.branch || 'main').trim() || 'main';

  const body = el('div', { class: 'space-y-6' }, [
    el('div', { class: 'card' }, [
      el('div', { class: 'card-header' }, [
        el('p', { class: 'card-title', text: 'How to publish these changes' }),
      ]),
      el('ol', { class: 'list-decimal space-y-2 px-10 py-5 text-sm text-brand-ink' }, [
        el('li', { text: 'Press Copy on a file below.' }),
        el('li', { text: 'Press "Open on GitHub" — it opens that file in GitHub\'s web editor.' }),
        el('li', {
          text: 'Select everything in the editor (Ctrl/Cmd+A), paste, then press "Commit changes".',
        }),
        el('li', {
          text: 'Repeat for each file. The site rebuilds automatically, usually within a minute or two.',
        }),
      ]),
      el('p', {
        class: 'border-t border-brand-line px-6 py-4 text-xs text-brand-muted',
        text: 'GitHub cannot pre-fill its editor for files that already exist, so the copy-and-paste step is unavoidable. Download works too if you prefer to commit from your own machine.',
      }),
    ]),
    ...Object.entries(files).map(([relative, text]) => {
      const editUrl = repository ? githubEditFileUrl(repository, branch, relative) : '';
      return el('section', { class: 'card' }, [
        el('div', { class: 'card-header flex flex-wrap items-start justify-between gap-3' }, [
          el('div', { class: 'min-w-0 flex-1 basis-64' }, [
            el('span', { class: 'eyebrow', text: 'File' }),
            el('p', { class: 'card-title font-mono', text: relative }),
            el('p', { class: 'field-help', text: FILE_HELP[relative] || '' }),
          ]),
          el('div', { class: 'flex shrink-0 flex-wrap gap-2' }, [
            copyButton(text),
            downloadButton(relative, text),
            editUrl
              ? el('a', {
                  class: 'btn-primary',
                  href: editUrl,
                  target: '_blank',
                  rel: 'noopener',
                  text: 'Open on GitHub',
                })
              : el('span', { class: 'chip-neutral', text: 'Set a repository to get a GitHub link' }),
          ]),
        ]),
        // max-h in line units so the clamp ends on a line boundary; long lines
        // scroll sideways inside the card rather than clipping.
        el('div', { class: 'max-h-[calc(0.75rem*1.625*12+2rem)] overflow-auto' }, [
          el('pre', { class: 'w-max min-w-full px-6 py-4 text-xs leading-relaxed text-brand-ink' }, [
            el('code', { text }),
          ]),
        ]),
      ]);
    }),
  ]);
  return { body };
}
