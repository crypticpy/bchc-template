/**
 * Tiny DOM builder shared by the /setup/ wizard modules (browser only).
 *
 * `el('p', { class: 'x', text: 'hi', onclick: fn }, [child, …])`
 *  - `text` / `html` set content; every other key becomes an attribute
 *    (`true` → present, `false`/`null`/`undefined` → skipped);
 *  - `on*` keys with a function value become listeners.
 */

/**
 * Create an element.
 * @param {string} tag element name.
 * @param {Record<string, unknown>} [attrs] attributes / `text` / `html` / `on*` listeners.
 * @param {Array<Node|string|false|null|undefined>|Node|string} [children] appended in order; falsy entries skipped.
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'text') node.textContent = value;
    else if (name === 'html') node.innerHTML = value;
    else if (name.startsWith('on') && typeof value === 'function')
      node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}
