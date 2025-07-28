# koishi-plugin-booru-danbooru

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
- 默认值：`https://danbooru.donmai.us`

Danbooru 的 API 地址。

#### keyPairs

- 类型：`Array<{ login: string; apiKey: string }>`
- 默认值：`[]`

Danbooru 的登录凭据。如该项为空，则使用匿名登录。

由于 Danbooru 的 [API 限制](https://danbooru.donmai.us/wiki_pages/help%3Ausers)，匿名用户一次只能搜索 2 个标签，且极易触发 CloudFlare 防火墙限制（这表现为请求时无法获取图片，并返回 403 错误码）。因此推荐设置至少一个登录凭据用于检索图片，当登录凭据设置为多个时，将会针对每个凭据的搜索次数进行平均分配。

## 获取与设置登录凭据 {#configure-credentials}

1. 访问 [Danbooru](https://danbooru.donmai.us) 并登录。如果你还没有账号，你需要先注册一个账号。
2. 访问 [个人页面](https://danbooru.donmai.us/profile)，找到 `API Key` 字样并点击其右方的 `View` 按钮。
3. 在新的页面中，单击 `Add` 按钮添加一个新的 API 密钥，一般情况下只需要填写 `Name` 字段并点击 `Create` 按钮即可。
4. 在列表中找到你刚刚创建的 API 密钥，复制 `Key` 字段的内容并粘贴到 Koishi 端的 `kayPairs` 配置项中的 `apiKey` 字段中。
5. 在 `login` 字段中填写你的用户名，并保存配置。
