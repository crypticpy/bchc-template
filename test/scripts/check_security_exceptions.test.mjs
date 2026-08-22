import test from 'node:test';
import assert from 'node:assert/strict';

import { exceptionFindings } from '../../scripts/check_security_exceptions.mjs';

test('security exceptions require complete, unexpired accountability', () => {
  const document = {
    schema_version: 1,
    exceptions: [
      {
        id: 'GHSA-example',
        package: 'example',
        severity: 'high',
        owner: '@maintainer',
        reason: 'No patched version exists; feature disabled.',
        expires: '2026-08-21',
      },
    ],
  };
  assert.deepEqual(exceptionFindings(document, '2026-08-22'), ['exceptions[0] expired on 2026-08-21']);
  assert.deepEqual(exceptionFindings({ schema_version: 1, exceptions: [] }, '2026-08-22'), []);
});
