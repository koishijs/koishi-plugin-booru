# koishi-plugin-booru-yande

## 安裝

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#global-settings)
:::

### 搜尋設定

<br>

#### endpoint

- 类型：`string`
- 默认值：`https://yande.re/`

Yande.re 的 API 地址。

#### keyPairs

- 类型：`Array<{ login: string; password: string }>`
- 默认值：`[]`

Yande.re 的登录凭据。如该项为空，则使用匿名登录。
