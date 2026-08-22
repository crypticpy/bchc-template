import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSbom, gemComponents, npmComponents } from '../../scripts/sbom.mjs';

test('npm and gem lock entries become stable package URLs', () => {
  assert.equal(
    npmComponents({ packages: { 'node_modules/example': { version: '1.2.3', license: 'MIT' } } })[0].purl,
    'pkg:npm/example@1.2.3'
  );
  assert.equal(
    gemComponents('GEM\n  specs:\n    jekyll (4.4.1)\n      dependency\n\nPLATFORMS\n')[0].purl,
    'pkg:gem/jekyll@4.4.1'
  );
});

test('CycloneDX root depends on every locked component', () => {
  const sbom = buildSbom(
    { name: 'phct', version: '1.0.0' },
    { packages: { 'node_modules/example': { version: '1.2.3', license: 'MIT' } } },
    'GEM\n  specs:\n    jekyll (4.4.1)\n\nPLATFORMS\n'
  );
  assert.equal(sbom.bomFormat, 'CycloneDX');
  assert.equal(sbom.dependencies[0].dependsOn.length, 2);
});
