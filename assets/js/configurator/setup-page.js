/**
 * /setup/ — browser wizard.
 *
 * Vanilla ESM, no build step. All of the answers -> files logic lives in
 * ./core.js, which is the same module the Node CLI (`npm run setup`) uses, so
 * the terminal and the browser can never drift apart.
 *
 * The page never writes anything: it renders the files and hands them to the
 * admin to copy, download, or paste into GitHub's web editor.
 */

import {
  applyAnswers,
  contrastRatio,
  defaultConfig,
  githubEditFileUrl,
  isHexColor,
  renderFiles,
  snakeKey,
  validateSchema,
  FIELD_TYPES,
  RESERVED_KEYS,
} from './core.js';
import { presets } from './presets.js';

const STORAGE_KEY = 'catalog-setup-wizard-v1';
const STEPS = ['start', 'branding', 'modules', 'fields', 'review'];

const MODULE_HELP = {
  catalog: 'The browsable, filterable catalog of entries. This is the core of the site.',
  submit: 'A public submission form that opens a GitHub issue, which maintainers turn into a pull request.',
  carousel: 'A featured-entries carousel on the home page.',
  stats: 'Headline numbers (entry counts, contributing organizations) on the home page.',
  events: 'An events calendar rendered from _data/events.yml.',
  cohorts: 'Cohort / program-year pages with timelines and materials.',
  resources: 'A separate curated resource library from _data/resources.yml.',
};

const FILE_HELP = {
  '_data/site.yml': 'Branding, contact details and module toggles.',
  '_data/theme.yml': 'Colors, fonts and corner rounding.',
  '_data/schema.yml': 'The entry content model — fields, filters and cards.',
  '_data/navigation.yml': 'The header navigation, derived from your modules.',
  '_config.yml':
    'Jekyll build settings. Only the title and description lines change — if you have customised this file, edit those two lines on GitHub instead of pasting the whole thing.',
  '.github/ISSUE_TEMPLATE/new-entry.yml':
    'The GitHub issue form contributors fill in. Generated from the schema.',
};

const OPTION_TYPES = new Set(['select', 'multiselect']);

/* -------------------------------------------------------------------------- */
/* Small DOM helpers                                                          */
/* -------------------------------------------------------------------------- */

const $ = (selector, scope = document) => scope.querySelector(selector);

function el(tag, attrs = {}, children = []) {
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

function readEmbeddedJson(id) {
  const node = document.getElementById(id);
  if (!node) return null;
  try {
    const parsed = JSON.parse(node.textContent || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

const fallback = defaultConfig();

/** The site's live configuration, embedded by Liquid; falls back to defaults. */
const currentConfig = {
  site: readEmbeddedJson('current-config') || fallback.site,
  theme: readEmbeddedJson('current-theme') || fallback.theme,
  schema: readEmbeddedJson('current-schema') || fallback.schema,
};

const detectedRepository = (() => {
  const node = document.getElementById('current-repository');
  if (!node) return null;
  try {
    const value = JSON.parse(node.textContent || 'null');
    return typeof value === 'string' && value.includes('/') ? value : null;
  } catch {
    return null;
  }
})();

const startingPoints = [
  {
    id: 'current',
    name: 'Current site configuration',
    description: 'Start from what this site is running right now and change only what you need.',
    config: currentConfig,
  },
  ...presets,
];

const state = {
  step: 0,
  startId: 'current',
  answers: null,
  fields: null,
};

function baseConfigFor(startId) {
  const start = startingPoints.find((item) => item.id === startId) || startingPoints[0];
  const config = JSON.parse(JSON.stringify(start.config));
  // A hand-edited _data file can be missing pieces; fall back rather than crash.
  config.site = { ...fallback.site, ...(config.site || {}) };
  config.theme = { ...fallback.theme, ...(config.theme || {}) };
  config.schema = { ...fallback.schema, ...(config.schema || {}) };
  if (!Array.isArray(config.schema.fields)) config.schema.fields = fallback.schema.fields;
  if (!config.site.modules) config.site.modules = { ...fallback.site.modules };
  return config;
}

/** Reset the wizard's answers to a starting point's values. */
function loadStartingPoint(startId) {
  const base = baseConfigFor(startId);
  state.startId = startId;
  state.fields = base.schema.fields.map((field) => ({ ...field, enabled: true }));
  state.answers = {
    siteName: base.site.name,
    tagline: base.site.tagline,
    description: base.site.description,
    orgName: base.site.organization?.name ?? '',
    orgShort: base.site.organization?.short_name ?? '',
    orgUrl: base.site.organization?.url ?? '',
    contactEmail: base.site.organization?.contact_email ?? '',
    logoText: base.site.logo?.text ?? '',
    logoImage: base.site.logo?.image ?? '',
    repository: detectedRepository || base.site.github?.repository || '',
    branch: base.site.github?.branch ?? 'main',
    heroEyebrow: base.site.hero?.eyebrow ?? '',
    heroTitle: base.site.hero?.title ?? '',
    heroLead: base.site.hero?.lead ?? '',
    submitIntro: base.site.submit?.intro ?? '',
    submitFallbackEmail: base.site.submit?.fallback_email ?? '',
    footerAbout: base.site.footer?.about ?? '',
    copyright: base.site.footer?.copyright ?? '',
    primary: base.theme.colors?.primary ?? '',
    primaryDark: base.theme.colors?.primary_dark ?? '',
    secondary: base.theme.colors?.secondary ?? '',
    accent: base.theme.colors?.accent ?? '',
    headingFont: base.theme.fonts?.heading ?? 'Source Sans 3',
    bodyFont: base.theme.fonts?.body ?? 'Inter',
    googleFontsUrl: base.theme.fonts?.google_fonts_url ?? '',
    radius: base.theme.radius ?? 'soft',
    modules: { ...base.site.modules },
    entrySingular: base.schema.entry?.singular ?? 'Entry',
    entryPlural: base.schema.entry?.plural ?? 'Entries',
  };
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: state.step,
        startId: state.startId,
        answers: state.answers,
        fields: state.fields,
      })
    );
  } catch {
    /* private browsing / quota — the wizard still works, it just will not resume */
  }
}

function restore() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    stored = null;
  }
  if (!stored || !stored.answers || !Array.isArray(stored.fields)) {
    loadStartingPoint('current');
    return false;
  }
  state.step = Number.isInteger(stored.step) ? Math.min(Math.max(stored.step, 0), STEPS.length - 1) : 0;
  state.startId = stored.startId || 'current';
  state.answers = stored.answers;
  state.fields = stored.fields;
  if (!state.answers.modules || typeof state.answers.modules !== 'object') {
    state.answers.modules = { ...baseConfigFor(state.startId).site.modules };
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* Derived config                                                             */
/* -------------------------------------------------------------------------- */

/** Strip the wizard-only `enabled` flag and drop disabled fields. */
function schemaFields() {
  return state.fields
    .filter((field) => field.enabled !== false)
    .map((field) => {
      const out = {};
      for (const [key, value] of Object.entries(field)) {
        if (key === 'enabled') continue;
        if (value === '' && ['description', 'placeholder', 'section', 'filename'].includes(key)) continue;
        if (value === false && ['required', 'facet', 'card', 'search'].includes(key)) continue;
        out[key] = value;
      }
      return out;
    });
}

function buildConfig() {
  const base = baseConfigFor(state.startId);
  return applyAnswers(base, { ...state.answers, fields: schemaFields() });
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

const root = $('#wizard');
const stepNav = $('#wizard-steps');
const errorRegion = $('#wizard-errors');

function announce(messages) {
  errorRegion.replaceChildren();
  if (!messages || messages.length === 0) return;
  errorRegion.append(
    el('div', { class: 'card border-brand-accent' }, [
      el('div', { class: 'card-header bg-brand-accent/10' }, [
        el('p', {
          class: 'card-title',
          text: messages.length === 1 ? 'One problem to fix' : `${messages.length} problems to fix`,
        }),
      ]),
      el(
        'ul',
        { class: 'list-disc space-y-1 px-10 py-4 text-sm text-brand-ink' },
        messages.map((message) => el('li', { text: message }))
      ),
    ])
  );
}

function renderStepNav() {
  const labels = ['Start', 'Branding', 'Modules', 'Entry model', 'Review'];
  stepNav.replaceChildren(
    ...labels.map((label, index) =>
      el('button', {
        type: 'button',
        class: `filter-pill${index === state.step ? ' is-active' : ''}`,
        'aria-current': index === state.step ? 'step' : null,
        text: `${index + 1}. ${label}`,
        onclick: () => goTo(index),
      })
    )
  );
}

function goTo(index) {
  if (index > state.step && !validateStep(state.step)) return;
  state.step = Math.min(Math.max(index, 0), STEPS.length - 1);
  save();
  render();
  const heading = $('#step-heading');
  if (heading) heading.focus();
}

/** Returns true when the current step is complete enough to move on. */
function validateStep(index) {
  const problems = [];
  if (STEPS[index] === 'branding') {
    if (!String(state.answers.siteName || '').trim()) problems.push('Site name is required.');
    if (!String(state.answers.orgName || '').trim()) problems.push('Organization name is required.');
    if (state.answers.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.answers.contactEmail)) {
      problems.push('Contact email does not look like an email address.');
    }
    if (state.answers.repository && !/^[\w.-]+\/[\w.-]+$/.test(state.answers.repository)) {
      problems.push('GitHub repository must be in the form owner/repo.');
    }
    for (const [key, label] of [
      ['primary', 'Primary'],
      ['primaryDark', 'Primary dark'],
      ['secondary', 'Secondary'],
      ['accent', 'Accent'],
    ]) {
      if (!isHexColor(state.answers[key]))
        problems.push(`${label} color must be a 6-digit hex value like #1D4E89.`);
    }
  }
  if (STEPS[index] === 'fields') {
    if (!String(state.answers.entrySingular || '').trim())
      problems.push('The singular entry name is required.');
    if (!String(state.answers.entryPlural || '').trim()) problems.push('The plural entry name is required.');
    problems.push(...validateSchema({ fields: schemaFields() }));
  }
  announce(problems);
  return problems.length === 0;
}

/* --- step 1: starting point ------------------------------------------------ */

function renderStart() {
  return el('div', { class: 'space-y-4' }, [
    el('p', {
      class: 'section-lead',
      text: 'Pick a starting point. You can change everything afterwards — nothing is written until you copy the files to GitHub yourself.',
    }),
    el(
      'div',
      { class: 'grid gap-4 sm:grid-cols-2' },
      startingPoints.map((option) => {
        const selected = option.id === state.startId;
        return el(
          'button',
          {
            type: 'button',
            class: `card p-0 text-left transition hover:-translate-y-0.5 ${selected ? 'ring-4 ring-brand-primary/30 border-brand-primary' : ''}`,
            'aria-pressed': selected ? 'true' : 'false',
            onclick: () => {
              if (
                option.id !== state.startId &&
                !window.confirm(
                  `Start over from "${option.name}"? Any edits you have made in this wizard will be replaced.`
                )
              ) {
                return;
              }
              loadStartingPoint(option.id);
              save();
              render();
            },
          },
          [
            el('div', { class: 'card-header' }, [
              el('span', { class: 'eyebrow', text: selected ? 'Selected' : 'Starting point' }),
              el('p', { class: 'card-title', text: option.name }),
            ]),
            el('div', { class: 'px-6 py-4' }, [
              el('p', { class: 'text-sm text-brand-muted', text: option.description }),
            ]),
          ]
        );
      })
    ),
  ]);
}

/* --- step 2: branding ------------------------------------------------------ */

function textField(key, label, { help, type = 'text', textarea = false, placeholder = '' } = {}) {
  const id = `field-${key}`;
  const control = textarea
    ? el('textarea', { id, class: 'field-input', rows: 3, placeholder })
    : el('input', { id, class: 'field-input', type, placeholder });
  control.value = state.answers[key] ?? '';
  control.addEventListener('input', () => {
    state.answers[key] = control.value;
    save();
  });
  return el('div', {}, [
    el('label', { class: 'field-label', for: id, text: label }),
    help ? el('p', { class: 'field-help', text: help }) : null,
    control,
  ]);
}

function colorField(key, label, help) {
  const id = `field-${key}`;
  const text = el('input', {
    id,
    class: 'field-input !mt-0 font-mono',
    type: 'text',
    maxlength: 7,
    spellcheck: 'false',
  });
  const swatch = el('input', {
    class: 'h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-brand-line',
    type: 'color',
    'aria-label': `${label} color picker`,
  });
  text.value = state.answers[key] ?? '';
  swatch.value = isHexColor(state.answers[key]) ? state.answers[key] : '#000000';
  const sync = (value) => {
    state.answers[key] = value;
    if (isHexColor(value)) swatch.value = value;
    save();
    renderPalette();
  };
  text.addEventListener('input', () => sync(text.value.trim()));
  swatch.addEventListener('input', () => {
    text.value = swatch.value;
    sync(swatch.value);
  });
  return el('div', {}, [
    el('label', { class: 'field-label', for: id, text: label }),
    help ? el('p', { class: 'field-help', text: help }) : null,
    el('div', { class: 'mt-2 flex items-center gap-3' }, [swatch, text]),
  ]);
}

function selectField(key, label, options, help) {
  const id = `field-${key}`;
  const select = el(
    'select',
    { id, class: 'field-input' },
    options.map((option) => el('option', { value: option.value, text: option.label }))
  );
  select.value = state.answers[key] ?? options[0].value;
  select.addEventListener('change', () => {
    state.answers[key] = select.value;
    save();
  });
  return el('div', {}, [
    el('label', { class: 'field-label', for: id, text: label }),
    help ? el('p', { class: 'field-help', text: help }) : null,
    select,
  ]);
}

let paletteNode = null;

function renderPalette() {
  if (!paletteNode) return;
  const { primary, primaryDark, secondary, accent } = state.answers;
  const base = baseConfigFor(state.startId).theme.colors;
  const swatches = [
    ['Primary', primary],
    ['Primary dark', primaryDark],
    ['Secondary', secondary],
    ['Accent', accent],
    ['Card', base.card],
    ['Surface', base.surface],
  ];
  const inkOnCard = contrastRatio(base.ink, base.card);
  const onDarkOnPrimaryDark = contrastRatio(base.on_dark, primaryDark);
  const checks = [
    ['Body text on cards', inkOnCard],
    ['Text on the dark hero/footer', onDarkOnPrimaryDark],
  ];

  paletteNode.replaceChildren(
    el(
      'div',
      { class: 'flex flex-wrap gap-3' },
      swatches.map(([name, value]) =>
        el('div', { class: 'flex items-center gap-2' }, [
          el('span', {
            class: 'inline-block h-8 w-8 rounded-lg border border-brand-line',
            style: `background:${isHexColor(value) ? value : 'transparent'}`,
            'aria-hidden': 'true',
          }),
          el('span', { class: 'text-xs text-brand-muted' }, [
            el('span', { class: 'block font-semibold text-brand-ink', text: name }),
            el('span', { class: 'font-mono', text: value || '—' }),
          ]),
        ])
      )
    ),
    el(
      'ul',
      { class: 'mt-4 space-y-1 text-sm' },
      checks.map(([name, ratio]) => {
        if (ratio === null)
          return el('li', {
            class: 'text-brand-muted',
            text: `${name}: enter a valid hex color to check contrast.`,
          });
        const ok = ratio >= 4.5;
        return el('li', { class: ok ? 'text-brand-ink' : 'font-semibold text-brand-accent' }, [
          el('span', { text: `${name}: ${ratio.toFixed(1)}:1 — ` }),
          el('span', {
            text: ok
              ? 'passes WCAG AA.'
              : 'below the 4.5:1 minimum. Darken the background or lighten the text.',
          }),
        ]);
      })
    )
  );
}

function renderBranding() {
  paletteNode = el('div', { class: 'px-6 py-5' });
  const node = el('div', { class: 'space-y-6' }, [
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'Site & organization' }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        textField('siteName', 'Site name', { help: 'Shown in the header and browser tab.' }),
        textField('tagline', 'Tagline', { help: 'One short line under the site name.' }),
      ]),
      textField('description', 'Description', {
        textarea: true,
        help: 'Used for search engines and the RSS feed.',
      }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        textField('orgName', 'Organization name'),
        textField('orgShort', 'Short name / initials', { help: 'Used in tight spaces.' }),
        textField('logoText', 'Logo text mark', { help: 'Shown when no logo image is set.' }),
        textField('logoImage', 'Logo image path', { help: 'Optional, e.g. /assets/images/logo.svg' }),
        textField('orgUrl', 'Organization website', { type: 'url' }),
        textField('contactEmail', 'Contact email', { type: 'email' }),
      ]),
    ]),
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'GitHub' }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        textField('repository', 'Repository', {
          help: 'owner/repo — used for submission links and edit links.',
          placeholder: 'owner/repo',
        }),
        textField('branch', 'Branch', { help: 'The branch GitHub Pages builds from.' }),
      ]),
    ]),
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'Colors & type' }),
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        colorField('primary', 'Primary', 'Buttons, links, active states.'),
        colorField('primaryDark', 'Primary dark', 'Hero and footer background.'),
        colorField('secondary', 'Secondary', 'Supporting badges.'),
        colorField('accent', 'Accent', 'Warm highlights.'),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-header' }, [
          el('p', { class: 'card-title', text: 'Palette preview & contrast' }),
        ]),
        paletteNode,
      ]),
      el('div', { class: 'grid gap-4 sm:grid-cols-3' }, [
        selectField('headingFont', 'Heading font', [
          { value: 'Source Sans 3', label: 'Source Sans 3 (bundled)' },
          { value: 'Inter', label: 'Inter (bundled)' },
        ]),
        selectField('bodyFont', 'Body font', [
          { value: 'Inter', label: 'Inter (bundled)' },
          { value: 'Source Sans 3', label: 'Source Sans 3 (bundled)' },
        ]),
        selectField('radius', 'Corner rounding', [
          { value: 'sharp', label: 'Sharp' },
          { value: 'soft', label: 'Soft' },
          { value: 'round', label: 'Round' },
        ]),
      ]),
      textField('googleFontsUrl', 'Google Fonts URL', {
        type: 'url',
        help: 'Only needed if you replace a bundled font with another family. Paste the href from fonts.google.com.',
      }),
    ]),
    el('fieldset', { class: 'space-y-4' }, [
      el('legend', { class: 'section-title', text: 'Home page & footer copy' }),
      textField('heroEyebrow', 'Eyebrow', { help: 'Small line above the headline.' }),
      textField('heroTitle', 'Headline'),
      textField('heroLead', 'Lead paragraph', { textarea: true }),
      textField('submitIntro', 'Submission page intro', { textarea: true }),
      textField('footerAbout', 'Footer about', { textarea: true }),
      textField('copyright', 'Copyright holder'),
    ]),
  ]);
  renderPalette();
  return node;
}

/* --- step 3: modules ------------------------------------------------------- */

function renderModules() {
  return el('fieldset', { class: 'space-y-3' }, [
    el('legend', { class: 'section-title', text: 'Modules' }),
    el('p', {
      class: 'section-lead',
      text: 'Turn sections of the site on or off. Navigation and the home page adapt automatically.',
    }),
    ...Object.keys(state.answers.modules).map((key) => {
      const id = `module-${key}`;
      const input = el('input', {
        id,
        type: 'checkbox',
        class: 'mt-1 h-4 w-4 rounded border-brand-line text-brand-primary focus:ring-brand-primary/30',
      });
      input.checked = Boolean(state.answers.modules[key]);
      input.addEventListener('change', () => {
        state.answers.modules[key] = input.checked;
        save();
      });
      return el(
        'div',
        { class: 'flex items-start gap-3 rounded-xl border border-brand-line bg-surface-card px-4 py-3' },
        [
          input,
          el('div', {}, [
            el('label', { class: 'field-label capitalize', for: id, text: key }),
            el('p', { class: 'field-help', text: MODULE_HELP[key] || '' }),
          ]),
        ]
      );
    }),
  ]);
}

/* --- step 4: entry model --------------------------------------------------- */

function fieldRow(field, index) {
  const rowId = `schema-field-${index}`;
  const isCore = field.key === 'title' || field.key === 'summary';

  const toggle = (prop, label) => {
    const id = `${rowId}-${prop}`;
    const input = el('input', {
      id,
      type: 'checkbox',
      class: 'h-4 w-4 rounded border-brand-line text-brand-primary focus:ring-brand-primary/30',
    });
    input.checked = Boolean(field[prop]);
    input.disabled = isCore && prop === 'required';
    input.addEventListener('change', () => {
      field[prop] = input.checked;
      save();
    });
    return el('label', { class: 'inline-flex items-center gap-1.5 text-xs text-brand-muted', for: id }, [
      input,
      el('span', { text: label }),
    ]);
  };

  const labelInput = el('input', { id: `${rowId}-label`, class: 'field-input !mt-0', type: 'text' });
  labelInput.value = field.label ?? '';
  labelInput.addEventListener('input', () => {
    field.label = labelInput.value;
    save();
  });

  const enabled = el('input', {
    id: `${rowId}-enabled`,
    type: 'checkbox',
    class: 'h-4 w-4 rounded border-brand-line text-brand-primary focus:ring-brand-primary/30',
  });
  enabled.checked = field.enabled !== false;
  enabled.disabled = isCore;
  enabled.addEventListener('change', () => {
    field.enabled = enabled.checked;
    save();
    render();
  });

  const children = [
    el('div', { class: 'flex flex-wrap items-center gap-3' }, [
      el(
        'label',
        { class: 'inline-flex items-center gap-2 text-xs text-brand-muted', for: `${rowId}-enabled` },
        [enabled, el('span', { text: isCore ? 'Always on' : 'Include' })]
      ),
      el('span', { class: 'chip-neutral font-mono', text: field.key }),
      el('span', { class: 'chip', text: field.type }),
      el('div', { class: 'ml-auto flex flex-wrap gap-3' }, [
        toggle('required', 'Required'),
        toggle('facet', 'Filter'),
        toggle('card', 'Show on card'),
        toggle('search', 'Searchable'),
      ]),
    ]),
    el('div', { class: 'mt-3' }, [
      el('label', { class: 'field-label', for: `${rowId}-label`, text: 'Label' }),
      el('p', {
        class: 'field-help',
        text: 'Shown in forms and on the entry page. Must be unique — the issue parser matches on it.',
      }),
      el('div', { class: 'mt-2' }, [labelInput]),
    ]),
  ];

  if (OPTION_TYPES.has(field.type)) {
    const optionsInput = el('textarea', {
      class: 'field-input',
      rows: 4,
      'aria-label': `Options for ${field.key}`,
    });
    optionsInput.value = (field.options || []).join('\n');
    optionsInput.addEventListener('input', () => {
      field.options = optionsInput.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      save();
    });
    children.push(
      el('div', { class: 'mt-3' }, [
        el('span', { class: 'field-label', text: 'Options' }),
        el('p', {
          class: 'field-help',
          text: 'One per line. These become the dropdown choices and the filter values.',
        }),
        optionsInput,
      ])
    );
  }

  if (!isCore) {
    children.push(
      el('div', { class: 'mt-3 text-right' }, [
        el('button', {
          type: 'button',
          class: 'text-xs font-semibold text-brand-muted underline hover:text-brand-primary',
          text: 'Remove this field',
          onclick: () => {
            if (!window.confirm(`Remove the "${field.label || field.key}" field?`)) return;
            state.fields.splice(index, 1);
            save();
            render();
          },
        }),
      ])
    );
  }

  return el('li', { class: `card p-5 ${field.enabled === false ? 'opacity-60' : ''}` }, children);
}

function renderAddField() {
  const labelInput = el('input', {
    id: 'new-field-label',
    class: 'field-input',
    type: 'text',
    placeholder: 'e.g. Budget range',
  });
  const keyInput = el('input', {
    id: 'new-field-key',
    class: 'field-input font-mono',
    type: 'text',
    placeholder: 'budget_range',
  });
  const typeSelect = el(
    'select',
    { id: 'new-field-type', class: 'field-input' },
    FIELD_TYPES.filter((type) => type !== 'markdown').map((type) => el('option', { value: type, text: type }))
  );
  let keyEdited = false;
  keyInput.addEventListener('input', () => {
    keyEdited = keyInput.value.trim() !== '';
  });
  labelInput.addEventListener('input', () => {
    if (!keyEdited) keyInput.value = snakeKey(labelInput.value);
  });

  return el('div', { class: 'card p-5' }, [
    el('p', { class: 'card-title', text: 'Add a field' }),
    el('div', { class: 'mt-3 grid gap-4 sm:grid-cols-3' }, [
      el('div', {}, [
        el('label', { class: 'field-label', for: 'new-field-label', text: 'Label' }),
        labelInput,
      ]),
      el('div', {}, [
        el('label', { class: 'field-label', for: 'new-field-key', text: 'Key' }),
        el('p', { class: 'field-help', text: 'snake_case, derived from the label.' }),
        keyInput,
      ]),
      el('div', {}, [el('label', { class: 'field-label', for: 'new-field-type', text: 'Type' }), typeSelect]),
    ]),
    el('div', { class: 'mt-4' }, [
      el('button', {
        type: 'button',
        class: 'btn-secondary',
        text: 'Add field',
        onclick: () => {
          const label = labelInput.value.trim();
          const key = snakeKey(keyInput.value || label);
          const type = typeSelect.value;
          const problems = [];
          if (!label) problems.push('Give the new field a label.');
          if (!key) problems.push('Give the new field a key.');
          if (RESERVED_KEYS.includes(key)) problems.push(`"${key}" is reserved and always present.`);
          if (state.fields.some((f) => f.key === key))
            problems.push(`"${key}" is already used by another field.`);
          if (problems.length) {
            announce(problems);
            return;
          }
          const field = { key, label, type, enabled: true };
          if (OPTION_TYPES.has(type)) field.options = ['Option one', 'Option two'];
          if (type === 'file') field.filename = `${key.replace(/_/g, '-')}.pdf`;
          // keep the markdown body last so the write-up stays at the bottom
          const bodyIndex = state.fields.findIndex((f) => f.type === 'markdown');
          if (bodyIndex === -1) state.fields.push(field);
          else state.fields.splice(bodyIndex, 0, field);
          announce([]);
          save();
          render();
        },
      }),
    ]),
  ]);
}

function renderFields() {
  return el('div', { class: 'space-y-5' }, [
    el('fieldset', { class: 'grid gap-4 sm:grid-cols-2' }, [
      el('legend', { class: 'section-title', text: 'What is an entry called?' }),
      textField('entrySingular', 'Singular', { help: 'e.g. Use case, Resource, Team project.' }),
      textField('entryPlural', 'Plural', { help: 'Used for the catalog navigation label.' }),
    ]),
    el('div', {}, [
      el('h3', { class: 'section-title', text: 'Fields' }),
      el('p', {
        class: 'section-lead',
        text: 'These become the entry front matter, the filter panel, the catalog cards and the submission forms. Title and summary are always present.',
      }),
    ]),
    el(
      'ul',
      { class: 'space-y-4' },
      state.fields.map((field, index) => fieldRow(field, index))
    ),
    renderAddField(),
  ]);
}

/* --- step 5: review -------------------------------------------------------- */

function copyButton(text) {
  const button = el('button', { type: 'button', class: 'btn-secondary', text: 'Copy' });
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press Ctrl/Cmd+C';
    }
    window.setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  });
  return button;
}

function downloadButton(relative, text) {
  const button = el('button', { type: 'button', class: 'btn-secondary', text: 'Download' });
  button.addEventListener('click', () => {
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = el('a', { href: url, download: relative.split('/').pop() });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return button;
}

function renderReview() {
  const config = buildConfig();
  const errors = validateSchema(config.schema);
  if (errors.length > 0) {
    announce(errors);
    return el('div', { class: 'card p-6' }, [
      el('p', {
        class: 'text-sm text-brand-ink',
        text: 'Fix the problems listed above on the "Entry model" step, then come back here.',
      }),
    ]);
  }
  announce([]);

  const files = renderFiles(config, { url: '', baseurl: '' });
  const repository = String(state.answers.repository || '').trim();
  const branch = String(state.answers.branch || 'main').trim() || 'main';

  return el('div', { class: 'space-y-6' }, [
    el('div', { class: 'card' }, [
      el('div', { class: 'card-header' }, [
        el('p', { class: 'card-title', text: 'How to publish these changes' }),
      ]),
      el('ol', { class: 'list-decimal space-y-2 px-10 py-5 text-sm text-brand-ink' }, [
        el('li', { text: 'Press Copy on a file below.' }),
        el('li', { text: 'Press "Open on GitHub" — it opens that file in GitHub\'s web editor.' }),
        el('li', {
          text: 'Select everything in the editor (Ctrl/Cmd+A), paste, then press "Commit changes".',
        }),
        el('li', {
          text: 'Repeat for each file. The site rebuilds automatically, usually within a minute or two.',
        }),
      ]),
      el('p', {
        class: 'border-t border-brand-line px-6 py-4 text-xs text-brand-muted',
        text: 'GitHub cannot pre-fill its editor for files that already exist, so the copy-and-paste step is unavoidable. Download works too if you prefer to commit from your own machine.',
      }),
    ]),
    ...Object.entries(files).map(([relative, text]) => {
      const editUrl = repository ? githubEditFileUrl(repository, branch, relative) : '';
      return el('section', { class: 'card' }, [
        el('div', { class: 'card-header flex flex-wrap items-center justify-between gap-3' }, [
          el('div', {}, [
            el('span', { class: 'eyebrow', text: 'File' }),
            el('p', { class: 'card-title font-mono', text: relative }),
            el('p', { class: 'field-help', text: FILE_HELP[relative] || '' }),
          ]),
          el('div', { class: 'flex flex-wrap gap-2' }, [
            copyButton(text),
            downloadButton(relative, text),
            editUrl
              ? el('a', {
                  class: 'btn-primary',
                  href: editUrl,
                  target: '_blank',
                  rel: 'noopener',
                  text: 'Open on GitHub',
                })
              : el('span', { class: 'chip-neutral', text: 'Set a repository to get a GitHub link' }),
          ]),
        ]),
        el('div', { class: 'max-h-80 overflow-auto' }, [
          el('pre', { class: 'px-6 py-4 text-xs leading-relaxed text-brand-ink' }, [el('code', { text })]),
        ]),
      ]);
    }),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

const STEP_META = [
  {
    title: 'Choose a starting point',
    lead: 'Every field on every later step is pre-filled from this choice.',
  },
  { title: 'Branding & contact', lead: 'Names, colors, type and the copy on the home page.' },
  { title: 'Modules', lead: 'Which sections of the site exist.' },
  { title: 'Entry model', lead: 'The fields every catalog entry has.' },
  { title: 'Review & publish', lead: 'Copy each file into GitHub. Nothing is changed until you commit.' },
];

function render() {
  renderStepNav();
  const meta = STEP_META[state.step];
  const body = [renderStart, renderBranding, renderModules, renderFields, renderReview][state.step]();

  root.replaceChildren(
    el('header', { class: 'mb-6' }, [
      el('p', { class: 'eyebrow', text: `Step ${state.step + 1} of ${STEPS.length}` }),
      el('h2', { id: 'step-heading', class: 'section-title', tabindex: '-1', text: meta.title }),
      el('p', { class: 'section-lead', text: meta.lead }),
    ]),
    body,
    el(
      'div',
      { class: 'mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-brand-line pt-6' },
      [
        state.step > 0
          ? el('button', {
              type: 'button',
              class: 'btn-secondary',
              text: 'Back',
              onclick: () => goTo(state.step - 1),
            })
          : el('span'),
        el('div', { class: 'flex flex-wrap gap-3' }, [
          el('button', {
            type: 'button',
            class: 'btn-secondary',
            text: 'Start over',
            onclick: () => {
              if (!window.confirm('Discard everything you have entered and start again?')) return;
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* ignore */
              }
              state.step = 0;
              loadStartingPoint('current');
              render();
            },
          }),
          state.step < STEPS.length - 1
            ? el('button', {
                type: 'button',
                class: 'btn-primary',
                text: 'Continue',
                onclick: () => goTo(state.step + 1),
              })
            : null,
        ]),
      ]
    )
  );
}

function boot() {
  if (!root) return;
  const resumed = restore();
  render();
  if (resumed) {
    const banner = $('#resume-banner');
    if (banner) banner.hidden = false;
  }
}

boot();
