import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Safebooru } from './types'

class SafebooruImageSource extends ImageSource<SafebooruImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: SafebooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://safebooru.org/index.php?page=help&topic=dapi
    const params = {
      // TODO random 无效
      tags: query.tags.join('+') + "+sort:random",
      page: 'dapi',
      s: 'post',
      q: "index",
      json: 1,
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const { data } = await this.ctx.http.axios<Safebooru.Response[]>(url)

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        url: `https://safebooru.org//${post.sample ? 'samples' : 'images'}/${post.directory}/${post.sample ? 'sample_' : ''}${post.image}?${post.id}`,
        // pageUrl: post.source,
        author: post.owner.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: !['safe', 'general'].includes(post.rating),
      }
    })
  }
}

namespace SafebooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'safebooru' }),
    Schema.object({
      endpoint: Schema.string().description('Safebooru 的 URL。').default('https://safebooru.org/index.php'),
    }).description('搜索设置'),
  ])
}

export default SafebooruImageSource
