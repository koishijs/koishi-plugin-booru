import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Konachan } from './types'

class KonachanImageSource extends ImageSource<KonachanImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: KonachanImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const params = {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join('+') + "+order:random",
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '/post.json' + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')
    const { data } = await this.ctx.http.axios<Konachan.Response[]>(url)

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
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

namespace KonachanImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    userId?: string
    apiKey?: string
  }

  export const Config: Schema<Config> = Schema.object({
    label: Schema.string().default('konachan').description('图源标签，可用于在指令中手动指定图源。'),
    weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    endpoint: Schema.union([
      Schema.const('https://konachan.com/').description('konachan.com (NSFW)'),
      Schema.const('https://konachan.net/').description('konachan.net (SFW)')
    ]).description('konachan 的 URL。').default('https://konachan.com/'),
    userId: Schema.string().description('konachan 的用户名。').required(),
    apiKey: Schema.string().description('konachan 的 API Key。').required(),
  })
}

export default KonachanImageSource
