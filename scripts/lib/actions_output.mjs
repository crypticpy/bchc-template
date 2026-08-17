/**
 * Writing step outputs from a script that handles issue text.
 *
 * `$GITHUB_OUTPUT` is a flat `key=value` / `key<<DELIM … DELIM` file, so any
 * value containing a newline can forge additional outputs — a workflow that
 * reads `steps.x.outputs.branch` would then act on a branch name the submitter
 * chose. Every value is therefore written as a heredoc whose delimiter is
 * random per write and generated after the issue text is already fixed, so it
 * cannot appear in the value being written.
 *
 * Same shape as the helper in scripts/new_entry_from_issue.mjs. Pure apart from
 * the append; a no-op outside Actions, so the scripts stay runnable by hand.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';

/**
 * Append a `key<<DELIM … DELIM` pair to $GITHUB_OUTPUT (no-op outside Actions).
 * @param {string} key
 * @param {unknown} value
 * @returns {void}
 */
export function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delimiter = `GHEOF_${key}_${crypto.randomBytes(8).toString('hex')}`;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${key}<<${delimiter}\n${String(value ?? '')}\n${delimiter}\n`
  );
}

/**
 * Report a fatal problem on stderr and in $GITHUB_OUTPUT, then exit.
 * @param {string} message
 * @returns {never}
 */
export function fail(message) {
  console.error(message);
  setOutput('error', message);
  process.exit(1);
}
