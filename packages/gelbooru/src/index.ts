import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Gelbooru } from './types'

class GelbooruImageSource extends ImageSource<GelbooruImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: GelbooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://gelbooru.com/index.php?page=help&topic=dapi
    const params = {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join('+') + "+sort:random",
      page: 'dapi',
      s: 'post',
      q: "index",
      json: 1,
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const { data } = await this.ctx.http.axios<Gelbooru.Response>(url)

    if (!Array.isArray(data.post)) {
      return
    }

    return data.post.map((post) => {
      return {
        url: post.file_url,
        pageUrl: post.source,
        author: post.owner.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: ['explicit', 'questionable'].includes(post.rating),
      }
    })
  }
}

namespace GelbooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    userId: string
    apiKey: string
  }

  export const Config: Schema<Config> = Schema.object({
    label: Schema.string().default('gelbooru').description('图源标签，可用于在指令中手动指定图源。'),
    weight: Schema.number().min(1).default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    endpoint: Schema.string().description('gelbooru 的 URL。').default('https://gelbooru.com/index.php'),
    userId: Schema.string().description('gelbooru 的用户名。').required(),
    apiKey: Schema.string().description('gelbooru 的 API Key。').required(),
  })
}

export default GelbooruImageSource
