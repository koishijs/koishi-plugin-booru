import { Context, Schema } from 'koishi'

export abstract class ImageSource<Config extends ImageSource.Config = ImageSource.Config> {
  static using = ['booru']

  languages: string[] = []
  source: string

  constructor(public ctx: Context, public config: Config) {
    this.ctx.booru.register(this)
  }

  /**
   * split query into tags, default implementation is comma-separated.
   * 
   * e.g. `tag1, wordy tag2, UPPER CASED tag3` => `['tag1', 'wordy_tag2', 'upper_cased_tag3']`
   */
  tokenize(query: string): string[] {
    return query.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.toLowerCase().replace(/\s+/g, '_'))
  }

  abstract get(query: ImageSource.Query): Promise<ImageSource.Result[]>
}

export namespace ImageSource {
  export interface Config {
    label: string
    weight: number
  }

  export function createSchema(o: { label: string }) {
    return Schema.object({
      label: Schema.string().default(o.label).description('图源标签，可用于在指令中手动指定图源。'),
      weight: Schema.number().min(1).default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
    }).description('全局设置')
  }

  export const Config: Schema<Config> = createSchema({ label: 'default' })

  export interface Query {
    tags: string[]
    /** raw query */
    raw: string
    count: number
  }

  export type NsfwType = 'furry' | 'guro' | 'shota' | 'bl'

  export interface Result {
    url: string
    pageUrl?: string
    author?: string
    authorUrl?: string
    title?: string
    desc?: string
    tags?: string[]
    nsfw?: boolean | NsfwType
  }
}
