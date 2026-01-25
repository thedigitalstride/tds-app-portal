import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Use createRequire to resolve the plugin from node_modules (works with pnpm hoisting)
const nextPlugin = require('@next/eslint-plugin-next');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Allow any for now (can be tightened later)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow triple-slash references in .d.ts files (Next.js generates these)
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      '*.config.js',
      '*.config.mjs',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
