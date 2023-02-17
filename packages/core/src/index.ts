import { Context, Dict, Element, Random, Schema, Service, Session } from 'koishi'
import LanguageDetect from 'languagedetect'
import { ImageSource } from './source'

export * from './source'

declare module 'koishi' {
  interface Context {
    booru: ImageService
  }
}

class ImageService extends Service {
  private config: Config
  private sources: Dict<ImageSource> = {}
  private counter = 0

  private languageDetect = new LanguageDetect()

  constructor(ctx: Context, config: Config) {
    super(ctx, 'booru', true)
    this.config = config
  }

  register(source: ImageSource) {
    const id = ++this.counter
    this.sources[id] = source
    return this.caller.collect('booru', () => delete this.sources[id])
  }

  async get(query: ImageService.Query) {
    const weightMap = Object.fromEntries(Object.entries(this.sources)
      .filter(([key, source]) => {
        if (query.labels.length && !query.labels.includes(source.config.label)) return false
        if (this.config.detectLanguage) {
          const probabilities = this.languageDetect.detect(query.raw, 3).filter((x) => x[1] > this.config.confidence)
          if (!probabilities.length) {
            // if no language detected, just treat it as any language
            return true
          }
          return probabilities.some(([lang]) => source.languages.includes(lang))
        }
        return true
      })
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

export enum OutputType {
  ImageOnly = 0,
  ImageAndInfo = 1,
  ImageAndLink = 2,
  All = 3,
}

export interface Config {
  detectLanguage: boolean
  confidence: number
  output: OutputType
}

export const Config = Schema.intersect([
  Schema.union([
    Schema.object({
      detectLanguage: Schema.boolean().default(false).description('自动检测输入语言并选择语言匹配的图源。'),
    }),
    Schema.object({
      detectLanguage: Schema.const(true).description('自动检测输入语言并选择语言匹配的图源。'),
      confidence: Schema.number().default(0.5).description('语言检测的置信度。'),
    }),
  ]).description('搜索设置'),
  Schema.object({
    output: Schema.union([
      Schema.const(0).description('仅发送图片'),
      Schema.const(1).description('发送图片和相关信息'),
      Schema.const(2).description('发送图片、相关信息和链接'),
      Schema.const(3).description('发送全部信息'),
    ]).description('输出方式。').default(1),
  }).description('输出设置'),
])

export function apply(ctx: Context, config: Config) {
  ctx.plugin(ImageService, config)

  ctx.i18n.define('zh', require('./locales/zh-cn'))

  ctx
    .command('booru <query...>')
    .option('label', '-l <label:string>')
    .action(async ({ session, options }, query) => {
      query = query?.trim()
      if (!query) return session.execute('help booru')

      const image = await ctx.booru.get({
        tags: query.split(/\s+/),
        raw: query,
        labels: options.label?.split(',')?.map((x) => x.trim())?.filter(Boolean) ?? [],
      })

      if (!image) return session?.text('.no-result')

      const output: (string | Element)[] = []
      switch (config.output) {
        case OutputType.All:
          image.tags && output.unshift(session.text('.output.source', { ...image, tags: image.tags.join(' ') }))
        case OutputType.ImageAndLink:
          (image.pageUrl || image.authorUrl) && output.unshift(session.text('.output.link', image))
        case OutputType.ImageAndInfo:
          image.title && image.author && image.desc && output.unshift(session.text('.output.info', image))
        case OutputType.ImageOnly:
          output.unshift(session.text('.output.image', image))
      }

      return output.length === 1 ? output[0] : `<message forward>${output.join('\n')}</message>`
    })
}
