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
      .filter(([key, source]) => query.labels.includes(source.config.label))
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

export default ImageService
