# 使用

## 指令

`booru` 插件会注册名为 `booru` 的指令，用于搜索图片，只需在指令后面跟上搜索关键词即可。当搜索关键词为空时，会返回随机图片。

::: tip
每个图源插件都有适用语言，当你打开了 [`detectLanguage`](./config.md#detectlanguage) 选项时，`booru` 插件会自动检测你的语言并使用对应的图源插件。

如 [`danbooru`](./plugins/danbooru.md), [`gelbooru`](./plugins/gelbooru.md) 等图源插件仅支持英语 (en)，而 [`pixiv`] 则支持日语 (ja)、英语 (en)、简体与繁体中文 (zh) 和韩语 (ko)，但大部分情况下日语 (ja) 会有更好的效果。
:::

<chat-panel>
<chat-message nickname="Alice">booru komeiji koishi</chat-message>
<chat-message nickname="Koishi">
<picture>
  <source srcset="https://pixiv.nl/101250949.jpg" />
  <source srcset="https://pixiv.re/101250949.jpg" />
  <img src="https://pixiv.cat/101250949.jpg">
</picture>
I miss You <br>
作者: 京田スズカ <br>
页面地址: https://www.pixiv.net/artworks/101250949 <br>
作者主页: https://www.pixiv.net/users/3718340 <br>
图源: pixiv <br>
标签: 東方 東方Project 古明地こいし こいしちゃんうふふ こいしちゃんマジ天使 目がハート 東方Project1000users入り 白抜きまつ毛 <br>
</chat-message>
</chat-panel>
