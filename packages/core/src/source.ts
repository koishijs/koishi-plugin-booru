import { Context, Element, Quester, Schema } from 'koishi'

import type {} from '@cordisjs/plugin-proxy-agent'

export abstract class ImageSource<Config extends ImageSource.Config = ImageSource.Config> {
  static inject: string[] | Partial<Record<'required' | 'optional', string[]>> = ['booru']

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
        label: Schema.string().default(o.label),
        weight: Schema.number().min(1).default(1),
      }),
      Schema.object({
        proxyAgent: Schema.string().default(undefined),
      }),
    ]).i18n({
      'zh-CN': require('./locales/zh-CN.source.schema.yml'),
    })
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
    urls: Partial<Record<Exclude<PreferSize, 'original'>, string>> & { original: string }
    pageUrl?: string
    author?: string
    authorUrl?: string
    title?: string
    desc?: string | Element
    tags?: string[]
    nsfw?: boolean | NsfwType
  }
}

export const preferSizes = ['thumbnail', 'large', 'medium', 'small', 'original'] as const
export const sizeNameToFixedWidth: Partial<Record<(typeof preferSizes)[number], number>> = {
  thumbnail: 128,
  small: 320,
  medium: 640,
  large: 1280,
} as const
