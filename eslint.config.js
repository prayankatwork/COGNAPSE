// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Disallow importing from the same module more than once (catches the
      // lucide-react duplicate-import bug that caused runtime crashes in
      // production builds due to esbuild tree-shaking conflicts).
      'no-duplicate-imports': ['error', { includeExports: true }],
      // Non-critical — warn instead of error to avoid blocking CI
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'no-empty': 'warn',
      'no-control-regex': 'warn',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.mjs',
      'scripts/',
      'api/',
      'server/',
    ],
  },
);
