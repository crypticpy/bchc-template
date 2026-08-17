/**
 * Colour helpers used by the setup wizards and the preset contrast tests.
 * Light mode only — the template has no dark palette.
 */

/**
 * Parse `#rgb` / `#rrggbb`.
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}|null} 0-255 channels, or null.
 */
export function parseHexColor(hex) {
  const value = String(hex ?? '')
    .trim()
    .replace(/^#/, '');
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

/** `{r,g,b}` back to `#rrggbb`. */
export function toHexColor({ r, g, b }) {
  const channel = (value) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG 2.1 contrast ratio between two hex colours.
 * @returns {number|null} 1–21, or null when either colour is unparseable.
 */
export function contrastRatio(foreground, background) {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * WCAG AA for normal-size text (4.5:1). Large text and non-text contrast use
 * lower thresholds; pass `threshold` when checking those.
 */
export function meetsAA(foreground, background, threshold = 4.5) {
  const ratio = contrastRatio(foreground, background);
  return ratio !== null && ratio >= threshold;
}

/** True for a strict `#rrggbb` value — what the wizards accept. */
export function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value ?? '').trim());
}

/**
 * A darker companion for a primary colour, used as the hero/footer background
 * when the admin has not chosen one. Scales each channel toward black until the
 * result carries `on_dark` text at AA.
 *
 * @param {string} primary `#rrggbb`
 * @param {string} [onDark] the text colour that must sit on the result
 * @returns {string} `#rrggbb`, or the input when it cannot be parsed.
 */
export function derivePrimaryDark(primary, onDark = '#F7F9FC') {
  const rgb = parseHexColor(primary);
  if (!rgb) return String(primary ?? '');
  for (let factor = 0.62; factor >= 0.1; factor -= 0.04) {
    const candidate = toHexColor({ r: rgb.r * factor, g: rgb.g * factor, b: rgb.b * factor });
    if (meetsAA(onDark, candidate, 7)) return candidate;
  }
  return '#111827';
}
