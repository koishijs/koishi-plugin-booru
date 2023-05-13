import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Konachan } from './types'

class KonachanImageSource extends ImageSource<KonachanImageSource.Config> {
  languages = ['en']
  source = 'konachan'

  constructor(ctx: Context, config: KonachanImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://konachan.net/help/api and https://konachan.com/help/api
    const params = {
      tags: query.tags.join('+') + "+order:random",
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
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'konachan' }),
    Schema.object({
      endpoint: Schema.union([
        Schema.const('https://konachan.com/').description('Konachan.com (NSFW)'),
        Schema.const('https://konachan.net/').description('Konachan.net (SFW)')
      ]).description('Konachan 的 URL。').default('https://konachan.com/'),
    }).description('搜索设置'),
  ])
}

export default KonachanImageSource
