import { Context, Schema } from 'koishi'

export abstract class ImageSource<Config extends ImageSource.Config = ImageSource.Config> {
  languages: string[] = []

  constructor(public ctx: Context, public config: Config) {
    this.ctx.booru.register(this)
  }

  abstract get(query: ImageSource.Query): Promise<ImageSource.Result>
}

export namespace ImageSource {
  export interface Config {
    label: string
    weight: number
  }

  export const Config: Schema<Config> = Schema.object({
    label: Schema.string().default('default').description('图源标签，可用于在指令中手动指定图源。'),
    weight: Schema.number().description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),
  })

  export interface Query {
    tags: string[]
    /** raw query */
    raw: string
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
