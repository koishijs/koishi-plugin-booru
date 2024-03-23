import { Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { Lolicon } from './types'

class LoliconImageSource extends ImageSource<LoliconImageSource.Config> {
  languages = ['en', 'zh-CN', 'ja']
  source = 'lolicon'

  override tokenize(query: string) {
    return query.split(/\s+/)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const proxy = typeof this.config.proxy === 'string' ? this.config.proxy : this.config.proxy?.endpoint
    const param: Lolicon.Request = {
      r18: this.config.r18,
      tag: query.tags,
      num: query.count,
      excludeAI: this.config.excludeAI,
      proxy,
    }
    const resp = await this.http.post<Lolicon.Response>(this.config.endpoint, param)

    if (!Array.isArray(resp.data)) {
      return
    }

    return resp.data
      .filter((setu) => !(this.config.excludeAI && setu.aiType === 2))
      .filter((setu) => !!this.config.r18 || !!this.config.r18 === setu.r18)
      .map((setu) => {
        return {
          urls: {
            original: setu.urls.original,
            large: setu.urls.regular,
            medium: setu.urls.small,
            small: setu.urls.thumb,
            thumbnail: setu.urls.mini,
          },
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
  export interface Config extends ImageSource.Config {
    endpoint: string
    r18: number
    proxy: { endpoint: string } | string
    excludeAI: boolean
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'lolicon' }),
    Schema.object({
      endpoint: Schema.string().description('Lolicon API 的 URL。').default('https://api.lolicon.app/setu/v2'),
      r18: Schema.union([
        Schema.const(0).description('非 R18'),
        Schema.const(1).description('仅 R18'),
        Schema.const(2).description('混合'),
      ])
        .description('是否检索 R18 图片。')
        .default(0),
      proxy: Schema.union([
        Schema.const('i.pixiv.re'),
        Schema.const('i.pixiv.cat'),
        Schema.const('i.pixiv.nl'),
        Schema.object({
          endpoint: Schema.string().required().description('反代服务的地址。'),
        }).description('自定义'),
      ])
        .description('Pixiv 反代服务。')
        .default('i.pixiv.re'),
      excludeAI: Schema.union([
        Schema.const(true).description('排除AI作品'),
        Schema.const(false).description('不排除AI作品'),
      ])
        .description('是否排除 AI 作品。')
        .default(true),
    }).description('搜索设置'),
  ])
}

export default LoliconImageSource
