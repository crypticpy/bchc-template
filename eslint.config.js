// ESLint flat config. Two environments: browser IIFEs/modules under assets/js and
// Node ESM under scripts/ and test/. Style is Prettier's job; this catches bugs.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '_site/**',
      'node_modules/**',
      'vendor/**',
      'assets/js/lunr.min.js',
      'assets/css/site.css',
      'dive-portal/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, lunr: 'readonly' },
    },
  },
  {
    files: [
      'scripts/**/*.mjs',
      'test/**/*.mjs',
      'eslint.config.js',
      'tailwind.config.js',
      'postcss.config.js',
    ],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
  },
  // quality/ is CommonJS (its own package.json): pa11y-ci and Lighthouse CI require() their configs.
  {
    files: ['quality/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
  },
  // yaml.mjs deliberately matches control characters to decide when to quote.
  { files: ['scripts/lib/yaml.mjs'], rules: { 'no-control-regex': 'off' } },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
    },
  },
];
