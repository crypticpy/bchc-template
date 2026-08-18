// pa11y-ci config for `npm run a11y` / quality.yml. Entry-page URLs are
// discovered from the built site (./urls.js) so a deployment without the
// shipped samples still passes.
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { qualityUrls } = require('./urls.js');

const BASE = process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173';
const { home, catalog, submit, entries } = qualityUrls(BASE);
const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true };
const setup = `${BASE}/setup/`;

/**
 * Whether the filter rail renders a "Show all" button, i.e. some facet field
 * has more than the 8 options _includes/filter-groups.html shows up front.
 * Undercounts on purpose (free-text facets take their options from the entries,
 * not the schema): a missed state only means one fewer audited URL, while a
 * state that is not in the built site would fail the whole run.
 * @returns {boolean}
 */
function hasOverflowFacet() {
  try {
    const schema = yaml.load(fs.readFileSync(path.join(__dirname, '..', '_data', 'schema.yml'), 'utf8'));
    return (schema?.fields || []).some((f) => f && f.facet && (f.options || []).length > 8);
  } catch {
    return false;
  }
}

// sampleEntryPaths() returns [entry with images, entry without]; only when both
// exist is entries[0] known to have a gallery, and so a lightbox to open.
const galleryEntry = entries.length === 2 ? entries[0] : null;

module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    runners: ['axe', 'htmlcs'],
    timeout: 60000,
    wait: 500,
    chromeLaunchConfig: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    concurrency: 1,
    levelCapWhenNeedsReview: 'warning',
    ignore: [],
  },
  urls: [
    home,
    catalog,
    `${catalog}?q=triage`,
    ...entries,
    submit,
    `${BASE}/about/`,
    setup,
    // Wizard steps that only exist after interaction: Look (live preview) and
    // Entry model (field builder). Selected by step id, not position — the
    // wizard's step list grows.
    {
      url: setup,
      actions: [
        'click element #wizard-steps button[data-step="look"]',
        'wait for element .theme-preview to be visible',
      ],
    },
    {
      url: setup,
      actions: [
        'click element #wizard-steps button[data-step="fields"]',
        'wait for element .wizard-actions.is-sticky to be visible',
        // Open the first field row so the per-field controls are audited too.
        'click element #schema-field-title-toggle',
        'wait for element #schema-field-title-card to be visible',
      ],
    },
    `${BASE}/styleguide/`,
    { url: catalog, viewport: mobile },
    ...entries.slice(0, 1).map((url) => ({ url, viewport: mobile })),
    { url: submit, viewport: mobile },
    // Interactive states that only exist after a click.
    // The mobile filter sheet: a modal dialog that inerts the rest of the page.
    {
      url: catalog,
      viewport: mobile,
      actions: ['click element [data-sheet-open]', 'wait for element [data-filter-sheet] to be visible'],
    },
    // The desktop rail with a facet's overflow pills revealed.
    ...(hasOverflowFacet()
      ? [
          {
            url: catalog,
            actions: ['click element [data-show-all]', 'wait for element [data-overflow] to be visible'],
          },
        ]
      : []),
    // The entry gallery lightbox (<dialog> opened by the first thumbnail).
    ...(galleryEntry
      ? [
          {
            url: galleryEntry,
            actions: [
              'click element [data-gallery-open]',
              'wait for element [data-gallery-dialog] to be visible',
            ],
          },
        ]
      : []),
  ],
};
