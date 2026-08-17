/**
 * Configurator core — pure ESM, zero dependencies.
 *
 * Runs unchanged in Node 20+ (scripts/setup.mjs, scripts/generate.mjs) and in
 * the browser (/setup/, via assets/js/configurator/setup-page.js). Nothing in
 * here touches the filesystem, the network or the DOM: every export is a pure
 * function that takes plain data and returns plain data or a string.
 */

/* -------------------------------------------------------------------------- */
/* Strings                                                                    */
/* -------------------------------------------------------------------------- */

/** URL-safe slug: lowercase, non-alphanumerics collapsed to single hyphens. */
export function slugify(str) {
  return String(str ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** snake_case front matter key derived from a human label. */
export function snakeKey(str) {
  const base = String(str ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) return '';
  return /^[0-9]/.test(base) ? `field_${base}` : base;
}

/* -------------------------------------------------------------------------- */
/* YAML serializer                                                            */
/* -------------------------------------------------------------------------- */

// Characters that make a plain scalar risky somewhere in YAML. Quoting more
// than strictly necessary is always safe; quoting less is not.
const YAML_SPECIAL = /[:#{}[\],&*!|>'"%@`]/;
const YAML_RESERVED_WORDS = /^(?:y|n|yes|no|true|false|on|off|null|~)$/i;
const YAML_NUMBERLIKE = /^[-+]?(?:\d[\d_]*\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const YAML_DATELIKE = /^\d{4}-\d{1,2}-\d{1,2}(?:[T ]|$)/;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function needsQuoting(str) {
  if (str === '') return true;
  if (str !== str.trim()) return true;
  if (YAML_SPECIAL.test(str)) return true;
  if (YAML_RESERVED_WORDS.test(str)) return true;
  if (YAML_NUMBERLIKE.test(str)) return true;
  if (YAML_DATELIKE.test(str)) return true;
  if (/^0[xXoObB]/.test(str)) return true;
  if (/^[-?]($|\s)/.test(str)) return true;
  if (/^[[\]{}>|%@`&*!]/.test(str)) return true;
  return false;
}

function doubleQuote(str) {
  return `"${String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`;
}

/** A string as an always-double-quoted YAML scalar. Exported for `_config.yml`. */
export function quoteYamlString(value) {
  return doubleQuote(String(value ?? ''));
}

function scalarToYaml(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : doubleQuote(String(value));
  const str = String(value);
  return needsQuoting(str) ? doubleQuote(str) : str;
}

/** `|` block scalar lines for a multi-line string. `prefix` is `key:` or `-`. */
function blockScalarLines(prefix, str, pad, step) {
  const childPad = pad + ' '.repeat(step);
  const trailing = /\n*$/.exec(str)[0].length;
  let chomp = '';
  let body = str;
  if (trailing === 0) chomp = '-';
  else if (trailing === 1) body = str.slice(0, -1);
  else {
    chomp = '+';
    body = str.slice(0, -1);
  }
  const lines = body.split('\n');
  const indentIndicator = /^[ \t]/.test(lines[0] ?? '') ? String(step) : '';
  const out = [`${pad}${prefix} |${indentIndicator}${chomp}`];
  for (const line of lines) out.push(line === '' ? '' : childPad + line);
  return out;
}

function emitMapping(obj, pad, out, step) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    emitEntry(key, value, pad, out, step);
  }
}

function emitEntry(key, value, pad, out, step) {
  const renderedKey = scalarToYaml(String(key));
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push(`${pad}${renderedKey}: []`);
      return;
    }
    out.push(`${pad}${renderedKey}:`);
    emitSequence(value, pad + ' '.repeat(step), out, step);
    return;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (keys.length === 0) {
      out.push(`${pad}${renderedKey}: {}`);
      return;
    }
    out.push(`${pad}${renderedKey}:`);
    emitMapping(value, pad + ' '.repeat(step), out, step);
    return;
  }
  if (typeof value === 'string' && value.includes('\n') && !value.includes('\r')) {
    out.push(...blockScalarLines(`${renderedKey}:`, value, pad, step));
    return;
  }
  out.push(`${pad}${renderedKey}: ${scalarToYaml(value)}`);
}

function emitSequence(arr, pad, out, step) {
  const marker = `-${' '.repeat(step - 1)}`;
  for (const item of arr) {
    if (isPlainObject(item) || Array.isArray(item)) {
      const nested = [];
      if (Array.isArray(item)) {
        if (item.length === 0) {
          out.push(`${pad}- []`);
          continue;
        }
        emitSequence(item, pad + ' '.repeat(step), nested, step);
      } else {
        const keys = Object.keys(item).filter((k) => item[k] !== undefined);
        if (keys.length === 0) {
          out.push(`${pad}- {}`);
          continue;
        }
        emitMapping(item, pad + ' '.repeat(step), nested, step);
      }
      nested[0] = pad + marker + nested[0].slice(pad.length + step);
      out.push(...nested);
      continue;
    }
    if (typeof item === 'string' && item.includes('\n') && !item.includes('\r')) {
      out.push(...blockScalarLines('-', item, pad, step));
      continue;
    }
    out.push(`${pad}${marker}${scalarToYaml(item)}`);
  }
}

/**
 * Serialize a plain JS value to YAML.
 * @param {*} value
 * @param {{header?: string, indent?: number}} [options]
 * @returns {string} YAML text ending in a newline.
 */
export function toYaml(value, options = {}) {
  const step = options.indent || 2;
  const lines = [];
  if (options.header) {
    for (const line of String(options.header).replace(/\n+$/, '').split('\n')) {
      lines.push(line === '' ? '#' : `# ${line}`);
    }
    lines.push('');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) lines.push('[]');
    else emitSequence(value, '', lines, step);
  } else if (isPlainObject(value)) {
    emitMapping(value, '', lines, step);
  } else if (typeof value === 'string' && value.includes('\n') && !value.includes('\r')) {
    lines.push(...blockScalarLines('', value, '', step).map((l, i) => (i === 0 ? l.trimStart() : l)));
  } else {
    lines.push(scalarToYaml(value));
  }
  return `${lines.join('\n')}\n`;
}

/* -------------------------------------------------------------------------- */
/* Schema validation                                                          */
/* -------------------------------------------------------------------------- */

export const FIELD_TYPES = [
  'text',
  'textarea',
  'markdown',
  'url',
  'email',
  'select',
  'multiselect',
  'list',
  'date',
  'number',
  'boolean',
  'file',
  'image',
];

export const RESERVED_KEYS = ['layout', 'slug', 'published', 'featured', 'thumbnail'];

const OPTION_TYPES = new Set(['select', 'multiselect']);

/**
 * @param {object} schema
 * @returns {string[]} human-readable errors; empty when the schema is valid.
 */
export function validateSchema(schema) {
  const errors = [];
  const fields = schema && Array.isArray(schema.fields) ? schema.fields : null;
  if (!fields) return ['schema.fields must be a list of field definitions.'];
  if (fields.length === 0) return ['schema.fields is empty — at least `title` and `summary` are required.'];

  const seenKeys = new Map();
  const seenLabels = new Map();
  let markdownCount = 0;

  fields.forEach((field, index) => {
    const where = `Field ${index + 1}`;
    if (!isPlainObject(field)) {
      errors.push(`${where}: each field must be a mapping with key/label/type.`);
      return;
    }
    const key = typeof field.key === 'string' ? field.key.trim() : '';
    const label = typeof field.label === 'string' ? field.label.trim() : '';
    const name = key || label || `#${index + 1}`;

    if (!key) errors.push(`${where}: missing \`key\`.`);
    else if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      errors.push(`"${key}": keys must be snake_case (lowercase letters, digits and underscores, starting with a letter).`);
    } else if (RESERVED_KEYS.includes(key)) {
      errors.push(`"${key}" is a reserved key and is always present — remove it from \`fields\`.`);
    } else if (seenKeys.has(key)) {
      errors.push(`"${key}" is used by more than one field (fields ${seenKeys.get(key) + 1} and ${index + 1}).`);
    } else {
      seenKeys.set(key, index);
    }

    if (!label) errors.push(`"${name}": missing \`label\`.`);
    else {
      const normalized = label.toLowerCase();
      if (seenLabels.has(normalized)) {
        errors.push(`Label "${label}" is used by more than one field — labels must be unique (they identify answers in the issue form).`);
      } else {
        seenLabels.set(normalized, index);
      }
    }

    const type = typeof field.type === 'string' ? field.type.trim() : '';
    if (!FIELD_TYPES.includes(type)) {
      errors.push(`"${name}": unknown type ${JSON.stringify(field.type ?? null)}. Use one of: ${FIELD_TYPES.join(', ')}.`);
      return;
    }

    if (type === 'markdown') markdownCount += 1;

    if (OPTION_TYPES.has(type)) {
      const options = Array.isArray(field.options) ? field.options.filter((o) => String(o ?? '').trim() !== '') : [];
      if (options.length === 0) errors.push(`"${name}": ${type} fields need a non-empty \`options\` list.`);
    }

    if (type === 'file' && !String(field.filename ?? '').trim()) {
      errors.push(`"${name}": file fields need a \`filename\` (e.g. deck.pdf) so contributors know what to upload.`);
    }
  });

  if (markdownCount > 1) {
    errors.push(`Only one field may use type \`markdown\` (it becomes the page body); found ${markdownCount}.`);
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

/** The configuration shipped in this repository's `_data/*.yml` files. */
export function defaultConfig() {
  return {
    site: {
      name: 'AI Use Case Catalog',
      tagline: 'Shared AI solutions from big-city health departments',
      description:
        'A shared catalog of AI use cases, tools, and lessons learned from Big Cities Health Coalition member health departments.',
      organization: {
        name: 'Big Cities Health Coalition',
        short_name: 'BCHC',
        url: 'https://www.bigcitieshealth.org',
        contact_email: 'info@bigcitieshealth.org',
      },
      logo: { image: '', text: 'BCHC' },
      github: { repository: 'crypticpy/bchc-template', branch: 'main' },
      modules: {
        catalog: true,
        submit: true,
        carousel: true,
        stats: true,
        events: false,
        cohorts: false,
        resources: false,
      },
      hero: {
        eyebrow: 'Big Cities Health Coalition · AI Community of Practice',
        title: 'What health departments are building with AI',
        lead: 'Browse real solutions from member cities — source code, cloud deployments, vendor implementations and write-ups — and share your own so others can learn, reuse and adapt.',
        primary_cta: { label: 'Browse the catalog', url: '/catalog/' },
        secondary_cta: { label: 'Share your use case', url: '/submit/' },
      },
      home: {
        featured_count: 6,
        recent_count: 6,
        highlights: [
          {
            eyebrow: "Reuse, don't rebuild",
            title: 'Start from what already works',
            body: 'Every entry links to code, deployments or vendor details so your team can evaluate and adapt quickly.',
          },
          {
            eyebrow: 'Learn from peers',
            title: 'Honest notes on what it took',
            body: 'Entries capture data sources, tools, staffing and lessons learned — not just the demo.',
          },
          {
            eyebrow: 'Contribute',
            title: 'Sharing takes five minutes',
            body: 'Fill out the submission form. Maintainers review it in a pull request and it goes live automatically.',
          },
        ],
      },
      submit: {
        intro:
          'Share an AI use case, tool or project with the coalition. Submissions open a GitHub issue for the maintainers to review; nothing is published until it is approved.',
        review_note:
          'Please do not include protected health information, credentials or non-public data. Link out to repositories and documents rather than pasting sensitive content.',
        fallback_email: 'info@bigcitieshealth.org',
      },
      footer: {
        about:
          "A collaborative catalog maintained by the coalition's AI community of practice. Content is contributed by member health departments and reviewed before publication.",
        links: [
          { label: 'Big Cities Health Coalition', url: 'https://www.bigcitieshealth.org' },
          { label: 'Submit an entry', url: '/submit/' },
          { label: 'Maintainer guide', url: 'https://github.com/crypticpy/bchc-template/blob/main/docs/admin-guide.md' },
        ],
        copyright: 'Big Cities Health Coalition',
      },
      analytics: { plausible_domain: '' },
    },
    theme: {
      colors: {
        primary: '#1D4E89',
        primary_dark: '#12305A',
        secondary: '#1B8A7A',
        accent: '#E07A2F',
        ink: '#1B2430',
        muted: '#5A6573',
        line: '#D9E0E8',
        surface: '#F5F7FA',
        card: '#FFFFFF',
        on_dark: '#F7F9FC',
      },
      fonts: { heading: 'Source Sans 3', body: 'Inter', google_fonts_url: '' },
      radius: 'soft',
    },
    schema: {
      entry: { singular: 'Use case', plural: 'Use cases', path: 'catalog', sort: 'published', sort_order: 'desc' },
      sections: { details: 'Details', links: 'Links & resources', contact: 'Contact' },
      fields: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'Automated 311 call triage with LLM classification',
          description: 'Short, descriptive name of the solution or project.',
        },
        {
          key: 'summary',
          label: 'One-sentence summary',
          type: 'textarea',
          required: true,
          description: 'One or two sentences shown on the catalog card. Plain language, no jargon.',
          placeholder:
            'Classifies incoming public health hotline calls by urgency and topic so nurses see the highest-priority cases first.',
        },
        {
          key: 'organization',
          label: 'Organization',
          type: 'text',
          required: true,
          facet: true,
          card: true,
          search: true,
          placeholder: 'Chicago Department of Public Health',
          description: 'Health department, city, or member organization sharing this entry.',
        },
        {
          key: 'solution_type',
          label: 'Solution type',
          type: 'select',
          required: true,
          facet: true,
          card: true,
          options: [
            'Source code (GitHub or similar)',
            'Cloud deployment (AWS, Azure, GCP)',
            'Vendor product or partnership',
            'Internal tool (no code shared)',
            'Playbook, policy or write-up',
          ],
          description: 'What kind of thing is being shared? Pick the closest match.',
        },
        {
          key: 'domain',
          label: 'Public health domain',
          type: 'multiselect',
          required: true,
          facet: true,
          card: true,
          options: [
            'Epidemiology & surveillance',
            'Communications & outreach',
            'Clinical & community services',
            'Environmental health',
            'Emergency preparedness',
            'Operations & administration',
            'Data, analytics & informatics',
            'Policy & planning',
          ],
          description: 'Select all that apply.',
        },
        {
          key: 'ai_tools',
          label: 'AI tools & models used',
          type: 'list',
          required: true,
          facet: true,
          card: true,
          search: true,
          placeholder: 'Azure OpenAI GPT-4o, LangChain, custom scikit-learn model',
          description: 'Comma-separated. Name the models, platforms or libraries that matter.',
        },
        {
          key: 'stage',
          label: 'Stage',
          type: 'select',
          required: true,
          facet: true,
          card: true,
          options: ['Idea / exploring', 'Pilot', 'In production', 'Paused or retired'],
          description: 'Where is this today?',
        },
        {
          key: 'repo_url',
          label: 'Source code repository',
          type: 'url',
          section: 'links',
          placeholder: 'https://github.com/your-org/your-project',
          description: 'Public GitHub / GitLab repository, if code is shared.',
        },
        {
          key: 'demo_url',
          label: 'Live deployment or demo',
          type: 'url',
          section: 'links',
          placeholder: 'https://example.org/app',
        },
        {
          key: 'docs_url',
          label: 'Documentation or write-up',
          type: 'url',
          section: 'links',
          placeholder: 'https://example.org/docs',
          description: 'Slides, a report, a blog post, or a vendor case study.',
        },
        {
          key: 'vendor',
          label: 'Vendor or partner',
          type: 'text',
          section: 'details',
          facet: true,
          card: false,
          search: true,
          placeholder: 'Acme Health AI',
          description: 'If a vendor built or hosts the solution, name them here.',
        },
        {
          key: 'data_sources',
          label: 'Data sources',
          type: 'list',
          section: 'details',
          search: true,
          placeholder: 'Immunization registry, 311 call transcripts, ESSENCE',
          description: 'Comma-separated. What data does the solution use? Public / de-identified only.',
        },
        {
          key: 'contact_name',
          label: 'Contact name',
          type: 'text',
          required: true,
          section: 'contact',
          placeholder: 'Jordan Lee',
          description: 'Person others can reach out to with questions.',
        },
        {
          key: 'contact_email',
          label: 'Contact email',
          type: 'email',
          required: true,
          section: 'contact',
          placeholder: 'jordan.lee@city.gov',
        },
        {
          key: 'deck_pdf',
          label: 'Slide deck or one-pager (PDF)',
          type: 'file',
          filename: 'deck.pdf',
          thumbnail: true,
          section: 'links',
          description:
            'Optional. After the pull request is created, upload deck.pdf into the entry folder and a thumbnail is generated automatically.',
        },
        {
          key: 'body',
          label: 'Full write-up',
          type: 'markdown',
          required: true,
          description:
            'Markdown is supported. Suggested headings: Problem, Approach, What it took (data, staffing, cost), Results, Lessons learned, How to reuse.',
          placeholder:
            '## Problem\n\n## Approach\n\n## What it took\n\n## Results\n\n## Lessons learned\n\n## How to reuse this\n',
        },
      ],
    },
    navigation: [
      { label: 'Home', url: '/' },
      { label: 'Catalog', url: '/catalog/', module: 'catalog' },
      { label: 'Events', url: '/events/', module: 'events' },
      { label: 'Cohorts', url: '/cohorts/', module: 'cohorts' },
      { label: 'Resources', url: '/resources/', module: 'resources' },
      { label: 'About', url: '/about/' },
      { label: 'Submit', url: '/submit/', module: 'submit', style: 'button' },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Answers -> config                                                          */
/* -------------------------------------------------------------------------- */

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/** Assign only when the answer is present (undefined/null keep the base value). */
function pick(answers, key, fallback) {
  const value = answers[key];
  return value === undefined || value === null ? fallback : value;
}

/**
 * Primary navigation derived from the module toggles and the entry labels.
 * Items carrying `module` are hidden by the layouts when that module is off.
 */
export function navigationFromSite(site, schema) {
  const plural = String(schema?.entry?.plural ?? 'Catalog').trim() || 'Catalog';
  const path = String(schema?.entry?.path ?? 'catalog').trim() || 'catalog';
  return [
    { label: 'Home', url: '/' },
    { label: plural, url: `/${path}/`, module: 'catalog' },
    { label: 'Events', url: '/events/', module: 'events' },
    { label: 'Cohorts', url: '/cohorts/', module: 'cohorts' },
    { label: 'Resources', url: '/resources/', module: 'resources' },
    { label: 'About', url: '/about/' },
    { label: 'Submit', url: '/submit/', module: 'submit', style: 'button' },
  ];
}

/**
 * Merge a flat answers object into a base config.
 * @returns {{site: object, theme: object, schema: object, navigation: object[]}}
 */
export function applyAnswers(baseConfig, answers = {}) {
  const base = clone(baseConfig || defaultConfig());
  const site = base.site;
  const theme = base.theme;
  const schema = base.schema;

  site.name = pick(answers, 'siteName', site.name);
  site.tagline = pick(answers, 'tagline', site.tagline);
  site.description = pick(answers, 'description', site.description);

  site.organization = site.organization || {};
  site.organization.name = pick(answers, 'orgName', site.organization.name);
  site.organization.short_name = pick(answers, 'orgShort', site.organization.short_name);
  site.organization.url = pick(answers, 'orgUrl', site.organization.url);
  site.organization.contact_email = pick(answers, 'contactEmail', site.organization.contact_email);

  site.logo = site.logo || {};
  site.logo.image = pick(answers, 'logoImage', site.logo.image);
  site.logo.text = pick(answers, 'logoText', site.logo.text);

  site.github = site.github || {};
  site.github.repository = pick(answers, 'repository', site.github.repository);
  site.github.branch = pick(answers, 'branch', site.github.branch);

  if (isPlainObject(answers.modules)) {
    site.modules = { ...site.modules, ...clone(answers.modules) };
  }

  site.hero = site.hero || {};
  site.hero.eyebrow = pick(answers, 'heroEyebrow', site.hero.eyebrow);
  site.hero.title = pick(answers, 'heroTitle', site.hero.title);
  site.hero.lead = pick(answers, 'heroLead', site.hero.lead);

  site.submit = site.submit || {};
  site.submit.intro = pick(answers, 'submitIntro', site.submit.intro);
  site.submit.fallback_email = pick(answers, 'submitFallbackEmail', site.submit.fallback_email);

  site.footer = site.footer || {};
  site.footer.about = pick(answers, 'footerAbout', site.footer.about);
  site.footer.copyright = pick(answers, 'copyright', site.footer.copyright);

  theme.colors = theme.colors || {};
  theme.colors.primary = pick(answers, 'primary', theme.colors.primary);
  theme.colors.primary_dark = pick(answers, 'primaryDark', theme.colors.primary_dark);
  theme.colors.secondary = pick(answers, 'secondary', theme.colors.secondary);
  theme.colors.accent = pick(answers, 'accent', theme.colors.accent);

  theme.fonts = theme.fonts || {};
  theme.fonts.heading = pick(answers, 'headingFont', theme.fonts.heading);
  theme.fonts.body = pick(answers, 'bodyFont', theme.fonts.body);
  theme.fonts.google_fonts_url = pick(answers, 'googleFontsUrl', theme.fonts.google_fonts_url);
  theme.radius = pick(answers, 'radius', theme.radius);

  schema.entry = schema.entry || {};
  schema.entry.singular = pick(answers, 'entrySingular', schema.entry.singular);
  schema.entry.plural = pick(answers, 'entryPlural', schema.entry.plural);
  if (isPlainObject(answers.sections)) schema.sections = clone(answers.sections);
  if (Array.isArray(answers.fields)) schema.fields = clone(answers.fields);

  // Hero and footer CTAs follow the entry path so links never dangle.
  const entryPath = String(schema.entry.path || 'catalog');
  if (site.hero.primary_cta) site.hero.primary_cta.url = `/${entryPath}/`;

  return { site, theme, schema, navigation: navigationFromSite(site, schema) };
}

/* -------------------------------------------------------------------------- */
/* GitHub issue form                                                          */
/* -------------------------------------------------------------------------- */

const INPUT_TYPES = new Set(['text', 'url', 'email', 'date', 'number', 'image']);

function capitalizeFirst(str) {
  const s = String(str ?? '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function lowercaseFirst(str) {
  const s = String(str ?? '').trim();
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/**
 * Build `.github/ISSUE_TEMPLATE/new-entry.yml` from the content model.
 * Field labels are emitted verbatim — scripts/new_entry_from_issue.mjs matches
 * the rendered `### <label>` headings back to schema keys.
 */
export function issueTemplateFromSchema(schema, site = {}) {
  const singular = String(schema?.entry?.singular ?? 'Entry').trim() || 'Entry';
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const siteName = String(site?.name ?? '').trim();

  const body = [];

  const reviewNote = String(site?.submit?.review_note ?? '').trim();
  if (reviewNote) {
    body.push({ type: 'markdown', attributes: { value: reviewNote } });
  }

  for (const field of fields) {
    if (!isPlainObject(field) || field.form === false) continue;
    const key = String(field.key ?? '').trim();
    const label = String(field.label ?? '').trim();
    const type = String(field.type ?? '').trim();
    if (!key || !label || !type) continue;

    if (type === 'file') {
      const filename = String(field.filename ?? `${key}.pdf`).trim();
      // Skip a description that already repeats the upload instruction.
      const note = String(field.description ?? '').trim();
      const extra = note && !note.includes(filename) ? ` ${note}` : '';
      body.push({
        type: 'markdown',
        attributes: {
          value:
            `**${label}** — GitHub issue forms cannot accept file uploads. ` +
            `After the pull request is created, upload \`${filename}\` into the entry folder.${extra}`,
        },
      });
      continue;
    }

    const attributes = { label };
    let description = String(field.description ?? '').trim();
    if (type === 'list') {
      description = `${description ? `${description} ` : ''}(one per line or comma-separated)`;
    }
    if (description) attributes.description = description;

    const placeholder = String(field.placeholder ?? '');
    const item = { type: 'input', id: key, attributes };

    if (INPUT_TYPES.has(type)) {
      if (placeholder.trim()) attributes.placeholder = placeholder;
    } else if (type === 'textarea' || type === 'list') {
      item.type = 'textarea';
      if (placeholder.trim()) attributes.placeholder = placeholder;
    } else if (type === 'markdown') {
      item.type = 'textarea';
      if (placeholder.includes('\n')) attributes.value = placeholder;
      else if (placeholder.trim()) attributes.placeholder = placeholder;
    } else if (type === 'select' || type === 'multiselect') {
      item.type = 'dropdown';
      if (type === 'multiselect') attributes.multiple = true;
      attributes.options = (Array.isArray(field.options) ? field.options : [])
        .map((option) => String(option))
        .filter((option) => option.trim() !== '');
    } else if (type === 'boolean') {
      item.type = 'dropdown';
      attributes.options = ['Yes', 'No'];
    } else {
      if (placeholder.trim()) attributes.placeholder = placeholder;
    }

    item.validations = { required: field.required === true };
    body.push(item);
  }

  const template = {
    name: `Submit a ${lowercaseFirst(singular)} (creates PR)`,
    description:
      String(site?.submit?.intro ?? '').trim() ||
      `Propose a new ${lowercaseFirst(singular)}${siteName ? ` for ${siteName}` : ''}. A maintainer reviews it as a pull request.`,
    title: `[${capitalizeFirst(singular)}] `,
    labels: ['content:new-entry'],
    body,
  };

  return toYaml(template, {
    header:
      'GitHub issue form for new entries.\n' +
      'GENERATED FILE — do not edit by hand.\n' +
      'Regenerate with `npm run generate` after changing _data/schema.yml.',
  });
}

/* -------------------------------------------------------------------------- */
/* _config.yml                                                                */
/* -------------------------------------------------------------------------- */

/** Full `_config.yml` text with title/description/url/baseurl substituted. */
export function jekyllConfig(site = {}, options = {}) {
  const title = quoteYamlString(site?.name ?? '');
  const description = quoteYamlString(site?.description ?? '');
  const url = quoteYamlString(options.url ?? '');
  const baseurl = quoteYamlString(options.baseurl ?? '');

  return `# Jekyll configuration.
# Most site-specific settings live in _data/site.yml (branding, modules, labels),
# _data/theme.yml (colors, fonts) and _data/schema.yml (the entry content model).
# Keep this file to build mechanics. \`title\`/\`description\` here are fallbacks for
# SEO tags; the setup wizard keeps them in sync with _data/site.yml.

title: ${title}
description: ${description}
url: ${url}
baseurl: ${baseurl}
theme: null
timezone: "America/Chicago"
markdown: kramdown
permalink: pretty
future: false

exclude:
  - node_modules
  - vendor
  - README.md
  - CLAUDE.md
  - AGENTS.md
  - LICENSE
  - package-lock.json
  - package.json
  - tailwind.config.js
  - postcss.config.js
  - assets/css/tailwind.css
  - scripts
  - docs
  - Gemfile
  - Gemfile.lock
  - .ruby-version

defaults:
  - scope:
      path: "catalog"
    values:
      layout: entry
  - scope:
      path: "cohorts"
    values:
      layout: cohort

plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-include-cache

sass:
  style: compressed
`;
}

/**
 * Update only the top-level `title` / `description` (and optionally `url` /
 * `baseurl`) lines of an existing `_config.yml`, leaving comments, ordering and
 * every other build setting untouched. Preferred over overwriting the file.
 *
 * @returns {{text: string, changed: string[]}}
 */
export function patchJekyllConfig(existing, site = {}, options = {}) {
  const updates = [
    ['title', site?.name ?? ''],
    ['description', site?.description ?? ''],
  ];
  if (options.url !== undefined) updates.push(['url', options.url]);
  if (options.baseurl !== undefined) updates.push(['baseurl', options.baseurl]);

  let text = String(existing ?? '');
  const changed = [];
  for (const [key, value] of updates) {
    const line = `${key}: ${quoteYamlString(value)}`;
    const pattern = new RegExp(`^${key}:[^\\n]*$`, 'm');
    const next = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n*$/, '\n')}${line}\n`;
    if (next !== text) changed.push(key);
    text = next;
  }
  return { text, changed };
}

/* -------------------------------------------------------------------------- */
/* File rendering                                                             */
/* -------------------------------------------------------------------------- */

const REGEN_NOTE = 'Regenerate this file with `npm run setup` or the /setup/ page on the deployed site.';

const HEADERS = {
  site:
    'Site configuration: branding, contact details, and which modules are on.\n' +
    'Navigation, home page blocks and workflows adapt to the `modules` toggles.\n' +
    REGEN_NOTE,
  theme:
    'Theme: colors and typography.\n' +
    'Colors are hex values exposed as CSS variables and consumed by Tailwind, so\n' +
    'changing them re-themes the whole site on the next build. Keep text/background\n' +
    'pairs at WCAG AA contrast (4.5:1 for body text).\n' +
    REGEN_NOTE,
  schema:
    'Content model for catalog entries. Everything derives from this file: the entry\n' +
    'page and cards, the filter panel and search index, the /submit/ web form, the\n' +
    'GitHub issue form, the issue -> pull request scaffolder and CI validation.\n' +
    '\n' +
    'Field spec: key (snake_case, unique) · label (unique, matched by the issue\n' +
    'parser) · type (text | textarea | markdown | url | email | select | multiselect |\n' +
    'list | date | number | boolean | file | image) · required · description ·\n' +
    'placeholder · options (select/multiselect) · facet (filter panel) · card (shown\n' +
    'on cards) · search (search index) · section (details | links | contact) ·\n' +
    'form: false (hidden from submission forms) · filename + thumbnail (file fields).\n' +
    'Only one field may be `markdown` — it becomes the page body. `title`, `slug`,\n' +
    '`summary`, `published`, `thumbnail` and `featured` always exist on every entry.\n' +
    '\n' +
    'After hand-editing, run `npm run generate` to rebuild the GitHub issue form.\n' +
    REGEN_NOTE,
  navigation:
    'Primary navigation. Derived from the module toggles and the entry labels, but\n' +
    'safe to hand-edit. Items with `module` only appear when that module is enabled\n' +
    'in _data/site.yml.\n' +
    REGEN_NOTE,
};

/**
 * Render every file the configurator owns.
 * @returns {Record<string, string>} path -> file contents
 */
export function renderFiles(config, options = {}) {
  const site = config?.site ?? {};
  const theme = config?.theme ?? {};
  const schema = config?.schema ?? {};
  const navigation = Array.isArray(config?.navigation) ? config.navigation : navigationFromSite(site, schema);

  return {
    '_data/site.yml': toYaml(site, { header: HEADERS.site }),
    '_data/theme.yml': toYaml(theme, { header: HEADERS.theme }),
    '_data/schema.yml': toYaml(schema, { header: HEADERS.schema }),
    '_data/navigation.yml': toYaml(navigation, { header: HEADERS.navigation }),
    '_config.yml': jekyllConfig(site, { url: options.url ?? '', baseurl: options.baseurl ?? '' }),
    '.github/ISSUE_TEMPLATE/new-entry.yml': issueTemplateFromSchema(schema, site),
  };
}

/* -------------------------------------------------------------------------- */
/* GitHub links                                                               */
/* -------------------------------------------------------------------------- */

/** "Create a new file" URL with the content prefilled (new files only). */
export function githubNewFileUrl(repository, branch, path, content) {
  const repo = String(repository ?? '').trim();
  if (!repo) return '';
  const ref = String(branch ?? 'main').trim() || 'main';
  const params = new URLSearchParams({ filename: String(path ?? ''), value: String(content ?? '') });
  return `https://github.com/${repo}/new/${encodeURIComponent(ref)}?${params.toString()}`;
}

/** "Edit this file" URL. GitHub cannot prefill the editor for existing files. */
export function githubEditFileUrl(repository, branch, path) {
  const repo = String(repository ?? '').trim();
  if (!repo) return '';
  const ref = String(branch ?? 'main').trim() || 'main';
  return `https://github.com/${repo}/edit/${encodeURIComponent(ref)}/${String(path ?? '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

/** True when a prefilled URL is long enough that GitHub/browsers may reject it. */
export function prefillNoticeIfTooLong(url) {
  return String(url ?? '').length > 7000;
}

/* -------------------------------------------------------------------------- */
/* Contrast (used by the setup page palette preview)                          */
/* -------------------------------------------------------------------------- */

/** #rgb / #rrggbb -> {r,g,b} 0-255, or null when unparseable. */
export function parseHexColor(hex) {
  const value = String(hex ?? '').trim().replace(/^#/, '');
  const expanded = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio between two hex colors (1–21), or null if invalid. */
export function contrastRatio(foreground, background) {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** True for a strict `#rrggbb` value — what the wizards accept. */
export function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value ?? '').trim());
}
