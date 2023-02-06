import { Context, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'


export interface Config extends ImageSource.Config {
  endpoint: string
  login: string
  apiKey: string
}

export const Config = Schema.object({
  label: Schema.string().default('danbooru').description('图源标签，可用于在指令中手动指定图源。'),
  weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),

  endpoint: Schema.string().description('Danbooru 的 URL。').default('https://danbooru.donmai.us/'),
  login: Schema.string().description('Danbooru 的用户名。').required(),
  apiKey: Schema.string().description('Danbooru 的 API Key。').required(),
})

export const name = 'koishi-plugin-booru-danbooru'
export const using = ['booru']

export class DanbooruImageSource extends ImageSource<Config> {
  constructor(ctx: Context, config: Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result> {
    const resp = await this.ctx.http.axios(trimSlash(this.config.endpoint) + '/posts.json', { params: {
      tags: query.tags.map((t) => t.replace(/ /g, '_')).join(' '),
      random: true,
      limit: 1,
    }})

    if (!Array.isArray(resp.data)) {
      throw new SessionError('commands.booru.message.no-response')
    }

    const post = resp.data[0]
    return {
      url: post.file_url,
    }
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.booru.register(new DanbooruImageSource(ctx, config))
}
