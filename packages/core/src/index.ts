import { Context, Dict, Element, Logger, Quester, Schema, Service, Session } from 'koishi'
import LanguageDetect from 'languagedetect'
import { ImageSource } from './source'

export * from './source'

const logger = new Logger('booru')

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

  check() {
    return this.counter > 0
  }

  async get(query: ImageService.Query) {
    const sources = Object.values(this.sources)
      .filter((source) => {
        if (query.labels.length && !query.labels.includes(source.config.label)) return false
        if (this.config.detectLanguage) {
          const probabilities = this.languageDetect.detect(query.query, 3).filter((x) => x[1] > this.config.confidence)
          if (!probabilities.length) {
            // if no language detected, just treat it as any language
            return true
          }
          return probabilities.some(([lang]) => source.languages.includes(lang))
        }
        return true
      })
      .sort((a, b) => {
        if (a.config.weight !== b.config.weight) return a.config.weight - b.config.weight
        return Math.random() - 0.5
      })

    // return the first non-empty result
    for (const source of sources) {
      const tags = source.tokenize(query.query)
      const images = await source.get({ ...query, tags, raw: query.query }).catch((err) => {
        if (Quester.isAxiosError(err)) {
          logger.warn(`source ${source.config.label} request failed with code ${err.status} ${JSON.stringify(err.response?.data)}`)
        } else {
          logger.error(`source ${source.config.label} unknown error: ${err.message}`)
        }
        return []
      })
      if (images?.length) return images
    }

    return undefined
  }
}

namespace ImageService {
  export interface Query {
    query: string
    labels: string[]
    count: number
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
  maxCount: number
  output: OutputType
  nsfw: boolean
}

export const Config = Schema.intersect([
  Schema.intersect([
    Schema.union([
      Schema.object({
        detectLanguage: Schema.boolean().default(false).description('自动检测输入语言并选择语言匹配的图源。'),
      }),
      Schema.object({
        detectLanguage: Schema.const(true).description('自动检测输入语言并选择语言匹配的图源。'),
        confidence: Schema.number().default(0.5).description('语言检测的置信度。'),
      }),
    ]),
    Schema.object({
      maxCount: Schema.number().default(10).description('每次搜索的最大数量。'),
      nsfw: Schema.boolean().default(false).description('是否允许输出 NSFW 内容。'),
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

  const count = (value: string, session: Session) => {
    const count = parseInt(value)
    if (count < 1 || count > config.maxCount) {
      session.send('booru.count-invalid')
      return 1
    }
    return count
  }

  ctx
    .command('booru <query:text>')
    .option('count', '-c <count:number>', { type: count, fallback: 1 })
    .option('label', '-l <label:string>')
    .action(async ({ session, options }, query) => {
      if (!ctx.booru.check()) return session.text('.no-source')

      query = query?.trim() ?? ''

      let images = await ctx.booru.get({
        query,
        count: options.count,
        labels: options.label?.split(',')?.map((x) => x.trim())?.filter(Boolean) ?? [],
      })

      if (!images || !images.length) return session?.text('.no-result')

      images = images.filter((image) => config.nsfw || !image.nsfw)

      const output: (string | Element)[] = []
      for (const image of images) {
        switch (config.output) {
          case OutputType.All:
            if (image.tags)
              output.unshift(session.text('.output.source', { ...image, tags: image.tags.join(' ') }))
          case OutputType.ImageAndLink:
            if (image.pageUrl || image.authorUrl)
              output.unshift(session.text('.output.link', image))
          case OutputType.ImageAndInfo:
            if (image.title && image.author && image.desc)
              output.unshift(session.text('.output.info', image))
          case OutputType.ImageOnly:
            output.unshift(session.text('.output.image', image))
        }
      }

      return output.length === 1 ? output[0] : `<message forward>${output.join('\n')}</message>`
    })
}
