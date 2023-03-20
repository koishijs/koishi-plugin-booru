import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Lolibooru } from './types'

class LolibooruImageSource extends ImageSource<LolibooruImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: LolibooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const params = {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join('+') + "+order:random",
      limit: query.count
    }

    const url = trimSlash(this.config.endpoint) + '/post/index.json' + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const { data } = await this.ctx.http.axios<Lolibooru.Response[]>(url)

    if (!Array.isArray(data)) {
      throw new SessionError('commands.booru.message.no-response')
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
    login?: string
    apiKey?: string
  }

  export const Config: Schema<Config> = Schema.object({
    label: Schema.string().default('lolibooru').description('图源标签，可用于在指令中手动指定图源。'),
    weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    endpoint: Schema.string().description('lolibooru 的 URL。').default('https://lolibooru.moe'),
    login: Schema.string().description('lolibooru 的用户名。').required(),
    apiKey: Schema.string().description('lolibooru 的 API Key。').required(),
  })
}

export default LolibooruImageSource
