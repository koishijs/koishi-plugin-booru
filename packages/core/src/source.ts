import { Context, Quester, Schema } from 'koishi'

import type {} from '@koishijs/plugin-proxy-agent'
import type { Inject } from 'cordis'

export abstract class ImageSource<Config extends ImageSource.Config = ImageSource.Config> {
  static inject: string[] | Partial<Inject> = ['booru']

  languages: string[] = []
  source: string

  http: Quester

  constructor(
    public ctx: Context,
    public config: Config,
  ) {
    this.ctx.booru.register(this)

    this.http = config.proxyAgent ? ctx.http.extend({ proxyAgent: config.proxyAgent }) : ctx.http
  }

  /**
   * split query into tags, default implementation is comma-separated.
   *
   * e.g. `tag1, wordy tag2, UPPER CASED tag3` => `['tag1', 'wordy_tag2', 'upper_cased_tag3']`
   */
  tokenize(query: string): string[] {
    return query
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.toLowerCase().replace(/\s+/g, '_'))
  }

  abstract get(query: ImageSource.Query): Promise<ImageSource.Result[]>
}

export namespace ImageSource {
  export interface Config {
    label: string
    weight: number
    proxyAgent: string
  }

  export function createSchema(o: { label: string }) {
    return Schema.intersect([
      Schema.object({
        label: Schema.string().default(o.label).description('图源标签，可用于在指令中手动指定图源。'),
        weight: Schema.number()
          .min(1)
          .default(1)
          .description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
      }).description('全局设置'),
      Schema.object({
        proxyAgent: Schema.string().default(undefined).description('请求图片时使用代理服务器。'),
      }).description('请求设置'),
    ])
  }

  export const Config: Schema<Config> = createSchema({ label: 'default' })

  export interface Query {
    tags: string[]
    /** raw query */
    raw: string
    count: number
  }

  export type NsfwType = 'furry' | 'guro' | 'shota' | 'bl'

  export enum PreferSize {
    Original = 'original',
    Large = 'large',
    Medium = 'medium',
    Small = 'small',
    Thumbnail = 'thumbnail',
  }

  export interface Result {
    /** @deprecated Use `.urls.*` instead */
    url?: string
    urls: Partial<Record<Exclude<PreferSize, 'origin'>, string>> & { original: string }
    pageUrl?: string
    author?: string
    authorUrl?: string
    title?: string
    desc?: string
    tags?: string[]
    nsfw?: boolean | NsfwType
  }
}

export const preferSizes = ['thumbnail', 'large', 'medium', 'small', 'original'] as const
