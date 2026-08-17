#!/usr/bin/env node
/**
 * Interactive setup wizard.
 *
 *   npm run setup
 *   npm run setup -- --preset resource-library --yes
 *   npm run setup -- --dry-run
 *
 * Asks a handful of questions, then writes _data/site.yml, _data/theme.yml,
 * _data/schema.yml, _data/navigation.yml, _config.yml and the GitHub issue form.
 * The same answers -> files logic runs in the browser at /setup/; everything
 * lives in assets/js/configurator/core.js.
 *
 * Flags:
 *   --preset <id>   start from a preset instead of asking
 *   --yes           accept every default, ask nothing (CI / smoke tests)
 *   --dry-run       print the file list and a diff summary, write nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const core = await import(pathToFileURL(path.join(ROOT, 'assets/js/configurator/core.js')).href);
const { presets } = await import(pathToFileURL(path.join(ROOT, 'assets/js/configurator/presets.js')).href);

/* -------------------------------------------------------------------------- */
/* Terminal helpers                                                           */
/* -------------------------------------------------------------------------- */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const bold = (text) => paint('1', text);
const dim = (text) => paint('2', text);
const cyan = (text) => paint('36', text);
const green = (text) => paint('32', text);
const red = (text) => paint('31', text);

function parseArgs(argv) {
  const args = { preset: null, yes: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') args.yes = true;
    else if (arg === '--dry-run' || arg === '--dry') args.dryRun = true;
    else if (arg === '--preset') args.preset = argv[++i];
    else if (arg.startsWith('--preset=')) args.preset = arg.slice('--preset='.length);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else console.warn(`Ignoring unknown argument ${JSON.stringify(arg)}.`);
  }
  return args;
}

/** "owner/repo" from the origin remote, or null. */
function repositoryFromGit() {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const match = /(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Prompting                                                                  */
/* -------------------------------------------------------------------------- */

class Asker {
  constructor({ auto }) {
    this.auto = auto;
    this.queue = [];
    this.pending = null;
    if (auto) {
      this.rl = null;
      return;
    }
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout, crlfDelay: Infinity });
    // Buffer lines ourselves. When stdin is a pipe readline emits every line as
    // soon as the chunk arrives, so answers would be dropped between questions.
    this.rl.on('line', (line) => {
      if (this.pending) {
        const resolve = this.pending;
        this.pending = null;
        resolve(line);
      } else {
        this.queue.push(line);
      }
    });
    // End of input: fall back to accepting defaults for whatever is left.
    this.rl.on('close', () => {
      this.auto = true;
      if (this.pending) {
        const resolve = this.pending;
        this.pending = null;
        resolve('');
      }
    });
  }

  async ask(prompt) {
    if (this.rl.terminal) {
      this.rl.setPrompt(prompt);
      this.rl.prompt();
    } else {
      process.stdout.write(prompt);
    }
    if (this.queue.length > 0) return this.queue.shift();
    return new Promise((resolve) => {
      this.pending = resolve;
    });
  }

  async text(label, fallback, { help, validate } = {}) {
    for (;;) {
      if (this.auto) return fallback;
      if (help) console.log(dim(`  ${help}`));
      const answer = (await this.ask(`${label} ${dim(`[${fallback}]`)}\n> `)).trim();
      const value = answer === '' ? fallback : answer;
      const problem = validate ? validate(value) : null;
      if (!problem) {
        console.log('');
        return value;
      }
      console.log(red(`  ${problem}`));
    }
  }

  async confirm(label, fallback, { help } = {}) {
    if (this.auto) return fallback;
    if (help) console.log(dim(`  ${help}`));
    const suffix = fallback ? 'Y/n' : 'y/N';
    const answer = (await this.ask(`${label} ${dim(`[${suffix}]`)} `)).trim().toLowerCase();
    if (answer === '') return fallback;
    return /^(y|yes)$/.test(answer);
  }

  async choose(label, choices, fallbackIndex = 0) {
    if (this.auto) return choices[fallbackIndex];
    console.log(bold(label));
    choices.forEach((choice, index) => {
      console.log(`  ${cyan(String(index + 1))}. ${bold(choice.name)}`);
      if (choice.description) console.log(dim(`     ${choice.description}`));
    });
    for (;;) {
      if (this.auto) return choices[fallbackIndex];
      const answer = (await this.ask(`Choose 1-${choices.length} ${dim(`[${fallbackIndex + 1}]`)} `)).trim();
      if (answer === '') {
        console.log('');
        return choices[fallbackIndex];
      }
      const index = Number.parseInt(answer, 10) - 1;
      if (Number.isInteger(index) && index >= 0 && index < choices.length) {
        console.log('');
        return choices[index];
      }
      console.log(red(`  Enter a number between 1 and ${choices.length}.`));
    }
  }

  close() {
    if (this.rl) this.rl.close();
  }
}

const hexValidator = (value) => (core.isHexColor(value) ? null : 'Enter a 6-digit hex color such as #1D4E89.');
const emailValidator = (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Enter a valid email address.');
const repoValidator = (value) => (/^[\w.-]+\/[\w.-]+$/.test(value) ? null : 'Use the form owner/repo, e.g. bigcities/ai-catalog.');
const requiredValidator = (value) => (String(value).trim() ? null : 'This cannot be empty.');

/* -------------------------------------------------------------------------- */
/* Diff summary                                                               */
/* -------------------------------------------------------------------------- */

function diffSummary(relative, next) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) return green(`new file, ${next.split('\n').length - 1} lines`);
  const current = fs.readFileSync(file, 'utf8');
  if (current === next) return dim('unchanged');
  const counts = new Map();
  for (const line of current.split('\n')) counts.set(line, (counts.get(line) || 0) + 1);
  let added = 0;
  for (const line of next.split('\n')) {
    const seen = counts.get(line) || 0;
    if (seen > 0) counts.set(line, seen - 1);
    else added += 1;
  }
  let removed = 0;
  for (const seen of counts.values()) removed += seen;
  return `${green(`+${added}`)} ${red(`-${removed}`)} lines`;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

const MODULE_HELP = {
  catalog: 'The browsable, filterable catalog of entries. This is the core of the site.',
  submit: 'A public "Submit an entry" form that opens a GitHub issue, then a pull request.',
  carousel: 'A featured-entries carousel on the home page.',
  stats: 'Headline numbers (entry counts, contributing organizations) on the home page.',
  events: 'An events calendar rendered from _data/events.yml.',
  cohorts: 'Cohort / program-year pages with timelines and materials.',
  resources: 'A separate curated resource library from _data/resources.yml.',
};

const RADIUS_CHOICES = [
  { id: 'sharp', name: 'Sharp', description: 'Square corners — institutional, dense.' },
  { id: 'soft', name: 'Soft', description: 'Lightly rounded corners. A good default.' },
  { id: 'round', name: 'Round', description: 'Generously rounded — friendly, consumer-like.' },
];

const FONT_CHOICES = [
  { id: 'Inter', name: 'Inter', description: 'Bundled. Neutral, excellent at small sizes.' },
  { id: 'Source Sans 3', name: 'Source Sans 3', description: 'Bundled. Slightly warmer, good for headings.' },
  { id: 'other', name: 'Something else', description: 'Any family, loaded from a Google Fonts URL you provide.' },
];


// Entry folders shipped as sample content: catalog/<slug>/index.md whose front
// matter carries `sample: true` (all template samples do). User content never does.
function listSampleEntries() {
  const entryPath = (() => {
    try {
      const raw = fs.readFileSync(path.join(ROOT, '_data', 'schema.yml'), 'utf8');
      const m = raw.match(/^\s+path:\s*["']?([\w-]+)/m);
      return m ? m[1] : 'catalog';
    } catch { return 'catalog'; }
  })();
  const dir = path.join(ROOT, entryPath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name))
    .filter((d) => {
      const f = path.join(d, 'index.md');
      return fs.existsSync(f) && /^sample:\s*true\s*$/m.test(fs.readFileSync(f, 'utf8').split(/^---\s*$/m)[1] || '');
    });
}

function currentSchemaFields() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, '_data', 'schema.yml'), 'utf8');
    return [...raw.matchAll(/^\s+-\s+key:\s*([\w-]+)/gm)].map((m) => m[1]);
  } catch { return []; }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        '',
        bold('npm run setup') + ' — configure this site',
        '',
        '  --preset <id>   ' + presets.map((p) => p.id).join(' | '),
        '  --yes           accept every default without prompting',
        '  --dry-run       show what would be written, write nothing',
        '',
      ].join('\n')
    );
    return 0;
  }

  console.log('');
  console.log(bold(cyan('  Catalog template setup')));
  console.log(dim('  Answers become _data/*.yml and _config.yml. Nothing is written until you confirm.'));
  console.log(dim('  Non-technical admins can do the same thing at /setup/ on the deployed site.'));
  console.log('');

  const asker = new Asker({ auto: args.yes });
  try {
    // --- 1. preset ----------------------------------------------------------
    let preset;
    if (args.preset) {
      preset = presets.find((p) => p.id === args.preset);
      if (!preset) {
        console.error(red(`Unknown preset ${JSON.stringify(args.preset)}. Available: ${presets.map((p) => p.id).join(', ')}`));
        return 1;
      }
      console.log(`Starting from ${bold(preset.name)}.\n`);
    } else {
      preset = await asker.choose('Choose a starting point:', presets, 0);
    }

    const base = JSON.parse(JSON.stringify(preset.config));
    const answers = {};

    // --- 2. identity --------------------------------------------------------
    answers.siteName = await asker.text('Site name', base.site.name, { validate: requiredValidator });
    answers.tagline = await asker.text('Tagline (one short line under the site name)', base.site.tagline);
    answers.description = await asker.text('Description (used for SEO and the feed)', base.site.description);

    answers.orgName = await asker.text('Organization name', base.site.organization.name, { validate: requiredValidator });
    answers.orgShort = await asker.text('Organization short name / initials', base.site.organization.short_name);
    answers.logoText = await asker.text('Logo text mark (shown when no logo image is set)', base.site.logo.text || answers.orgShort);
    answers.orgUrl = await asker.text('Organization website', base.site.organization.url);
    answers.contactEmail = await asker.text('Contact email', base.site.organization.contact_email, { validate: emailValidator });
    answers.submitFallbackEmail = answers.contactEmail;

    const gitRepository = repositoryFromGit();
    answers.repository = await asker.text('GitHub repository (owner/repo)', gitRepository || base.site.github.repository, {
      help: gitRepository ? 'Detected from your git remote.' : 'Where this site lives. Used for submit links and "edit this page".',
      validate: repoValidator,
    });
    answers.branch = await asker.text('Branch GitHub Pages builds from', base.site.github.branch);

    // --- 3. colors and type -------------------------------------------------
    console.log(bold('Colors') + dim(' — 6-digit hex. Keep text on background at 4.5:1 contrast.'));
    answers.primary = await asker.text('Primary (buttons, links)', base.theme.colors.primary, { validate: hexValidator });
    answers.primaryDark = await asker.text('Primary dark (hero and footer background)', base.theme.colors.primary_dark, {
      validate: hexValidator,
    });
    answers.secondary = await asker.text('Secondary (supporting badges)', base.theme.colors.secondary, { validate: hexValidator });
    answers.accent = await asker.text('Accent (warm highlights)', base.theme.colors.accent, { validate: hexValidator });

    const primaryContrast = core.contrastRatio(base.theme.colors.on_dark ?? '#FFFFFF', answers.primaryDark);
    if (primaryContrast !== null && primaryContrast < 4.5) {
      console.log(red(`  Warning: text on the primary-dark background is only ${primaryContrast.toFixed(1)}:1 (AA needs 4.5:1).`));
      console.log(dim('  Pick a darker primary_dark, or edit theme.colors.on_dark in _data/theme.yml afterwards.\n'));
    }

    const headingChoice = await asker.choose('Heading font:', FONT_CHOICES, FONT_CHOICES.findIndex((f) => f.id === base.theme.fonts.heading) >= 0 ? FONT_CHOICES.findIndex((f) => f.id === base.theme.fonts.heading) : 0);
    if (headingChoice.id === 'other') {
      answers.headingFont = await asker.text('Heading font family name', base.theme.fonts.heading);
      answers.googleFontsUrl = await asker.text('Google Fonts <link> href', base.theme.fonts.google_fonts_url, {
        help: 'Copy the href from fonts.google.com, e.g. https://fonts.googleapis.com/css2?family=...&display=swap',
      });
    } else {
      answers.headingFont = headingChoice.id;
    }

    const bodyChoice = await asker.choose('Body font:', FONT_CHOICES, FONT_CHOICES.findIndex((f) => f.id === base.theme.fonts.body) >= 0 ? FONT_CHOICES.findIndex((f) => f.id === base.theme.fonts.body) : 0);
    if (bodyChoice.id === 'other') {
      answers.bodyFont = await asker.text('Body font family name', base.theme.fonts.body);
      answers.googleFontsUrl = await asker.text('Google Fonts <link> href', answers.googleFontsUrl ?? base.theme.fonts.google_fonts_url);
    } else {
      answers.bodyFont = bodyChoice.id;
    }

    const radiusIndex = Math.max(0, RADIUS_CHOICES.findIndex((r) => r.id === base.theme.radius));
    answers.radius = (await asker.choose('Corner rounding:', RADIUS_CHOICES, radiusIndex)).id;

    // --- 4. modules ---------------------------------------------------------
    console.log(bold('Modules') + dim(' — turn sections of the site on or off. You can change these later.'));
    answers.modules = {};
    for (const [key, enabled] of Object.entries(base.site.modules)) {
      answers.modules[key] = await asker.confirm(`  Enable ${bold(key)}?`, enabled, { help: MODULE_HELP[key] });
    }
    console.log('');
    if (!answers.modules.catalog) {
      console.log(red('  Note: the catalog module is off — the site will have no entry listing.\n'));
    }

    // --- 5. entry naming ----------------------------------------------------
    answers.entrySingular = await asker.text('What is one entry called? (singular)', base.schema.entry.singular, {
      help: 'Used in buttons, the issue form and page headings. e.g. "Use case", "Resource", "Team project".',
      validate: requiredValidator,
    });
    answers.entryPlural = await asker.text('And several of them? (plural)', base.schema.entry.plural, {
      validate: requiredValidator,
    });

    // --- 6. copy ------------------------------------------------------------
    answers.heroEyebrow = await asker.text('Home page eyebrow (small line above the headline)', base.site.hero.eyebrow);
    answers.heroTitle = await asker.text('Home page headline', base.site.hero.title, { validate: requiredValidator });
    answers.heroLead = await asker.text('Home page lead paragraph', base.site.hero.lead);
    answers.submitIntro = await asker.text('Submission page intro', base.site.submit.intro);
    answers.footerAbout = await asker.text('Footer "about" paragraph', base.site.footer.about);
    answers.copyright = await asker.text('Copyright holder', answers.orgName || base.site.footer.copyright);

    // --- build --------------------------------------------------------------
    const config = core.applyAnswers(base, answers);

    const schemaErrors = core.validateSchema(config.schema);
    if (schemaErrors.length > 0) {
      console.error(red('\nThe content model is not valid:'));
      for (const error of schemaErrors) console.error(`  • ${error}`);
      return 1;
    }

    const files = core.renderFiles(config, { url: '', baseurl: '' });

    // _config.yml holds build mechanics the wizard does not manage (excludes,
    // plugins, defaults). When it already exists, patch the two lines we own
    // instead of overwriting whatever the maintainers have added to it.
    const configFile = path.join(ROOT, '_config.yml');
    if (fs.existsSync(configFile)) {
      files['_config.yml'] = core.patchJekyllConfig(fs.readFileSync(configFile, 'utf8'), config.site).text;
    }

    // --- summary ------------------------------------------------------------
    console.log(bold('\nFiles to write:\n'));
    for (const [relative, content] of Object.entries(files)) {
      console.log(`  ${relative.padEnd(42)} ${diffSummary(relative, content)}`);
    }
    console.log('');
    console.log(`  Site        ${bold(config.site.name)}`);
    console.log(`  Entries     ${config.schema.entry.singular} / ${config.schema.entry.plural} (${config.schema.fields.length} fields)`);
    console.log(
      `  Modules on  ${Object.entries(config.site.modules).filter(([, on]) => on).map(([key]) => key).join(', ') || 'none'}`
    );
    console.log(`  Repository  ${config.site.github.repository} (${config.site.github.branch})`);
    console.log('');

    if (args.dryRun) {
      console.log(dim('Dry run — nothing was written.\n'));
      return 0;
    }

    const proceed = await asker.confirm('Write these files?', true);
    if (!proceed) {
      console.log(dim('\nNothing was written.\n'));
      return 0;
    }

    const previousFields = currentSchemaFields();
    for (const [relative, content] of Object.entries(files)) {
      const file = path.join(ROOT, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, 'utf8');
    }

    // --- sample content -----------------------------------------------------
    // The shipped sample entries were written for the default entry model. If
    // the schema changed, they will fail validation, so offer to remove them.
    const schemaChanged = JSON.stringify(previousFields) !== JSON.stringify(config.schema.fields.map((f) => f.key));
    const sampleEntries = listSampleEntries();
    if (sampleEntries.length && (schemaChanged || preset.id !== 'current')) {
      const remove = await asker.confirm(
        `Remove the ${sampleEntries.length} sample ${sampleEntries.length === 1 ? 'entry' : 'entries'} under ${config.schema.entry.path}/ (they use the previous field set)?`,
        schemaChanged
      );
      if (remove) {
        for (const dir of sampleEntries) fs.rmSync(dir, { recursive: true, force: true });
        console.log(dim(`  Removed ${sampleEntries.length} sample ${sampleEntries.length === 1 ? 'entry' : 'entries'}. Sample data in _data/events.yml, _data/cohorts/ and _data/resources.yml is left in place — edit or clear it as needed.`));
      }
    }

    // --- next steps ---------------------------------------------------------
    console.log(green(bold('\nDone.')) + ' Next steps:\n');
    console.log(`  1. Review the changes:      ${cyan('git diff')}`);
    console.log(`  2. Commit and push:         ${cyan('git add -A && git commit -m "chore: configure site" && git push')}`);
    console.log(`  3. Enable GitHub Pages:     ${cyan(`https://github.com/${config.site.github.repository}/settings/pages`)}`);
    console.log(dim(`     Source: "GitHub Actions". The site builds from the ${config.site.github.branch} branch.`));
    console.log('');
    console.log(dim('  To change the entry fields, edit _data/schema.yml and run `npm run generate`'));
    console.log(dim('  (that rebuilds .github/ISSUE_TEMPLATE/new-entry.yml), or use the field editor'));
    console.log(dim('  at /setup/ on the deployed site — no terminal required.'));
    console.log('');
    return 0;
  } finally {
    asker.close();
  }
}

process.exit(await main());
