# koishi-plugin-booru-pixiv

## インストール

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。
2. 在 [Pixiv](https://www.pixiv.net/) 注册账号并登录。
3. 使用 [Pixiv OAuth Script] 脚本获取 `Refresh Token`。
4. 将 `Refresh Token` 填入配置项中的 `token` 项。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#图源全局设置)
:::

### 搜索设置

<br>

#### token

- 类型：`string`
- 是否必填：是

Pixiv APP API 的 `Refresh Token`。

#### minBookmarks

- 类型: `number`
- 默认值: `0`

最少收藏数

#### proxy

- 类型: `{ endpoint: string } | string`
- 可选值: `'i.pixiv.re' | 'i.pixiv.cat'`
- 默认值: `'i.pixiv.re'`
