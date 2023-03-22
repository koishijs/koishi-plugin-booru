import { defineConfig } from '@koishijs/vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'koishi-plugin-booru',
  description: '最好的涩图插件！',

  head: [
    ['link', { rel: 'icon', href: 'https://koishi.chat/logo.png' }],
    ['link', { rel: 'manifest', href: 'https://koishi.chat/manifest.json' }],
    ['meta', { name: 'theme-color', content: '#5546a3' }],
  ],

  themeConfig: {
    sidebar: [{
      text: '指南',
      items: [
        { text: '介绍', link: './' },
        { text: '配置项', link: './config' },
      ],
    }, {
      text: '插件',
      items: [
        { text: 'Danbooru', link: './plugins/danbooru' },
        { text: 'Gelbooru', link: './plugins/gelbooru' },
        { text: 'Konachan', link: './plugins/konachan' },
        { text: 'Lolibooru', link: './plugins/lolibooru' },
        { text: 'Lolicon', link: './plugins/lolicon' },
        { text: 'Pixiv', link: './plugins/pixiv' },
        { text: 'Safebooru', link: './plugins/safebooru' },
        { text: 'Yande', link: './plugins/yande' },
      ],
    }, {
      text: '开发',
      items: [
        { text: 'API', link: './develop/api' },
      ],
    }, {
      text: '更多',
      items: [
        { text: 'Koishi 官网', link: 'https://koishi.chat' },
        { text: '支持作者', link: 'https://afdian.net/a/shigma' },
      ],
    }],
  },
})
