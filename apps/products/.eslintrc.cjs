/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  settings: {
    'import/resolver': {
      typescript: { project: 'tsconfig.json' },
      node: true,
    },
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-default-export': 'error',
    // amqp-connection-manager and similar libs idiomatically use default-imports
    // for namespace access (amqp.connect, amqp.createChannel). The warning is
    // stylistic only and triggers a noisy false positive on every use.
    'import/no-named-as-default-member': 'off',
  },
  overrides: [
    {
      // Tests and in-memory fakes deliberately implement async interfaces
      // with synchronous bodies and consume loosely-typed Supertest responses.
      // The recommended-type-checked rules are too strict for that flavour
      // of code; relax them in test contexts only.
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts', '**/__fixtures__/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/require-await': 'off',
      },
    },
    {
      // Config files at package root use `export default defineConfig(...)`
      // — that's the API surface these tools expose.
      files: ['*.config.ts', '*.config.*.ts'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
};
