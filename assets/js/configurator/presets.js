/**
 * Starting points for the setup wizard.
 *
 * Each preset is `{ id, name, description, config }` where `config` is
 * `{ site, theme, schema }`. Navigation is always derived from the site modules
 * and the entry labels by `navigationFromSite()`, so presets never carry it.
 *
 * `ai-use-cases` is the configuration shipped in this repository — picking it
 * reproduces `_data/*.yml` byte for byte.
 */

import { defaultConfig } from './core.js';

const TITLE_FIELD = {
  key: 'title',
  label: 'Title',
  type: 'text',
  required: true,
  description: 'Short, descriptive name.',
  placeholder: 'A clear, specific title',
};

const SUMMARY_FIELD = {
  key: 'summary',
  label: 'One-sentence summary',
  type: 'textarea',
  required: true,
  description: 'One or two sentences shown on the catalog card. Plain language, no jargon.',
  placeholder: 'What it is and who it is for, in one sentence.',
};

/** Base site copy shared by the generic presets. */
function genericSite(overrides) {
  const base = defaultConfig().site;
  return {
    ...base,
    ...overrides,
    organization: { ...base.organization, ...(overrides.organization || {}) },
    logo: { ...base.logo, ...(overrides.logo || {}) },
    github: { ...base.github, ...(overrides.github || {}) },
    modules: { ...base.modules, ...(overrides.modules || {}) },
    hero: { ...base.hero, ...(overrides.hero || {}) },
    home: { ...base.home, ...(overrides.home || {}) },
    submit: { ...base.submit, ...(overrides.submit || {}) },
    footer: { ...base.footer, ...(overrides.footer || {}) },
    analytics: { ...base.analytics, ...(overrides.analytics || {}) },
  };
}

function theme(colors, fonts = {}) {
  const base = defaultConfig().theme;
  return {
    colors: { ...base.colors, ...colors },
    fonts: { ...base.fonts, ...fonts },
    radius: 'soft',
  };
}

/* -------------------------------------------------------------------------- */

const aiUseCases = defaultConfig();

/* -------------------------------------------------------------------------- */

const cohortPortal = {
  site: genericSite({
    name: 'Data Learning Cohorts Portal',
    tagline: 'Team projects from our data learning program',
    description:
      'A gallery of team projects produced by participants in our data learning cohorts, with methods, dashboards and posters.',
    organization: {
      name: 'Your Organization',
      short_name: 'ORG',
      url: 'https://example.org',
      contact_email: 'data-program@example.org',
    },
    logo: { image: '', text: 'DATA' },
    modules: {
      catalog: true,
      submit: true,
      carousel: true,
      stats: true,
      events: true,
      cohorts: true,
      resources: false,
    },
    hero: {
      eyebrow: 'Data Learning Cohorts',
      title: 'What our teams built with data',
      lead: 'Browse capstone projects from every cohort — the question each team asked, the methods they used, and the dashboards, posters and write-ups they produced.',
      primary_cta: { label: 'Browse team projects', url: '/catalog/' },
      secondary_cta: { label: 'Share your project', url: '/submit/' },
    },
    home: {
      featured_count: 6,
      recent_count: 6,
      highlights: [
        {
          eyebrow: 'Learn by doing',
          title: 'Real questions, real data',
          body: 'Every team picks a question that matters to their department and works it end to end with coaching.',
        },
        {
          eyebrow: 'Reusable work',
          title: 'Methods and code you can borrow',
          body: 'Projects document their data sources and methods so the next cohort can start from what already works.',
        },
        {
          eyebrow: 'Cohort by cohort',
          title: 'A growing body of practice',
          body: 'Filter by cohort year, department or track to see how the program has grown.',
        },
      ],
    },
    submit: {
      intro:
        'Share your team project with the program. Submissions open a GitHub issue for the coaches to review; nothing is published until it is approved.',
      review_note:
        'Please do not include confidential or personally identifiable data. Link to dashboards and documents rather than pasting sensitive content.',
      fallback_email: 'data-program@example.org',
    },
    footer: {
      about:
        'A gallery of team projects from our data learning cohorts. Content is contributed by participants and reviewed by program coaches before publication.',
      links: [
        { label: 'Program home', url: 'https://example.org' },
        { label: 'Submit a project', url: '/submit/' },
        { label: 'Cohorts', url: '/cohorts/' },
      ],
      copyright: 'Your Organization',
    },
  }),
  theme: theme(
    {
      primary: '#44499C',
      primary_dark: '#22254E',
      secondary: '#008743',
      accent: '#FF8F00',
    },
    { heading: 'Source Sans 3', body: 'Inter' }
  ),
  schema: {
    entry: { singular: 'Team project', plural: 'Team projects', path: 'catalog', sort: 'published', sort_order: 'desc' },
    sections: { details: 'Project details', links: 'Materials', contact: 'Team & coach' },
    fields: [
      {
        ...TITLE_FIELD,
        placeholder: 'Mapping heat-related 911 calls to cooling center coverage',
      },
      {
        ...SUMMARY_FIELD,
        placeholder: 'Compared summer 911 heat calls against cooling center locations to find under-served neighborhoods.',
      },
      {
        key: 'cohort',
        label: 'Cohort',
        type: 'text',
        required: true,
        facet: true,
        card: true,
        description: 'Cohort year, e.g. 2026',
        placeholder: '2026',
      },
      {
        key: 'department',
        label: 'Department',
        type: 'text',
        facet: true,
        card: true,
        search: true,
        placeholder: 'Public Health — Epidemiology',
        description: 'The department or team the participants come from.',
      },
      {
        key: 'track',
        label: 'Track',
        type: 'select',
        facet: true,
        card: true,
        options: ['Data Science Essentials', 'Data Storytelling', 'Civic Analytics'],
        description: 'Which program track this project came out of.',
      },
      {
        key: 'members',
        label: 'Team members',
        type: 'list',
        required: true,
        description: 'One per line.',
        placeholder: 'Jordan Lee\nAlex Rivera\nSam Okafor',
      },
      {
        key: 'coach_name',
        label: 'Coach',
        type: 'text',
        section: 'contact',
        placeholder: 'Dana Whitfield',
        description: 'The coach or mentor who supported this team.',
      },
      {
        key: 'coach_email',
        label: 'Coach email',
        type: 'email',
        section: 'contact',
        placeholder: 'dana.whitfield@example.org',
      },
      {
        key: 'methods',
        label: 'Methods & tools',
        type: 'list',
        facet: true,
        card: true,
        search: true,
        description: 'Techniques, libraries or platforms the team used.',
        placeholder: 'Spatial join, Python, GeoPandas, Tableau',
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'list',
        facet: true,
        search: true,
        description: 'Free-form topics so people can find related work.',
        placeholder: 'heat, equity, emergency response',
      },
      {
        key: 'dashboard_url',
        label: 'Interactive dashboard',
        type: 'url',
        section: 'links',
        placeholder: 'https://example.org/dashboards/heat-map',
        description: 'A published dashboard, notebook or app, if there is one.',
      },
      {
        key: 'poster_pdf',
        label: 'Project poster (PDF)',
        type: 'file',
        filename: 'poster.pdf',
        thumbnail: true,
        section: 'links',
        description: 'The showcase poster. Its first page becomes the card thumbnail.',
      },
      {
        key: 'idea_sheet_pdf',
        label: 'Idea sheet (PDF)',
        type: 'file',
        filename: 'idea-sheet.pdf',
        section: 'links',
        description: 'The one-page project brief written at the start of the cohort.',
      },
      {
        key: 'body',
        label: 'Project write-up',
        type: 'markdown',
        required: true,
        description: 'Markdown is supported. Tell the story of the project.',
        placeholder: '## Question\n\n## Data\n\n## Method\n\n## What we found\n\n## What we would do next\n',
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */

const resourceLibrary = {
  site: genericSite({
    name: 'Resource Library',
    tagline: 'Curated guides, toolkits and datasets for practitioners',
    description:
      'A searchable library of guides, toolkits, templates, datasets and training that our community recommends.',
    organization: {
      name: 'Your Organization',
      short_name: 'ORG',
      url: 'https://example.org',
      contact_email: 'library@example.org',
    },
    logo: { image: '', text: 'LIB' },
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
      eyebrow: 'Curated by practitioners',
      title: 'Find the resource you need, fast',
      lead: 'Filter by topic, audience and format to find guides, toolkits, templates, datasets and training that colleagues have already vetted.',
      primary_cta: { label: 'Browse resources', url: '/catalog/' },
      secondary_cta: { label: 'Suggest a resource', url: '/submit/' },
    },
    home: {
      featured_count: 6,
      recent_count: 6,
      highlights: [
        {
          eyebrow: 'Vetted, not scraped',
          title: 'Every item is reviewed',
          body: 'Suggestions go through a maintainer review before they appear in the library.',
        },
        {
          eyebrow: 'Built for filtering',
          title: 'Topic, audience, format',
          body: 'Narrow to exactly what you need instead of scrolling a long list of links.',
        },
        {
          eyebrow: 'Contribute',
          title: 'Suggest what helped you',
          body: 'If a resource saved your team time, add it so the next team finds it sooner.',
        },
      ],
    },
    submit: {
      intro:
        'Suggest a resource for the library. Submissions open a GitHub issue for the maintainers to review; nothing is published until it is approved.',
      review_note:
        'Link to publicly accessible resources. Do not paste licensed material, credentials or non-public documents.',
      fallback_email: 'library@example.org',
    },
    footer: {
      about:
        'A curated library maintained by our community. Items are suggested by practitioners and reviewed before publication.',
      links: [
        { label: 'Organization home', url: 'https://example.org' },
        { label: 'Suggest a resource', url: '/submit/' },
      ],
      copyright: 'Your Organization',
    },
  }),
  theme: theme({
    primary: '#1F6F50',
    primary_dark: '#123F2E',
    secondary: '#2C6E9E',
    accent: '#D98E04',
  }),
  schema: {
    entry: { singular: 'Resource', plural: 'Resources', path: 'catalog', sort: 'published', sort_order: 'desc' },
    sections: { details: 'Details', links: 'Links', contact: 'Contact' },
    fields: [
      { ...TITLE_FIELD, placeholder: 'Community health needs assessment toolkit' },
      {
        ...SUMMARY_FIELD,
        placeholder: 'A step-by-step toolkit for running a community health needs assessment, with templates and sample surveys.',
      },
      {
        key: 'resource_type',
        label: 'Resource type',
        type: 'select',
        required: true,
        facet: true,
        card: true,
        options: ['Guide', 'Toolkit', 'Template', 'Dataset', 'Training', 'Report', 'Tool'],
        description: 'What kind of resource is this? Pick the closest match.',
      },
      {
        key: 'topics',
        label: 'Topics',
        type: 'list',
        required: true,
        facet: true,
        card: true,
        search: true,
        description: 'Subject areas this resource covers.',
        placeholder: 'community assessment, health equity, survey design',
      },
      {
        key: 'audience',
        label: 'Audience',
        type: 'multiselect',
        facet: true,
        options: [
          'Leadership',
          'Program staff',
          'Epidemiologists',
          'Communications',
          'IT & data teams',
          'Community partners',
        ],
        description: 'Who is this most useful for? Select all that apply.',
      },
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        facet: true,
        card: true,
        options: ['Web page', 'PDF', 'Video', 'Spreadsheet', 'Slide deck', 'Code'],
        description: 'How the resource is delivered.',
      },
      {
        key: 'publisher',
        label: 'Publisher',
        type: 'text',
        facet: true,
        search: true,
        placeholder: 'National Association of County and City Health Officials',
        description: 'The organization that produced or hosts the resource.',
      },
      {
        key: 'resource_url',
        label: 'Link to resource',
        type: 'url',
        required: true,
        section: 'links',
        placeholder: 'https://example.org/toolkit',
        description: 'The canonical, publicly accessible link.',
      },
      {
        key: 'year',
        label: 'Year published',
        type: 'number',
        placeholder: '2025',
        description: 'Publication or last-updated year, if known.',
      },
      {
        key: 'contact_email',
        label: 'Contact email',
        type: 'email',
        section: 'contact',
        placeholder: 'you@example.org',
        description: 'Who to reach if someone has questions about this entry.',
      },
      {
        key: 'body',
        label: 'Notes',
        type: 'markdown',
        description: "What it is, who it's for, how to use it",
        placeholder: "## What it is\n\n## Who it's for\n\n## How to use it\n",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */

const blank = {
  site: genericSite({
    name: 'Your Catalog',
    tagline: 'A short line describing what this catalog collects',
    description: 'A browsable, filterable catalog. Replace this description with your own.',
    organization: {
      name: 'Your Organization',
      short_name: 'ORG',
      url: 'https://example.org',
      contact_email: 'you@example.org',
    },
    logo: { image: '', text: 'ORG' },
    modules: {
      catalog: true,
      submit: true,
      carousel: false,
      stats: false,
      events: false,
      cohorts: false,
      resources: false,
    },
    hero: {
      eyebrow: 'Your Organization',
      title: 'A catalog of things worth sharing',
      lead: 'Replace this line with a sentence about what people will find here and why it is worth their time.',
      primary_cta: { label: 'Browse the catalog', url: '/catalog/' },
      secondary_cta: { label: 'Submit an entry', url: '/submit/' },
    },
    home: {
      featured_count: 6,
      recent_count: 6,
      highlights: [],
    },
    submit: {
      intro:
        'Submit an entry for the catalog. Submissions open a GitHub issue for the maintainers to review; nothing is published until it is approved.',
      review_note: 'Please do not include confidential or non-public information in your submission.',
      fallback_email: 'you@example.org',
    },
    footer: {
      about: 'Replace this with a sentence or two about who maintains this catalog and how entries are reviewed.',
      links: [
        { label: 'Organization home', url: 'https://example.org' },
        { label: 'Submit an entry', url: '/submit/' },
      ],
      copyright: 'Your Organization',
    },
  }),
  theme: theme({
    primary: '#475569',
    primary_dark: '#1E293B',
    secondary: '#64748B',
    accent: '#0F766E',
  }),
  schema: {
    entry: { singular: 'Entry', plural: 'Entries', path: 'catalog', sort: 'published', sort_order: 'desc' },
    sections: { details: 'Details', links: 'Links', contact: 'Contact' },
    fields: [
      { ...TITLE_FIELD, placeholder: 'A clear, specific title' },
      { ...SUMMARY_FIELD, placeholder: 'One or two sentences describing this entry.' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        facet: true,
        card: true,
        options: ['Category one', 'Category two', 'Category three'],
        description: 'Replace these options with your own categories.',
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'list',
        facet: true,
        description: 'Free-form tags, one per line or comma-separated.',
        placeholder: 'tag one, tag two',
      },
      {
        key: 'link_url',
        label: 'Link',
        type: 'url',
        section: 'links',
        placeholder: 'https://example.org',
        description: 'An external link for this entry, if there is one.',
      },
      {
        key: 'body',
        label: 'Details',
        type: 'markdown',
        description: 'Markdown is supported.',
        placeholder: '## Overview\n\n## Details\n',
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */

export const presets = [
  {
    id: 'ai-use-cases',
    name: 'AI use case catalog',
    description:
      'The configuration this template ships with: a catalog of AI projects shared between health departments, with organization, solution type, domain and stage filters.',
    config: { site: aiUseCases.site, theme: aiUseCases.theme, schema: aiUseCases.schema },
  },
  {
    id: 'cohort-portal',
    name: 'Program / cohort portal',
    description:
      'A gallery of team projects from a training program: cohort year, department and track filters, team rosters, dashboards and posters. Turns on the cohorts and events modules.',
    config: cohortPortal,
  },
  {
    id: 'resource-library',
    name: 'Resource library',
    description:
      'A curated library of guides, toolkits, datasets and training, filtered by type, topic, audience and format.',
    config: resourceLibrary,
  },
  {
    id: 'blank',
    name: 'Blank catalog',
    description:
      'The smallest useful starting point: title, summary, one category, tags and a link. Rename everything and add your own fields.',
    config: blank,
  },
];

/** Look up a preset by id. */
export function getPreset(id) {
  return presets.find((preset) => preset.id === id) || null;
}

export default presets;
