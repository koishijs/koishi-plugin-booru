import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Yande } from './types'

export interface Config extends ImageSource.Config {
  endpoint: string
  login?: string
  apiKey?: string
}

export const Config = Schema.object({
  label: Schema.string().default('yande').description('图源标签，可用于在指令中手动指定图源。'),
  weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),

  endpoint: Schema.string().description('yande 的 URL。').default('https://yande.re'),
  // login: Schema.string().description('yande 的用户名。').required(),
  // apiKey: Schema.string().description('yande 的 API Key。').required(),
})

export const name = 'koishi-plugin-booru-yande'
export const using = ['booru']

export class YandeImageSource extends ImageSource<Config> {
  languages = ['en']

  constructor(ctx: Context, config: Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const params = {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join('+') + "+order:random",
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '/post.json' + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const resp = await this.ctx.http.axios<Yande.Response[]>(url)
    console.log(resp.data)
    if (!Array.isArray(resp.data)) {
      throw new SessionError('commands.booru.message.no-response')
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

export function apply(ctx: Context, config: Config) {
  ctx.booru.register(new YandeImageSource(ctx, config))
}

