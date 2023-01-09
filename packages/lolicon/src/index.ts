import { Context, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { Lolicon } from  './types'

export interface Config extends ImageSource.Config {
  endpoint: string
  r18: number
}

export const Config = Schema.object({
  endpoint: Schema.string().description('Lolicon API 的 URL。').default('https://api.lolicon.app/setu/v2'),
  r18: Schema.union([
    Schema.const(0).description('非 R18'),
    Schema.const(1).description('仅 R18'),
    Schema.const(2).description('混合'),
  ]).description('是否检索 R18 图片。')
})

export const name = 'koishi-plugin-booru-lolicon'
export const using = ['booru']

export class LoliconImageSource extends ImageSource<Config> {
  constructor(ctx: Context, config: Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result> {
    const param: Lolicon.Request = {
      r18: this.config.r18,
      tag: query.tags,
    }
    const resp = await this.ctx.http.post<Lolicon.Response>(this.config.endpoint)
    if (resp.data?.length) {
      const setu = resp.data[0]
      return {
        url: setu.urls.original,
        desc: setu.tags.join(' '),
        title: setu.title,
      }
    }
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.booru.register(new LoliconImageSource(ctx, config))
}
