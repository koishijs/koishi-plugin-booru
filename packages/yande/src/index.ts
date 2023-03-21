import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Yande } from './types'

class YandeImageSource extends ImageSource<YandeImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: YandeImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://yande.re/help/api
    const params = {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join('+') + "+order:random",
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '/post.json' + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const resp = await this.ctx.http.axios<Yande.Response[]>(url)

    if (!Array.isArray(resp.data)) {
      return
    }

    return resp.data.map((post) => {
      return {
        url: post.file_url,
        pageUrl: post.source,
        author: post.author.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: ['e', 'q'].includes(post.rating),
      }
    })
  }
}

namespace YandeImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    login?: string
    apiKey?: string
  }

  export const Config: Schema<Config> = Schema.object({
    label: Schema.string().default('yande').description('图源标签，可用于在指令中手动指定图源。'),
    weight: Schema.number().min(0).default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    endpoint: Schema.string().description('yande 的 URL。').default('https://yande.re'),
    login: Schema.string().description('yande 的用户名。').required(),
    apiKey: Schema.string().description('yande 的 API Key。').required(),
  })
}

export default YandeImageSource
