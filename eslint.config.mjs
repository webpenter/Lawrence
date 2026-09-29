import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

import waterlineDesignRules from './eslint-rules/no-hardcoded-design-values.mjs';
import waterlineI18nRules from './eslint-rules/no-literal-jsx-text.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.next-audit/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'src/payload-types.ts',
      'src/migrations/**',
      // Repo-root scratch codemods (one-shot design-pass helpers).
      '*.js',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: { waterline: waterlineDesignRules },
    rules: {
      'waterline/no-hardcoded-design-values': 'error',
    },
  },
  {
    // Prompt 6 acceptance: no literal user-facing string in any public
    // component. Dev-only routes ((dev)/styleguide) and the Payload admin
    // tree are exempt; LocaleSwitcher's native language names are copy that
    // must NOT be translated, so it carries a scoped disable instead.
    files: ['src/app/(frontend)/**/*.tsx', 'src/components/**/*.tsx'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: { waterlineI18n: waterlineI18nRules },
    rules: {
      'waterlineI18n/no-literal-jsx-text': 'error',
    },
  },
];

export default eslintConfig;
