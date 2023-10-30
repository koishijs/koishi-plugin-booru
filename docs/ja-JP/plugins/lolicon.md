# koishi-plugin-booru-lolicon

## インストール

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#图源全局设置)
:::

### 搜索设置

<br>

#### endpoint

- 类型: `string`
- 默认值: `https://api.lolicon.app/setu/v2`

#### r18

- 类型: `enum`
- 可选值: `'非 R18' | '仅 R18' | '混合'`
- 默认值: `'非 R18'`

#### proxy

- 类型: `{ endpoint: string } | string`
- 可选值: `'i.pixiv.re' | 'i.pixiv.cat'`
- 默认值: `'i.pixiv.re'`
