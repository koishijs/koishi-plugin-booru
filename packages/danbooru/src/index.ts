import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Danbooru } from './types'

class DanbooruImageSource extends ImageSource<DanbooruImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: DanbooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const resp = await this.ctx.http.axios<Danbooru.Post[]>(trimSlash(this.config.endpoint) + '/posts.json', { params: {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join(' '),
      random: true,
      limit: query.count,
    }})

    if (!Array.isArray(resp.data)) {
      throw new SessionError('commands.booru.message.no-response')
    }

    return resp.data.map((post) => {
      return {
        url: post.file_url,
        pageUrl: post.source,
        author: post.tag_string_artist.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tag_string.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: post.rating === 'e' || post.rating === 'q',
      }
    })
  }
}

namespace DanbooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    login: string
    apiKey: string
  }

  export const Config: Schema<Config> = Schema.object({
    label: Schema.string().default('danbooru').description('图源标签，可用于在指令中手动指定图源。'),
    weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    endpoint: Schema.string().description('Danbooru 的 URL。').default('https://danbooru.donmai.us/'),
    login: Schema.string().description('Danbooru 的用户名。').required(),
    apiKey: Schema.string().description('Danbooru 的 API Key。').required(),
  })
}

export default DanbooruImageSource
