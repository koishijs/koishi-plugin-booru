# koishi-plugin-booru-gelbooru

## Install

1. 在 Koishi 中下载并安装本插件，若你还未安装 [Booru 插件](../index.md)，请先安装。

## 配置项

### 全局设置

:::tip
此处的配置项可参考[图源全局设置](../config#图源全局设置)
:::

### 搜索设置

<br>

#### endpoint

- 类型：`string`
- 默认值：`https://gelbooru.com/index.php`

Gelbooru 的 API 地址。

#### keyPairs

- 类型：`string[]`
- 默认值：`[]`

Gelbooru 的登录凭据。如该项为空，则使用匿名登录。如该项为空，则使用匿名登录。

由于 Gelbooru 的 API 限制，匿名用户极易触发防火墙限制（这表现为请求时无法获取图片，并返回 403 错误码）。因此推荐设置至少一个登录凭据用于检索图片，当登录凭据设置为多个时，将会针对每个凭据的搜索次数进行平均分配。因此推荐设置至少一个登录凭据用于检索图片，当登录凭据设置为多个时，将会针对每个凭据的搜索次数进行平均分配。

## 获取与设置登录凭据 {#configure-credentials}

1. 访问 [Gelbooru](https://gelbooru.com) 并登录。如果你还没有账号，你需要先注册一个账号。
2. 访问 [个人页面](https://gelbooru.com/index.php?page=account\&s=options) 并翻阅到页面底部找到 `API Access Credentials` 字样，复制其右侧的文本框的内容。
3. 在 Koishi 端的 `kayPairs` 配置项中添加项目，并粘贴刚刚复制的内容。
4. 保存配置。
