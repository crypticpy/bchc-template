/**
 * Per-step validation.
 *
 * Every problem carries the id of the control it belongs to where one exists,
 * so the error summary can link straight to it. Schema problems also open the
 * field row they blame, so following the link lands on an expanded row.
 */

import { COLOR_QUESTIONS, isHexColor, validateSchema } from '../core.js';
import { expandField, fieldToggleId } from '../steps/field-rows.js';
import { answerFieldId } from './controls.js';
import { announce } from './errors.js';
import { enabledFields, schemaFields, state, STEPS } from './state.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPOSITORY = /^[\w.-]+\/[\w.-]+$/;

/** @returns {import('./errors.js').Problem[]} */
function brandingProblems() {
  const problems = [];
  const answers = state.answers;
  if (!String(answers.siteName || '').trim())
    problems.push({ message: 'Site name is required.', target: answerFieldId('siteName') });
  if (!String(answers.orgName || '').trim())
    problems.push({ message: 'Organization name is required.', target: answerFieldId('orgName') });
  if (answers.contactEmail && !EMAIL.test(answers.contactEmail)) {
    problems.push({
      message: 'Contact email does not look like an email address.',
      target: answerFieldId('contactEmail'),
    });
  }
  if (answers.repository && !REPOSITORY.test(answers.repository)) {
    problems.push({
      message: 'GitHub repository must be in the form owner/repo.',
      target: answerFieldId('repository'),
    });
  }
  for (const { key, label } of COLOR_QUESTIONS) {
    if (!isHexColor(answers[key])) {
      problems.push({
        message: `${label} must be a 6-digit hex value like #1D4E89.`,
        target: answerFieldId(key),
      });
    }
  }
  return problems;
}

/**
 * Schema errors, mapped back onto the field row that caused them. Errors are
 * reported against the *enabled* fields, in the same order `schemaFields()`
 * emits them, so the index in `fields[N]` indexes that list.
 * @returns {import('./errors.js').Problem[]}
 */
function schemaProblems() {
  const fields = enabledFields();
  return validateSchema({ fields: schemaFields() }).map((message) => {
    const index = /^fields\[(\d+)\]/.exec(message);
    const field = index ? fields[Number(index[1])] : null;
    if (!field || !field.key) return message;
    expandField(field.key);
    return { message, target: fieldToggleId(field.key) };
  });
}

/** @returns {import('./errors.js').Problem[]} */
function entryModelProblems() {
  const problems = [];
  if (!String(state.answers.entrySingular || '').trim()) {
    problems.push({
      message: 'The singular entry name is required.',
      target: answerFieldId('entrySingular'),
    });
  }
  if (!String(state.answers.entryPlural || '').trim()) {
    problems.push({ message: 'The plural entry name is required.', target: answerFieldId('entryPlural') });
  }
  problems.push(...schemaProblems());
  return problems;
}

/**
 * Validate one step's answers and paint any problems via `announce()`.
 * @param {number} index step index (`STEPS[index]` selects the rule set).
 * @returns {boolean} true when the step is complete enough to move on.
 */
export function validateStep(index) {
  let problems = [];
  if (STEPS[index] === 'branding') problems = brandingProblems();
  else if (STEPS[index] === 'fields') problems = entryModelProblems();
  announce(problems);
  return problems.length === 0;
}
