import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Safebooru } from './types'

export interface Config extends ImageSource.Config {
  endpoint: string
  login?: string
  apiKey?: string
}

export const Config = Schema.object({
  label: Schema.string().default('safebooru').description('图源标签，可用于在指令中手动指定图源。'),
  weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),

  endpoint: Schema.string().description('safebooru 的 URL。').default('https://safebooru.org/index.php'),
  login: Schema.string().description('safebooru 的用户名。').required(),
  apiKey: Schema.string().description('safebooru 的 API Key。').required(),
})

export const name = 'koishi-plugin-booru-safebooru'
export const using = ['booru']

export class SafebooruImageSource extends ImageSource<Config> {
  languages = ['en']

  constructor(ctx: Context, config: Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const params = {
      // TODO random 无效
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join('+') + "+sort:random",
      page: 'dapi',
      s: 'post',
      q: "index",
      json: 1,
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    console.log(url)

    const { data } = await this.ctx.http.axios<Safebooru.Response[]>(url)

    if (!Array.isArray(data)) {
      throw new SessionError('commands.booru.message.no-response')
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

export function apply(ctx: Context, config: Config) {
  ctx.booru.register(new SafebooruImageSource(ctx, config))
}
