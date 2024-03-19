import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from '../../source'
import { Safebooru } from './types'

class SafebooruImageSource extends ImageSource<SafebooruImageSource.Config> {
  languages = ['en']
  source = 'safebooru'

  constructor(ctx: Context, config: SafebooruImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://safebooru.org/index.php?page=help&topic=dapi
    const params = {
      // TODO random 无效
      tags: query.tags.join('+') + '+sort:random',
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      limit: query.count,
    }
    const url =
      trimSlash(this.config.endpoint) +
      '?' +
      Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

    const data = await this.http.get<Safebooru.Response[]>(url)

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        // Safebooru didn't straightly provide image urls, so we should construct them manually.
        // `sample` url only exists when the image is too large, in that case, `post.sample`
        // would be `true`, and then we could construct the sample url.
        urls: {
          original: `https://safebooru.org/images/${post.directory}/${post.image}?${post.id}`,
          large: post.sample
            ? `https://safebooru.org/samples/${post.directory}/sample_${post.image}?${post.id}`
            : undefined,
          thumbnail: `https://safebooru.org/thumbnails/${post.directory}/thumbnail_${post.image}?${post.id}`,
        },
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
