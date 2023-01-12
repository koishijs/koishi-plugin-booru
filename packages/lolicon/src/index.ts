import { Context, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { Lolicon } from  './types'

export interface Config extends ImageSource.Config {
  endpoint: string
  r18: number
  proxy: { endpoint: string } | string
}

export const Config = Schema.object({
  label: Schema.string().default('lolicon').description('图源标签，可用于在指令中手动指定图源。'),
  weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),

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
})

export const name = 'koishi-plugin-booru-lolicon'
export const using = ['booru']

export class LoliconImageSource extends ImageSource<Config> {
  constructor(ctx: Context, config: Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result> {
    const proxy = typeof this.config.proxy === 'string' ? this.config.proxy : this.config.proxy?.endpoint
    const param: Lolicon.Request = {
      r18: this.config.r18,
      tag: query.tags,
      proxy,
    }
    const resp = await this.ctx.http.post<Lolicon.Response>(this.config.endpoint, param)
    if (resp.data?.length) {
      const setu = resp.data[0]
      return {
        url: setu.urls.original,
        title: setu.title,
      }
    }
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.booru.register(new LoliconImageSource(ctx, config))
}
