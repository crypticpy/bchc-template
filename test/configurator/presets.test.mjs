import test from 'node:test';
import assert from 'node:assert/strict';
import jsYaml from 'js-yaml';

import { presets } from '../../assets/js/configurator/presets.js';
import { checkSchema } from '../../assets/js/configurator/schema-validate.js';
import { renderFiles } from '../../assets/js/configurator/render-files.js';
import { applyAnswers, answersFromConfig } from '../../assets/js/configurator/answers.js';
import { contrastRatio, meetsAA } from '../../assets/js/configurator/color.js';

const EXPECTED_FILES = [
  '_data/site.yml',
  '_data/theme.yml',
  '_data/schema.yml',
  '_data/navigation.yml',
  '_config.yml',
  '.github/ISSUE_TEMPLATE/new-entry.yml',
];

for (const preset of presets) {
  test(`${preset.id}: the schema is valid`, () => {
    const result = checkSchema(preset.config.schema);
    assert.equal(result.ok, true, result.errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
  });

  test(`${preset.id}: every file renders and parses as YAML`, () => {
    const files = renderFiles(applyAnswers(preset.config, {}), { url: '', baseurl: '' });
    assert.deepEqual(Object.keys(files), EXPECTED_FILES);
    for (const [name, contents] of Object.entries(files)) {
      assert.doesNotThrow(() => jsYaml.load(contents), `${name} parses`);
      assert.ok(contents.endsWith('\n'), `${name} ends with a newline`);
    }
  });

  test(`${preset.id}: a rendered schema still validates after the YAML round trip`, () => {
    const files = renderFiles(applyAnswers(preset.config, {}));
    const reparsed = jsYaml.load(files['_data/schema.yml']);
    const result = checkSchema(reparsed);
    assert.equal(result.ok, true, result.errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
    assert.deepEqual(reparsed, preset.config.schema, 'nothing is lost in the round trip');
  });

  test(`${preset.id}: the schema uses the v2 vocabulary`, () => {
    const schema = preset.config.schema;
    assert.ok(Array.isArray(schema.groups) && schema.groups.length > 0, 'declares groups');
    for (const field of schema.fields) {
      assert.ok(field.group, `${field.key} belongs to a group`);
      assert.ok(Number.isInteger(field.weight), `${field.key} has a weight`);
      assert.ok(field.prompt, `${field.key} asks a question`);
    }
    for (const group of schema.groups) {
      if (group.placement === undefined) continue;
      assert.ok(['main', 'rail'].includes(group.placement), `group ${group.key} has a legal placement`);
    }
    // Every preset needs at least one rail group, or its entry pages render an
    // empty sidebar (the bug `placement` replaced a hardcoded 'reuse,contact').
    assert.ok(
      schema.groups.some((group) => group.placement === 'rail'),
      'at least one group renders in the entry-page rail'
    );
    const carded = schema.fields.filter((field) => typeof field.card === 'string');
    assert.ok(carded.length > 0, 'at least one field claims a card slot');
    for (const field of carded) {
      assert.ok(['badge', 'chip', 'meta', 'icon', 'line'].includes(field.card));
    }
  });

  test(`${preset.id}: option_meta stays inside the declared options`, () => {
    for (const field of preset.config.schema.fields) {
      if (!field.option_meta) continue;
      for (const option of Object.keys(field.option_meta)) {
        assert.ok(field.options.includes(option), `${field.key}: "${option}" is a real option`);
      }
    }
  });

  test(`${preset.id}: the palette meets WCAG AA`, () => {
    const c = preset.config.theme.colors;
    const pairs = [
      ['body text on the page', c.ink, c.surface],
      ['body text on a card', c.ink, c.card],
      ['secondary text on a card', c.muted, c.card],
      ['a link on a card', c.primary, c.card],
      ['label on a primary button', c.on_dark, c.primary],
      ['text on the dark banner', c.on_dark, c.primary_dark],
      ['a caution indicator on a card', c.warn, c.card],
      ['the supporting colour on a card', c.secondary, c.card],
    ];
    for (const [what, fg, bg] of pairs) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(
        ratio !== null && ratio >= 4.5,
        `${what}: ${fg} on ${bg} is ${ratio === null ? 'unparseable' : `${ratio.toFixed(2)}:1`}, needs 4.5:1`
      );
    }
    // Control outlines are non-text contrast: 3:1 is the bar.
    assert.ok(meetsAA(c.line_strong, c.card, 3), `control outlines: ${c.line_strong} on ${c.card} needs 3:1`);
  });

  test(`${preset.id}: answersFromConfig seeds every colour question`, () => {
    const answers = answersFromConfig(preset.config);
    for (const key of ['primary', 'primaryDark', 'secondary', 'accent', 'lineStrong', 'warn']) {
      assert.match(answers[key], /^#[0-9A-Fa-f]{6}$/, `${key} is a hex colour`);
    }
    assert.equal(answers.siteName, preset.config.site.name);
    assert.equal(answers.entrySingular, preset.config.schema.entry.singular);
  });
}

test('presets do not share mutable state', () => {
  const [first] = presets;
  const before = JSON.stringify(first.config.schema.fields[0]);
  applyAnswers(first.config, { siteName: 'Something else', fields: [] });
  assert.equal(JSON.stringify(first.config.schema.fields[0]), before);
});
