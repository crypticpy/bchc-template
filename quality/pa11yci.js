// pa11y-ci config for `npm run a11y` / quality.yml. Entry-page URLs are
// discovered from the built site (./urls.js) so a deployment without the
// shipped samples still passes.
const { qualityUrls } = require('./urls.js');

const BASE = process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173';
const { home, catalog, submit, entries } = qualityUrls(BASE);
const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true };
const setup = `${BASE}/setup/`;

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
    // Wizard steps that only exist after interaction: Branding (live preview) and Entry model (field builder).
    {
      url: setup,
      actions: [
        'click element #wizard-steps button:nth-child(2)',
        'wait for element .theme-preview to be visible',
      ],
    },
    {
      url: setup,
      actions: [
        'click element #wizard-steps button:nth-child(4)',
        'wait for element #schema-field-0-card to be visible',
      ],
    },
    `${BASE}/styleguide/`,
    { url: catalog, viewport: mobile },
    ...entries.slice(0, 1).map((url) => ({ url, viewport: mobile })),
    { url: submit, viewport: mobile },
  ],
};
