# 图源

## Introduction

图源插件是用于获取图片的插件，它可以从网络、本地文件、剪贴板、数据库等地方获取图片。

由于图源插件本身也是一个标准的 [Koishi 插件](https://koishi.chat/zh-CN/guide/plugin/#%E6%8F%92%E4%BB%B6%E7%9A%84%E5%9F%BA%E6%9C%AC%E5%BD%A2%E5%BC%8F)，这意味着它必须导出一个函数，或者一个带有 `apply` 方法的对象。为了方便开发，我们提供了一个抽象类 `ImageSource`，当你继承它并实现相应方法后以默认方式导出，就可以作为 Koishi 插件被加载，这有助于插件作者快速开发图源插件。

## Prerequisite

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

此处以简化版的 `lolicon` 插件为例，可以从 `https://api.lolicon.net/` 的 API 获取图片及元信息。

```ts
import { Context, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

class LoliconImageSource extends ImageSource<LoliconImageSource.Config> {
  // 定义图源支持的语言
  // 如 lolicon 支持日语、英语和汉语-简体中文等
  languages: string[] = ['en', 'zh-CN', 'ja']

  constructor(ctx: Context, config: LoliconImageSource.Config) {
    // 调用父类的拟构函数以注册图源
    super(ctx, config)
  }

  // `booru` 默认将标签转换为类 `danbooru` 的形式，即「空格分割标签，下划线替代空格」。
  // 而 lolicon 支持的标签不带空格，因此此处需要将其重载为空格分割。
  override tokenize(query: string): string[] {
    return query.split(/\s+/)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const param = {
      // `tags` 是一个字符串数组，根据 Lolicon API 的文档，传入数组等于「与」操作。
      tag: query.tags,
      // 指定获取数量
      num: query.count,
    }
    // 注：根据图源设计规范，当 `query.tags` 为空数组或空时，应当返回随机图片。
    // 由于 Lolicon API 默认对空标签会返回随机图，因此不需要做特别处理，
    // 但对于其他图源可能需要传入特别的参数才能使用随机图片功能。
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

// 图源插件还需要导出配置项，因此我们采用 TypeScript 的 namespace
// 将配置项 Config 与上面的 class 定义合并。
namespace LoliconImageSource {
  export interface Config extends ImageSource.Config {}

  export const Config: Schema<Config> = Schema.intersect([
    // 结合使用 `Svchema.intersect` 和 `createSchema` 辅助函数，
    // 向图源插件的配置项里添加全局的通用配置，`label` 一般为图源插件名。
    ImageSource.createSchema({ label: 'lolicon' }),
  ])
}

// 以默认导出方式导出整个命名空间
export default LoliconImageSource
```

:::tip
上述代码为介绍与解释 `booru` 图源的开发步骤有一定简化，你可以直接在 [GitHub](https://github.com/koishijs/koishi-plugin-booru/tree/main/packages/lolicon) 上阅读 lolicon 插件真正的源码。
:::
