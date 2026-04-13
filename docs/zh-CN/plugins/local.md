# koishi-plugin-booru-local

超快的本地图源支持

## 安装

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#global-settings)
:::

### 图源设置

<br>

#### endpoint

- 类型: `string[]`

图源文件夹，支持多个不同的文件夹

#### buildByReload

- 类型: `boolean`
- 默认值: `false`

是否在每次启动时重新扫描图源文件夹

#### languages

- 类型: `string[]`
- 默认值: `['zh-CN']`

图源支持的语言

#### proxy

- 类型: `boolean`
- 默认值: `false`

是否启用链接代理，如果启用，插件将使用代理的本地图片链接，而不是本地文件路径。

### 文件设置

#### scraper

- 类型: `string`
- 默认值: `{filename}-{tag}`

文件元信息刮削器格式，详见 [刮削器](#刮削器)

#### extension

- 类型: `string[]`
- 默认值: `['.jpg', '.png', '.jpeg', '.gif']`

支持的图片扩展名，请注意扩展名前的 `.` 是必须的

## 刮削器

:::tip
该方式需要图片文件名是特定的格式，且为减少边界情况，仅支持使用 `-` 分割
:::

这是一个在文件名中指定该图片元信息的方式，以便于插件能够正确的搜索符合需求的图片。

### 使用

插件设置中 `scraper` 默认值可得出大致的使用方式：当 `scraper` 为 `{filename}-{tag}` 时，文件名为 `foo-[bar].jpg` 的图片将被刮削为 `{name: 'foo', tags: ['bar']， ...}`

即：文件名为 `foo` 的图片，其拥有 `bar` 这个 tags

### 语法

#### `#...#`

- 类型: `name | meta | index`
- 默认值: `name`
- 示例: `#name#{fliename}-{tag}`

> 该语法仅在 `scraper` 的第一个元素中有效，否则将被忽略

指定刮削器的工作方式，目前支持以下几种方式：

1. `name`: 文件名模式
2. `meta`: 文件元信息模式（开发中）
3. `index`: 外部索引模式（开发中）

#### `{hidden}`

> 该语法应当在 `#...#` 语法后的第一个，否则将忽略

匹配 `.` 开头的隐藏文件，不设置的情况下将忽略隐藏文件

#### `{filename}`

- 类型: `string`

> 当 `{filename}` 被放置在最后时，`+` 将失效（e.g. `{foo}-{filename}+`）

指示文件名所在的位置，文件名将被刮削为 `name`，并作为图片的 `name` 属性

#### `{tag}`

- 类型: `string[]`

指示标签所在的位置，标签将被刮削为 `tag`，并作为图片的 `tags` 属性

#### `{nsfw}`

- 类型: `boolean | 'furry' | 'guro' | 'shota' | 'bl'`
- 默认值: `false`

指示图片是否为 nsfw，若为 `boolean` 类型，则直接将其作为 `nsfw` 属性开关，若为 `string` 类型，则将其作为 `nsfw` 属性的值，并且 `nsfw` 总是为 `true`

#### `{author}`

- 类型: `string`

指示图片作者名称，作者将被刮削为 `author`，并作为图片的 `author` 属性

#### `+`

- 示例：`{filename}-{author}+{tag}`

忽略后续的内容不作为元信息处理，如示例所示，`{tag}` 将被忽略

## 外部索引

外部索引一般存储在 `./data/booru-local` 文件夹中，包含了所有图片的元信息索引。这个文件通常由插件在初次加载时生成，并且除非配置了 `buildByReload` 选项，否则不会在每次启动时重新生成。

索引文件名称为 `index.[plugin id].json`，其中 `[plugin id]` 是插件的唯一标识符。你不应该手动修改这个文件，因为插件提供了 WebUI 界面来方便的管理与编辑索引，经由 WebUI 管理的索引会保存为 `index.user.[plugin id].json`，该索引会覆盖基本索引的内容，如果因为特殊情况需要手动修改索引文件，请确保遵循正确的格式。
