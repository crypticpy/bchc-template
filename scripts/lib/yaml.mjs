/**
 * A small, dependency-free YAML *emitter* for entry front matter.
 *
 * We only ever write a flat map whose values are scalars, string lists or
 * lists of flat maps ({label, url} / {src, alt}), so a full serializer is not
 * needed — and a hand-rolled one lets us keep multi-line prose readable as a
 * block scalar instead of a wall of `\n` escapes.
 *
 * Everything here is pure: no filesystem, no environment. See
 * test/scripts/yaml.test.mjs.
 */

/**
 * A plain (unquoted) scalar is only safe when it starts with a non-indicator
 * character, carries no `: ` or ` #` (which would start a mapping or comment)
 * and has no leading/trailing whitespace or control characters.
 */
const UNSAFE_PLAIN = [
  /^[\s\-?:,[\]{}#&*!|>'"%@`]/, // an indicator in first position
  /:(\s|$)/, //                    looks like a mapping key
  / #/, //                         looks like a comment
  /[\n\r\t]/, //                   needs escaping
  /\s$/, //                        trailing whitespace is silently eaten
];

/**
 * Escape a string for a double-quoted YAML scalar.
 * @param {string} value
 * @returns {string} the quoted scalar, including the surrounding quotes
 */
export function quote(value) {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

/**
 * Render one scalar value (string, number, boolean, null) as YAML.
 * Strings are double-quoted unless they are unambiguously safe as plain text.
 * @param {unknown} value
 * @returns {string}
 */
export function scalar(value) {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '""';

  const text = String(value);
  if (text === '') return '""';
  // Reserved words and number-lookalikes must stay quoted or YAML retypes them.
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(text)) return quote(text);
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(text)) return quote(text);
  // Dates and timestamps would be retyped to a Date by a YAML 1.1 loader.
  if (/^\d{4}-\d{1,2}-\d{1,2}([Tt ].*)?$/.test(text)) return quote(text);
  if (UNSAFE_PLAIN.some((pattern) => pattern.test(text))) return quote(text);
  return text;
}

/**
 * Render a multi-line string as a literal block scalar (`|-`), which keeps
 * prose readable in the generated file. Trailing whitespace is stripped per
 * line because YAML preserves it and editors strip it, which causes diff noise.
 * @param {string} key
 * @param {string} value
 * @param {string} indent
 * @returns {string}
 */
function blockScalar(key, value, indent) {
  const lines = String(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const body = lines.map((line) => (line === '' ? '' : `${indent}  ${line}`)).join('\n');
  return `${indent}${key}: |-\n${body}`;
}

/**
 * Render a `key: value` pair, choosing between plain scalar, block scalar,
 * a block list of scalars or a block list of maps.
 * @param {string} key
 * @param {unknown} value
 * @param {string} [indent]
 * @returns {string}
 */
export function pair(key, value, indent = '') {
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}${key}: []`;
    const items = value.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const keys = Object.keys(item).filter((k) => item[k] !== undefined && item[k] !== '');
        if (keys.length === 0) return `${indent}  - {}`;
        const [first, ...rest] = keys;
        const head = `${indent}  - ${first}: ${scalar(item[first])}`;
        const tail = rest.map((k) => `${indent}    ${k}: ${scalar(item[k])}`);
        return [head, ...tail].join('\n');
      }
      return `${indent}  - ${scalar(item)}`;
    });
    return `${indent}${key}:\n${items.join('\n')}`;
  }

  if (typeof value === 'string' && /\n/.test(value.trim()) ) {
    return blockScalar(key, value, indent);
  }

  return `${indent}${key}: ${scalar(value)}`;
}

/**
 * Serialize an ordered list of `[key, value]` entries as a Jekyll front matter
 * block, fences included, ending with a newline.
 * @param {Array<[string, unknown]>} entries
 * @returns {string}
 */
export function frontMatter(entries) {
  const lines = entries.map(([key, value]) => pair(key, value));
  return `---\n${lines.join('\n')}\n---\n`;
}
