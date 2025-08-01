# koishi-plugin-booru-pixiv

## インストール

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。
2. 在 [Pixiv](https://www.pixiv.net/) 注册账号并登录。
3. 安装 [pixiv-auth](https://www.npmjs.com/package/koishi-plugin-pixiv-auth) 插件，根据其配置页面获取 `Refresh Token`，注意此插件需求图形界面。
    - 如果你没有图形界面，也可以使用 [Pixiv OAuth Script](https://gist.github.com/ZipFile/c9ebedb224406f4f11845ab700124362) 脚本获取 `Refresh Token`。
4. 将 `Refresh Token` 填入配置项中的 `token` 项。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#global-settings)
:::

### 搜索设置

<br>

#### token

- 类型：`string`
- 是否必填：是

Pixiv APP API 的 `Refresh Token`。

#### target

- 类型: `'标签部分一致' | '标签完全一致' | '标题或介绍说明'`
- 默认值: `'标签部分一致'`

搜索方式，分别为按标签模糊匹配、按标签精确匹配、按标题和描述搜索。

#### sort

- 类型: `'上传时间较近优先' | '上传时间较远优先' | '收藏数较多优先'`
- 默认值: `'上传时间较近优先'`

搜索结果排序方式，分别为按日期降序、按日期升序、按人气降序 (需要 Premium 账号)。

#### duration

- 类型: `'24 小时内' | '一周内' | '一个月内' | '全部时间' | '自定义'`
- 默认值: `'全部时间'`

搜索时间范围，分别为过去一天、过去一周、过去一个月、全部时间和自定义时间(暂不可用)。

#### minBookmarks

- 类型: `number`
- 默认值: `0`

最少收藏数，仅在设置了 Token 并有 Pixiv Premium 的情况下可用。

#### maxBookmarks

- 类型: `number`
- 默认值: `∞`

最多收藏数，仅在设置了 Token 并有 Pixiv Premium 的情况下可用。

#### rank

- 类型: `'全年龄' | 'R18' | 'R18G'`
- 默认值: `'全年龄'`

年龄分级。

#### ai

- 类型: `'不允许AI作品' | '允许AI作品'`
- 默认值: `'不允许AI作品'`

是否搜索 AI 生成的作品。

#### bypassMethod

- 类型: `'proxy' | 'route' | 'asset'`

突破 Pixiv 站点图片防外部引用检测的方式。具体[见下方说明](#bypass-pixiv-detection)

#### proxy

- 类型: `{ endpoint: string } | string`
- 可选值: `'i.pixiv.re' | 'i.pixiv.cat'`
- 默认值: `'i.pixiv.re'`

使用代理突破检测时的代理服务。如果是自定义代理服务，可以填写代理服务的地址。

#### route

- 类型: `string`
- 默认值: `'/booru/pixiv/proxy'`

使用 route 突破检测时的代理服务路径。

#### aesKey

- 类型: `string`
- 默认值: `''`

使用 route 突破检测时的 AES 加密密钥。

## 突破 Pixiv 检测 {#bypass-pixiv-detection}

Pixiv 站点全站引入了图片防外部引用检测，主要是检测 HTTP 请求的 Referer 头。这个检测会阻止插件直接引用图片链接，导致部分适配器无法直接发送图片链接。为了解决这个问题，本插件提供了三种突破检测的方式。

### proxy

使用 Pixiv 的图片代理服务，将图片链接转换为代理链接。这通常使用公开的代理服务，如 [pixiv.cat](https://pixiv.cat) 等。

### route

使用插件本身提供的图片代理服务，将图片链接转换到 Koishi 所在的服务器上。这通常需要插件的服务器能够访问到 Pixiv 的图片链接。

:::tip
同时由于插件难以对访问来源进行可信检测，因此需要使用 AES 加密密钥对图片链接进行加密，以防止恶意访问。密钥无法在配置中设置，在插件第一次启动时会自动生成一个随机的密钥。访问此路径时，只允许成功解密的请求通过，理论上只可能是插件本身提供的链接。
:::

### asset

使用 Koishi 的静态资源服务，将图片链接转换为 Koishi 的静态资源链接。这通常需要插件的服务器能够访问到 Pixiv 的图片链接，并且 Koishi 安装了合适的静态资源处理插件。
