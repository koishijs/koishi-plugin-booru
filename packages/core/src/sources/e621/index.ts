import { Context, Quester, Schema, trimSlash } from 'koishi'

import { ImageSource } from '../../source'

import { e621 } from './types'

class e621ImageSource extends ImageSource<e621ImageSource.Config> {
  languages = ['en']
  source = 'e621'
  http: Quester

  constructor(ctx: Context, config: e621ImageSource.Config) {
    super(ctx, config)
    this.http = this.http.extend({
      headers: {
        'User-Agent': config.userAgent,
      },
    })
  }

  get keyPair() {
    if (!this.config.keyPairs.length) return
    return this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    if (!query.tags.find((t) => t.startsWith('order:'))) query.tags.push('order:random')
    const keyPair = this.keyPair
    const data = await this.http.get<{
      posts: e621.Post[]
    }>(trimSlash(this.config.endpoint) + '/posts.json', {
      params: {
        tags: query.tags.join(' '),
        limit: query.count,
      },
      headers: keyPair
        ? { Authorization: 'Basic ' + Buffer.from(`${keyPair.login}:${keyPair.apiKey}`).toString('base64') }
        : {},
    })

    if (!Array.isArray(data.posts)) {
      return
    }

    return data.posts.map((post) => {
      return {
        // Size: file > sample > preview
        urls: {
          original: post.file.url,
          medium: post.sample.url,
          thumbnail: post.preview.url,
        },
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
    keyPairs: { login: string; apiKey: string }[]
    userAgent: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'e621' }),
    Schema.object({
      endpoint: Schema.string().description('e621/e926 的 URL。').default('https://e621.net/'),
      keyPairs: Schema.array(
        Schema.object({
          login: Schema.string().required().description('e621/e926 的用户名。'),
          apiKey: Schema.string().required().role('secret').description('e621/e926 的 API Key。'),
        }),
      )
        .default([])
        .description('e621/e926 的登录凭据。'),
      userAgent: Schema.string().description('设置请求的 User Agent。').default(
        // eslint-disable-next-line max-len
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.37',
      ),
    }).description('搜索设置'),
  ])
}

export default e621ImageSource
