// Lighthouse CI config for `npm run lighthouse` / quality.yml. The entry page
// is discovered from the built site (./urls.js).
const { qualityUrls } = require('./urls.js');

const { home, catalog, submit, entries } = qualityUrls(
  process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173'
);

module.exports = {
  ci: {
    collect: {
      url: [home, catalog, ...entries.slice(0, 1), submit],
      numberOfRuns: 1,
      settings: { preset: 'desktop', chromeFlags: '--no-sandbox --disable-dev-shm-usage' },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
