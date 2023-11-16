import { defineConfig } from '@koishijs/vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'koishi-plugin-booru',
  description: '最好的涩图插件！',

  locales: {
    'zh-CN': require('./zh-CN'),
  },

  themeConfig: {
    indexName: 'koishi-booru',
    socialLinks: {
      github: 'https://github.com/koishijs/koishi-plugin-booru',
    },
  },
})
