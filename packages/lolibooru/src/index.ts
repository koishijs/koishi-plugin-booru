import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Lolibooru } from './types'

class LolibooruImageSource extends ImageSource<LolibooruImageSource.Config> {
  languages = ['en']
  source = 'lolibooru'

  constructor(ctx: Context, config: LolibooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://lolibooru.moe/help/api
    const params = {
      tags: query.tags.join('+') + "+order:random",
      limit: query.count
    }

    const url = trimSlash(this.config.endpoint) + '/post/index.json' + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const { data } = await this.ctx.http.axios<Lolibooru.Response[]>(url)

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

namespace LolibooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'lolibooru' }),
    Schema.object({
      endpoint: Schema.string().description('Lolibooru 的 URL。').default('https://lolibooru.moe'),
    }).description('搜索设置'),
  ])
}

export default LolibooruImageSource
