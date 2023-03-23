import { Context, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Lolicon } from './types'

class LoliconImageSource extends ImageSource<LoliconImageSource.Config> {
  languages = ['en', 'zh-CN', 'ja']

  constructor(ctx: Context, config: LoliconImageSource.Config) {
    super(ctx, config)
  }

  override tokenize(query: string) {
    return query.split(/\s+/)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const proxy = typeof this.config.proxy === 'string' ? this.config.proxy : this.config.proxy?.endpoint
    const param: Lolicon.Request = {
      r18: this.config.r18,
      tag: query.tags,
      num: query.count,
      proxy,
    }
    const resp = await this.ctx.http.post<Lolicon.Response>(this.config.endpoint, param)

    if (!Array.isArray(resp.data)) {
      return
    }

    return resp.data.map((setu) => {
      return {
        url: setu.urls.original,
        title: setu.title,
      }
    })
  }
}

namespace LoliconImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    r18: number
    proxy: { endpoint: string } | string
  }

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      label: Schema.string().default('lolicon').description('图源标签，可用于在指令中手动指定图源。'),
      weight: Schema.number().min(1).default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    }).description('全局设置'),
    Schema.object({
      endpoint: Schema.string().description('Lolicon API 的 URL。').default('https://api.lolicon.app/setu/v2'),
      r18: Schema.union([
        Schema.const(0).description('非 R18'),
        Schema.const(1).description('仅 R18'),
        Schema.const(2).description('混合'),
      ]).description('是否检索 R18 图片。').default(0),
      proxy: Schema.union([
        Schema.const('i.pixiv.re'),
        Schema.const('i.pixiv.cat'),
        Schema.object({
          endpoint: Schema.string().required().description('反代服务的地址。'),
        }).description('自定义'),
      ]).description('Pixiv 反代服务。').default('i.pixiv.re'),
    }).description('搜索设置'),
  ])
}

export default LoliconImageSource
