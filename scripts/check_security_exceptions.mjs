#!/usr/bin/env node
/** Validate the owner, reason, and expiry required for any accepted security risk. */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import * as yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function exceptionFindings(document, today = new Date().toISOString().slice(0, 10)) {
  const findings = [];
  if (document?.schema_version !== 1) findings.push('schema_version must be 1');
  if (!Array.isArray(document?.exceptions)) return [...findings, 'exceptions must be a list'];
  document.exceptions.forEach((exception, index) => {
    const label = `exceptions[${index}]`;
    for (const field of ['id', 'package', 'severity', 'owner', 'reason', 'expires']) {
      if (typeof exception?.[field] !== 'string' || !exception[field].trim()) {
        findings.push(`${label}.${field} is required`);
      }
    }
    if (exception?.expires && !/^\d{4}-\d{2}-\d{2}$/.test(exception.expires)) {
      findings.push(`${label}.expires must use YYYY-MM-DD`);
    } else if (exception?.expires < today) {
      findings.push(`${label} expired on ${exception.expires}`);
    }
  });
  return findings;
}

function main() {
  const document = yaml.load(fs.readFileSync(path.join(ROOT, 'quality', 'security-exceptions.yml'), 'utf8'));
  const findings = exceptionFindings(document);
  if (findings.length > 0) {
    for (const finding of findings) console.error(`FAIL  ${finding}`);
    return 1;
  }
  console.log(`Security exception register is valid (${document.exceptions.length} active).`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
