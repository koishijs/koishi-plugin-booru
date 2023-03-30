import { Context, Schema, trimSlash } from 'koishi'
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
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'yande' }),
    Schema.object({
      endpoint: Schema.string().description('Yande.re 的 URL。').default('https://yande.re'),
    }).description('搜索设置'),
  ])
}

export default YandeImageSource
