import antfu from '@antfu/eslint-config'

export default antfu({
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
})
