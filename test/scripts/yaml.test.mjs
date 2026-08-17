import assert from 'node:assert/strict';
import test from 'node:test';
import yaml from 'js-yaml';

import { frontMatter, pair, quote, scalar } from '../../scripts/lib/yaml.mjs';

test('scalar leaves simple text plain and quotes everything risky', () => {
  assert.equal(scalar('Pilot'), 'Pilot');
  assert.equal(scalar('Chicago Department of Public Health'), 'Chicago Department of Public Health');
  assert.equal(scalar(''), '""');
  assert.equal(scalar('true'), '"true"');
  assert.equal(scalar('12'), '"12"');
  assert.equal(scalar('- leading dash'), '"- leading dash"');
  assert.equal(scalar('key: value'), '"key: value"');
  assert.equal(scalar('trailing '), '"trailing "');
  assert.equal(scalar(7), '7');
  assert.equal(scalar(true), 'true');
  assert.equal(scalar(null), '""');
});

test('quote escapes backslashes, quotes and control characters', () => {
  assert.equal(quote('a"b\\c\nd'), '"a\\"b\\\\c\\nd"');
});

test('pair renders block lists of scalars and of maps', () => {
  assert.equal(pair('area', []), 'area: []');
  assert.equal(pair('area', ['Epi', 'Data']), 'area:\n  - Epi\n  - Data');
  assert.equal(
    pair('links', [{ label: 'Docs', url: 'https://e.org' }]),
    'links:\n  - label: Docs\n    url: https://e.org'
  );
});

test('pair renders multi-line prose as a literal block scalar', () => {
  const rendered = pair('summary', 'first line\nsecond line   ');
  assert.equal(rendered, 'summary: |-\n  first line\n  second line');
});

test('frontMatter round-trips through a YAML parser', () => {
  const text = frontMatter([
    ['layout', 'entry'],
    ['title', 'A: tricky "title" — with #hash'],
    ['slug', 'a-tricky-title'],
    ['published', '2026-08-17'],
    ['featured', false],
    ['thumbnail', ''],
    ['area', ['Epidemiology & surveillance', 'Data & informatics']],
    ['screenshots', [{ src: '/catalog/a/screenshots/01.png', alt: 'Queue view' }]],
    ['resources', [{ label: 'Report', url: 'https://e.org/r.pdf' }]],
    ['impact', ''],
    ['count', 12],
    ['story', 'line one\nline two'],
  ]);

  const parsed = yaml.load(text.replace(/^---\n/, '').replace(/\n---\n$/, ''));
  assert.equal(parsed.title, 'A: tricky "title" — with #hash');
  assert.equal(parsed.published, '2026-08-17');
  assert.equal(parsed.featured, false);
  assert.deepEqual(parsed.area, ['Epidemiology & surveillance', 'Data & informatics']);
  assert.deepEqual(parsed.screenshots, [{ src: '/catalog/a/screenshots/01.png', alt: 'Queue view' }]);
  assert.deepEqual(parsed.resources, [{ label: 'Report', url: 'https://e.org/r.pdf' }]);
  assert.equal(parsed.impact, '');
  assert.equal(parsed.count, 12);
  assert.equal(parsed.story, 'line one\nline two');
  assert.match(text, /^---\n/);
  assert.match(text, /\n---\n$/);
});
