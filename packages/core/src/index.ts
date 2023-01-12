import { Context, Dict, Random, Service } from 'koishi'
import { ImageSource } from './source'

export * from './source'

declare module 'koishi' {
  interface Context {
    booru: ImageService
  }
}

class ImageService extends Service {
  private sources: Dict<ImageSource> = {}
  private counter = 0

  constructor(ctx: Context) {
    super(ctx, 'booru', true)
  }

  register(source: ImageSource) {
    const id = ++this.counter
    this.sources[id] = source
    return this.caller.collect('booru', () => delete this.sources[id])
  }

  async get(query: ImageService.Query) {
    const weightMap = Object.fromEntries(Object.entries(this.sources)
      .filter(([key, source]) => query.labels.length === 0 || query.labels.includes(source.config.label))
      .map(([key, source]) => [key, source.config.weight] as const))
    const source = this.sources[Random.weightedPick(weightMap)]
    return source?.get(query)
  }
}

namespace ImageService {
  export interface Query extends ImageSource.Query {
    labels: string[]
  }
}

export function apply(ctx: Context, config: unknown) {
  ctx.plugin(ImageService)

  ctx.i18n.define('zh', require('./locales/zh-cn'))

  ctx
    .command('booru <query...>')
    .option('label', '-l <label:string>')
    .action(async ({ session, options }, query) => {
      query = query?.trim()
      if (!query) return session.execute('help booru')

      const image = await ctx.booru.get({
        tags: query.split(/\s+/),
        labels: options.label?.split(',')?.map((x) => x.trim())?.filter(Boolean) ?? [],
      })

      if (!image) return session?.text('.no-result')

      return session?.text('.format', image)
    })
}
