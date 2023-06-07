import { Context, Quester, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { e621 } from './types'

class e621ImageSource extends ImageSource<e621ImageSource.Config> {
  languages = ['en']
  source = 'e621'
  http: Quester

  constructor(ctx: Context, config: e621ImageSource.Config) {
    super(ctx, config)
    this.http = ctx.http.extend({
      headers: {
        'User-Agent': config.userAgent
      }
    })
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    if (!query.tags.find(t => t.startsWith('order:'))) query.tags.push('order:random')
    const resp = await this.http.axios<{
      posts: e621.Post[]
    }>(trimSlash(this.config.endpoint) + '/posts.json', { params: {
      tags: query.tags.join(' '),
      limit: query.count,
    }})

    if (!Array.isArray(resp.data.posts)) {
      return
    }

    return resp.data.posts.map((post) => {
      return {
        url: post.file.url,
        pageUrl: trimSlash(this.config.endpoint) + `/post/${post.id}`,
        author: post.tags.artist.join(', '),
        tags: Object.values(post.tags).flat(),
        nsfw: post.rating !== 's',
        desc: post.description,
      }
    })
  }
}

namespace e621ImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    userAgent: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'e621' }),
    Schema.object({
      endpoint: Schema.string().description('e621/e926 的 URL。').default('https:/e621.net/'),
      userAgent: Schema
      .string().description('设置请求的 User Agent。')
      .default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.37')
    }).description('搜索设置'),
  ])
}

export default e621ImageSource
