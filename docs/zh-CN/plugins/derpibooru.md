# koishi-plugin-booru-derpibooru

## 安装

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#global-settings)
:::

### 搜索设置

<br>

#### endpoint

- 类型：`string`
- 默认值：`https://derpibooru.org/`

Derpibooru 的 API 地址。

#### keyPairs

- 类型：`Array<string>`
- 默认值：`[]`

Derpibooru 的密钥。

## 获取与设置登录凭据 {#configure-credentials}

1. 访问 [Derpibooru](https://derpibooru.org/) 并登录。如果你还没有账号，你需要先注册一个账号。
1. 访问 [个人页面](https://derpibooru.org/registrations/edit)，找到 `API Key` 字样并点击复制按钮。
1. 在列表中找到你刚刚创建的 API 密钥，复制 `Key` 字段的内容并粘贴到 Koishi 端的 `keyPairs` 配置项中。
1. 保存配置。
