import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    markdown: false,
    ignores: [
      '**/.yarn/*',
      '/external',
      '/docs/*',
      '!/docs/zh-CN/*',
      '/packages/*/src/locales/*.yml',
      '!/packages/*/src/locales/zh-CN*.yml',
      '/packages/*/lib/**/*',
    ],
  },
  {
    rules: {
      // The codebase uses TypeScript namespace merging extensively to declare
      // config types alongside their runtime values, and `require()` to load
      // YAML locale bundles at runtime, which are idiomatic in the Koishi ecosystem.
      'ts/no-namespace': 'off',
      'ts/no-require-imports': 'off',
      'ts/no-redeclare': 'off',
      'node/prefer-global/buffer': 'off',
    },
  },
)
