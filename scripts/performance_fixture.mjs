#!/usr/bin/env node
/** Build deterministic catalog sizes and enforce the checked-in payload budgets. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

import { copyTree, removeEntries, run } from './lib/build-tree.mjs';
import { seedFixtureEntries } from './seed_fixture_entries.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED_COUNTS = [0, 1, 10, 100, 500, 1000];

function parseArgs(argv) {
  const value = (name, fallback) => {
    const at = argv.indexOf(name);
    return at === -1 ? fallback : argv[at + 1];
  };
  const counts = String(value('--counts', ALLOWED_COUNTS.join(',')))
    .split(',')
    .map(Number);
  if (counts.some((count) => !ALLOWED_COUNTS.includes(count))) {
    throw new Error(`--counts must use only ${ALLOWED_COUNTS.join(', ')}`);
  }
  return { counts: [...new Set(counts)], output: value('--output', 'performance-report.json') };
}

function treeStats(root) {
  let files = 0;
  let bytes = 0;
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, item.name);
    if (item.isDirectory()) {
      const child = treeStats(target);
      files += child.files;
      bytes += child.bytes;
    } else if (item.isFile()) {
      files += 1;
      bytes += fs.statSync(target).size;
    }
  }
  return { files, bytes };
}

function gzipBytes(file) {
  return fs.existsSync(file) ? zlib.gzipSync(fs.readFileSync(file), { level: 9 }).byteLength : 0;
}

function pageMetrics(siteDir, relative) {
  const file = path.join(siteDir, relative);
  if (!fs.existsSync(file)) return { raw_bytes: 0, gzip_bytes: 0, dom_nodes: 0 };
  const content = fs.readFileSync(file);
  return {
    raw_bytes: content.byteLength,
    gzip_bytes: zlib.gzipSync(content, { level: 9 }).byteLength,
    dom_nodes: new JSDOM(content.toString('utf8')).window.document.querySelectorAll('*').length,
  };
}

function javascriptBytes(siteDir, catalogFile) {
  if (!fs.existsSync(catalogFile)) return 0;
  const document = new JSDOM(fs.readFileSync(catalogFile, 'utf8')).window.document;
  const paths = [...document.querySelectorAll('script[src]')]
    .map((script) => new URL(script.getAttribute('src'), 'https://fixture.test/').pathname)
    .filter((src) => !src.startsWith('//'))
    .map((src) => src.replace(/^\//, ''));
  return [...new Set(paths)].reduce((total, relative) => total + gzipBytes(path.join(siteDir, relative)), 0);
}

export function budgetFindings(metrics, config) {
  if (metrics.entries > config.supported_entries) return [];
  const values = {
    build_ms: metrics.build_ms,
    artifact_bytes: metrics.artifact.bytes,
    artifact_files: metrics.artifact.files,
    catalog_html_gzip_bytes: metrics.catalog.gzip_bytes,
    catalog_dom_nodes: metrics.catalog.dom_nodes,
    css_gzip_bytes: metrics.css_gzip_bytes,
    javascript_gzip_bytes: metrics.javascript_gzip_bytes,
    search_json_gzip_bytes: metrics.search_json_gzip_bytes,
    entries_json_gzip_bytes: metrics.entries_json_gzip_bytes,
  };
  return Object.entries(config.budgets)
    .filter(([name, maximum]) => values[name] > maximum)
    .map(([name, maximum]) => ({ name, actual: values[name], maximum }));
}

function buildFixture(count, scratchRoot, budgets) {
  const fixtureRoot = path.join(scratchRoot, String(count));
  copyTree(ROOT, fixtureRoot);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(fixtureRoot, 'node_modules'));
  removeEntries(fixtureRoot);
  seedFixtureEntries(fixtureRoot, { count });

  const generated = run(process.execPath, ['scripts/generate.mjs'], { cwd: fixtureRoot });
  if (!generated.ok) throw new Error(`generate failed for ${count} entries:\n${generated.output}`);

  const siteDir = path.join(fixtureRoot, '_site');
  const started = performance.now();
  const built = run('bundle', ['exec', 'jekyll', 'build', '--destination', siteDir], {
    cwd: fixtureRoot,
    env: { ...process.env, JEKYLL_ENV: 'production' },
  });
  const buildMs = Math.round(performance.now() - started);
  if (!built.ok) throw new Error(`Jekyll build failed for ${count} entries:\n${built.output}`);

  const catalogFile = path.join(siteDir, 'catalog', 'index.html');
  const metrics = {
    entries: count,
    build_ms: buildMs,
    artifact: treeStats(siteDir),
    catalog: pageMetrics(siteDir, path.join('catalog', 'index.html')),
    css_gzip_bytes: gzipBytes(path.join(siteDir, 'assets', 'css', 'site.css')),
    javascript_gzip_bytes: javascriptBytes(siteDir, catalogFile),
    search_json_gzip_bytes: gzipBytes(path.join(siteDir, 'search.json')),
    entries_json_gzip_bytes: gzipBytes(path.join(siteDir, 'entries.json')),
  };
  return {
    ...metrics,
    findings: budgetFindings(metrics, budgets),
    target_findings:
      metrics.entries > budgets.supported_entries && metrics.entries <= budgets.target_entries
        ? budgetFindings(metrics, { ...budgets, supported_entries: budgets.target_entries })
        : [],
  };
}

function main(argv) {
  const args = parseArgs(argv);
  const budgets = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality', 'performance-budgets.json'), 'utf8'));
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phct-performance-'));
  const report = {
    schema_version: 1,
    commit: '',
    measured_at: new Date().toISOString(),
    supported_entries: budgets.supported_entries,
    target_entries: budgets.target_entries,
    runs: [],
  };
  try {
    try {
      report.commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      report.commit = 'unknown';
    }
    for (const count of args.counts) {
      console.log(`Building deterministic ${count}-entry catalog...`);
      const metrics = buildFixture(count, scratchRoot, budgets);
      report.runs.push(metrics);
      console.log(
        `  ${metrics.build_ms}ms, ${metrics.artifact.files} files, ` +
          `${Math.round(metrics.artifact.bytes / 1024)} KiB artifact, ${metrics.findings.length} release findings, ` +
          `${metrics.target_findings.length} target findings`
      );
    }
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }

  const output = path.resolve(ROOT, args.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const findings = report.runs.flatMap((runResult) =>
    runResult.findings.map((finding) => ({ entries: runResult.entries, ...finding }))
  );
  if (findings.length > 0) {
    console.error('\nPerformance budgets failed:\n');
    for (const finding of findings) {
      console.error(`  • ${finding.entries} entries: ${finding.name} ${finding.actual} > ${finding.maximum}`);
    }
    console.error(`\nFull report: ${args.output}\n`);
    return 1;
  }
  console.log(`\nAll enforced performance budgets passed. Report: ${args.output}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
