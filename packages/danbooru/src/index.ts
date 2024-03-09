import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Danbooru } from './types'

class DanbooruImageSource extends ImageSource<DanbooruImageSource.Config> {
  languages = ['en']
  source = 'danbooru'

  constructor(ctx: Context, config: DanbooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const data = await this.http<Danbooru.Post[]>(trimSlash(this.config.endpoint) + '/posts.json', { params: {
      tags: query.tags.join(' '),
      random: true,
      limit: query.count,
    }})

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
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
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'danbooru' }),
    Schema.object({
      endpoint: Schema.string().description('Danbooru 的 URL。').default('https://danbooru.donmai.us/'),
    }).description('搜索设置'),
  ])
}

export default DanbooruImageSource
