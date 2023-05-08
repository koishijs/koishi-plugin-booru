# koishi-plugin-booru-local

## 安装

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。

## 刮削器

> 该方式需要图片文件名是特定的格式

这是一个在文件名中指定该图片元信息的方式，用于获得本地存储图片的元信息。

举个栗子，假设我们有一张文件名为 `genshin paimon-[gril,loli,genshin].jpg` 的图片，那么在刮削器对应的格式为：`{filename}-{tag}`。另外，当有一张文件名为 `genshin paimon-[gril,loli,genshin]114514.jpg` 的图片，在刮削器格式为 `{filename}-{tag}+` 时，tag 后面的 `114514` 将被忽略。

下列是刮削器支持的匹配格式：

> 为减少边界情况，仅支持使用 `-` 分割，且文件名不可缺少 `-`

### `{filename}`

文件名

### `{tag}`

图片拥有的 tag

### `{nsfw}`（WIP）

- 类型：`boolean | 'furry' | 'guro' | 'shota' | 'bl'`

限制级图片

### `+`

忽略后续的内容不作为元信息处理

### `.`

匹配 `.` 开头的隐藏文件，不设置的情况下将忽略隐藏文件

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#图源全局设置)
:::

### 图源设置

#### endpoint

- 类型: `string[]`

#### extension

- 类型: `string[]`
- 默认值: `['.jpg', '.png', '.jpeg', '.gif']`

#### autoscan

- 类型: `boolean`
- 默认值: `true`
