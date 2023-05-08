# 图源

## 介绍

图源插件是用于获取图片的插件，它可以从网络、本地文件、剪贴板、数据库等地方获取图片。

由于图源插件本身也是一个标准的 Koishi 插件，这意味着它必须导出一个函数，或者一个带有 `apply` 方法的对象。为了方便开发，我们提供了一个抽象类 `ImageSource`，你可以继承它并实现相应方法之后以默认方式导出，就可以作为 Koishi 插件被加载，便于快速开发图源插件。

## 准备工作

在此，我们将假设你已经阅读了[认识插件](https://koishi.chat/zh-CN/guide/plugin/)，并且配置好了 Koishi 插件的开发环境。

图源插件需要继承的 `ImageSource` 类定义在 `koishi-plugin-booru` 包中，因此你需要将 `koishi-plugin-booru` 插件列为你的图源插件的对等依赖 (peerDependencies)。

```json
{
  "peerDependencies": {
    "booru": "^1.0.3"
  }
}
```

**请根据你所需求的功能酌情升级对等依赖的 booru 插件的版本**

## 开发图源插件

此处以 `lolicon` 插件为例，可以从 `https://api.lolicon.net/` 的 API 获取图片及元信息。

```ts
import { Context, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

class LoliconImageSource extends ImageSource<LoliconImageSource.Config> {
  constructor(ctx: Context, config: LoliconImageSource.Config) {
    super(ctx, config)
  }

  // 由于 `booru` 默认将标签转换为类 `danbooru` 的形式，即「空格分割标签，下划线替代空格」。
  // lolicon 支持的标签不带空格，因此此处需要将其重载为空格分割。
  override tokenize(query: string): string[] {
    return query.split(/\s+/)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const param = {
      tag: query.tags, // `tags` 是一个字符串数组，根据 Lolicon API 的文档，传入数组等于「与」操作。
      num: query.count, // 指定获取数量
    }
    // 注：根据图源设计规范，当 `query.tags` 为空数组或空时，应当返回随机图片。
    // 由于 Lolicon API 默认对空标签会返回随机图，因此不需要做特别处理，但对其他图源可能需要。
    const resp = await this.ctx.http.post('https://api.lolicon.app/setu/v2', param)

    if (!Array.isArray(resp.data)) {
      return
    }

    // 返回类型为 `Result` 的数组，可用字段可参考类型提示。
    // 其中 `url` 字段是图片的地址，也可以是 `base64` 编码。
    return resp.data.map((setu) => {
      return {
        url: setu.urls.original,
        title: setu.title,
        author: setu.author,
        nsfw: setu.r18,
        tags: setu.tags,
        pageUrl: `https://pixiv.net/i/${setu.pid}`,
      }
    })
  }
}

namespace LoliconImageSource {
  export interface Config extends ImageSource.Config {}

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'lolicon' }),
  ])
}

// 以默认导出方式导出整个命名空间
export default LoliconImageSource
```
