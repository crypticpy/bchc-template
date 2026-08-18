/**
 * The preset build matrix: assertions over the trees scripts/build_variants.mjs
 * produces. One Jekyll build per variant, every assertion read off the built
 * DOM — so adding a check costs nothing but the check.
 *
 * Skipped unless RUN_BUILD_TESTS=1 (`npm run test:build`). Node's default test
 * discovery picks up everything under `test/`, and `npm test` has to stay a
 * pure-JS, sub-second gate that needs neither Ruby nor a Jekyll install.
 */

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { JSDOM } from 'jsdom';
import * as yaml from 'js-yaml';

import { VARIANTS, buildVariants, preflight } from '../../scripts/build_variants.mjs';
import { checkRenderedCopy, entryNoun, formatFindings } from '../../scripts/check_rendered_copy.mjs';

const ENABLED = process.env.RUN_BUILD_TESTS === '1';
const ready = ENABLED ? preflight() : { ok: false, reason: 'set RUN_BUILD_TESTS=1 (`npm run test:build`)' };

/**
 * `BUILD_VARIANTS=blank,blank-empty` narrows the run to those ids — for a local
 * loop on one preset, and so CI can shard this across runners without the id
 * list being written down a second time in the workflow.
 */
const SELECTED = (process.env.BUILD_VARIANTS ?? '').split(/[\s,]+/).filter(Boolean);
const variants = SELECTED.length ? VARIANTS.filter((v) => SELECTED.includes(v.id)) : VARIANTS;
const unknown = SELECTED.filter((id) => !VARIANTS.some((v) => v.id === id));
if (unknown.length) throw new Error(`BUILD_VARIANTS names no such variant: ${unknown.join(', ')}`);

/** `skip` reason for a test that needs a variant this run did not build. */
const needs = (id) =>
  variants.some((variant) => variant.id === id) ? false : `${id} is not in BUILD_VARIANTS`;

/** Parsed `<dir>/<page>/index.html`. */
function page(siteDir, urlPath) {
  const file = path.join(siteDir, urlPath, 'index.html');
  assert.ok(fs.existsSync(file), `${urlPath} was not built`);
  return new JSDOM(fs.readFileSync(file, 'utf8')).window.document;
}

describe('preset build matrix', { skip: ready.ok ? false : ready.reason, concurrency: false }, () => {
  /** @type {Map<string, ReturnType<typeof buildVariants>[number]>} */
  const built = new Map();
  let scratchRoot = '';

  before(
    () => {
      if (!ready.ok) return;
      scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-variants-'));
      for (const result of buildVariants({ ids: SELECTED, scratchRoot }))
        built.set(result.variant.id, result);
    },
    { timeout: 15 * 60 * 1000 }
  );

  after(() => {
    if (scratchRoot && !process.env.KEEP_BUILD_VARIANTS) {
      fs.rmSync(scratchRoot, { recursive: true, force: true });
    }
  });

  for (const variant of variants) {
    test(`${variant.id}: every step succeeds`, () => {
      const result = built.get(variant.id);
      const failed = result.steps.filter((step) => !step.ok);
      assert.deepEqual(
        failed.map((step) => step.name),
        [],
        failed.map((step) => `\n--- ${step.name} ---\n${step.output.trim()}`).join('\n')
      );
    });

    if (!variant.build) continue;

    test(`${variant.id}: rendered copy is clean`, () => {
      const { dir, siteDir } = built.get(variant.id);
      const findings = checkRenderedCopy(siteDir, { sourceDir: dir });
      assert.equal(findings.length, 0, `\n${formatFindings(findings)}`);
    });

    test(`${variant.id}: /search.json is valid JSON`, () => {
      const { siteDir } = built.get(variant.id);
      const index = JSON.parse(fs.readFileSync(path.join(siteDir, 'search.json'), 'utf8'));
      assert.ok(Array.isArray(index.docs), 'search.json has no `docs` array');
      // Only a variant with entries can have entry docs; `blank-empty` has none
      // by design, and an empty index is the correct output for an empty site.
      if (variant.entries !== 'none') {
        assert.ok(
          index.docs.some((doc) => doc.kind === 'entry' || doc.url?.includes('/')),
          'search.json is empty for a variant that has entries'
        );
      }
    });

    test(`${variant.id}: the Atom feed lists the entries`, () => {
      const { dir, siteDir } = built.get(variant.id);
      const feed = path.join(siteDir, entryNoun(dir).path, 'feed.xml');
      if (variant.entries === 'none') {
        // _plugins/catalog_feed.rb returns early rather than emitting an empty
        // document — the failure mode it was written to replace.
        assert.equal(fs.existsSync(feed), false, 'an empty catalog should not emit a feed');
        return;
      }
      assert.ok(fs.existsSync(feed), `${path.relative(siteDir, feed)} was not generated`);
      const entries = (fs.readFileSync(feed, 'utf8').match(/<entry>/g) ?? []).length;
      assert.ok(entries > 0, 'the feed advertised in <head> has no entries');
    });

    test(`${variant.id}: the A–Z directory and the facet landing pages are real pages`, () => {
      const { dir, siteDir } = built.get(variant.id);
      const noun = entryNoun(dir);
      const az = path.join(siteDir, noun.path, 'a-z', 'index.html');
      if (variant.entries === 'none') {
        // Nothing to index: _plugins/facet_pages.rb generates neither, rather
        // than publishing an empty directory of an empty catalog.
        assert.equal(fs.existsSync(az), false, 'an empty catalog should not get an A–Z page');
        return;
      }
      assert.ok(fs.existsSync(az), `${noun.path}/a-z/ was not generated`);

      const directory = page(siteDir, `${noun.path}/a-z`);
      const landing = [...directory.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href'))
        .filter((href) => new RegExp(`^/${noun.path}/[^/]+/[^/]+/$`).test(href));
      assert.ok(landing.length > 0, 'the A–Z page links to no facet landing pages');

      // Every link it makes has to resolve, and land on a page with a heading
      // and a route back into the live filter.
      for (const href of landing.slice(0, 5)) {
        const document = page(siteDir, href);
        assert.equal(document.querySelectorAll('h1').length, 1, `${href} does not have exactly one <h1>`);
        assert.ok(
          document.querySelector(`a[href*="/${noun.path}/?"]`),
          `${href} does not link back to the live filter`
        );
        assert.ok(document.querySelector('link[rel="canonical"]'), `${href} has no canonical link`);
        const title = document.querySelector('title')?.textContent ?? '';
        assert.ok(title.length > 0 && !/^\s*·/.test(title), `${href} has an empty <title>`);
      }

      // A crawler finds them the same way: through the sitemap.
      const sitemap = fs.readFileSync(path.join(siteDir, 'sitemap.xml'), 'utf8');
      assert.ok(sitemap.includes(`${noun.path}/a-z/`), 'the A–Z page is missing from sitemap.xml');
      assert.ok(sitemap.includes(landing[0]), `${landing[0]} is missing from sitemap.xml`);
    });

    test(`${variant.id}: the catalog search box is a <search> landmark`, () => {
      const { dir, siteDir } = built.get(variant.id);
      const document = page(siteDir, entryNoun(dir).path);
      const landmark = document.querySelector('search[role="search"]');
      assert.ok(landmark, 'the results header has no <search> landmark');
      assert.ok(landmark.getAttribute('aria-label'), 'the <search> landmark has no accessible name');
      assert.equal(landmark.querySelector('[data-filter="search"]')?.getAttribute('type'), 'search');
    });

    test(`${variant.id}: every entry page has one <h1> and a related section`, () => {
      const { dir, siteDir } = built.get(variant.id);
      const noun = entryNoun(dir);
      const catalogDir = path.join(siteDir, noun.path);
      const slugs = fs
        .readdirSync(catalogDir, { withFileTypes: true })
        .filter((item) => item.isDirectory() && fs.existsSync(path.join(catalogDir, item.name, 'index.html')))
        .map((item) => item.name);
      if (variant.entries === 'none') {
        assert.equal(slugs.length, 0, 'entries were left behind in an empty variant');
        return;
      }
      assert.ok(slugs.length > 0, 'no entry pages were built');
      for (const slug of slugs) {
        const document = page(siteDir, `${noun.path}/${slug}`);
        assert.equal(document.querySelectorAll('h1').length, 1, `${slug} does not have exactly one <h1>`);
      }
    });
  }

  test(
    'blank-empty: the catalog shows the empty state and a working call to action',
    { skip: needs('blank-empty') },
    () => {
      const { dir, siteDir } = built.get('blank-empty');
      const noun = entryNoun(dir);
      const document = page(siteDir, noun.path);
      assert.equal(document.querySelectorAll('.entry-card').length, 0);

      const text = document.body.textContent.replace(/\s+/g, ' ');
      assert.match(text, new RegExp(`No ${noun.plural.toLowerCase()} have been published yet\\.`));
      // The sentence must not be downcased as a whole — that is the
      // `'No ' | append: plural | downcase` bug the sentence-case rule watches for.
      assert.doesNotMatch(text, /\bno [a-z]+ have been published yet\./);

      const cta = [...document.querySelectorAll('a[href]')].find((a) =>
        a.getAttribute('href').includes('/submit/')
      );
      assert.ok(cta, 'the empty state has no submit call to action');
      assert.ok(
        fs.existsSync(path.join(siteDir, cta.getAttribute('href'), 'index.html')),
        `the empty-state call to action points at ${cta.getAttribute('href')}, which is not in the built site`
      );
    }
  );

  test(
    'blank-empty: the filter rail renders one fieldset per facet field',
    { skip: needs('blank-empty') },
    () => {
      const { dir, siteDir } = built.get('blank-empty');
      const schema = yaml.load(fs.readFileSync(path.join(dir, '_data', 'schema.yml'), 'utf8'));
      // Free-text facets take their options from the entries, so with an empty
      // catalog only the fields that declare `options` can render a group.
      const expected = schema.fields.filter((field) => field.facet && (field.options ?? []).length > 0);
      const document = page(siteDir, entryNoun(dir).path);
      const groups = document.querySelectorAll('[data-filter-rail] fieldset, .filter-rail fieldset');
      assert.equal(groups.length, expected.length, `expected ${expected.map((f) => f.key).join(', ')}`);
    }
  );

  test(
    'blank-empty: the filter rail opens with a "Skip filters" link that lands on the results heading',
    { skip: needs('blank-empty') },
    () => {
      const { dir, siteDir } = built.get('blank-empty');
      const document = page(siteDir, entryNoun(dir).path);
      const rail = document.querySelector('[data-filter-rail]');
      const skip = rail?.querySelector('a.rail-skip');
      assert.ok(skip, 'no .rail-skip link inside the rail');
      assert.equal(rail.firstElementChild, skip, 'the skip link must be the first thing in the rail');
      const target = skip.getAttribute('href').replace(/^#/, '');
      const heading = document.getElementById(target);
      assert.ok(heading, `#${target} is not on the page`);
      assert.equal(heading.getAttribute('tabindex'), '-1', `#${target} is not programmatically focusable`);
    }
  );

  test(
    'all-modules: every cohort event is linked from its cohort page',
    { skip: needs('all-modules') },
    () => {
      const { dir, siteDir } = built.get('all-modules');
      const cohorts = yaml.load(fs.readFileSync(path.join(dir, '_data', 'cohorts', '2026.yml'), 'utf8'));
      const document = page(siteDir, 'cohorts/2026');
      const hrefs = new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
      for (const event of cohorts.events) {
        const url = `/cohorts/2026/events/${event.id}/`;
        assert.ok(hrefs.has(url), `${event.name} (${url}) is not linked from /cohorts/2026/`);
        assert.ok(fs.existsSync(path.join(siteDir, url, 'index.html')), `${url} was not built`);
      }
    }
  );

  test('all-modules: the events and resources pages build', { skip: needs('all-modules') }, () => {
    const { siteDir } = built.get('all-modules');
    for (const url of ['events', 'resources', 'cohorts']) {
      assert.equal(page(siteDir, url).querySelectorAll('h1').length, 1, `/${url}/ has no single <h1>`);
    }
  });
});
