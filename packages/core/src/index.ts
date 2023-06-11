import { Context, Dict, Element, Logger, Quester, Schema, Service, Session } from 'koishi'
import LanguageDetect from 'languagedetect'
import { ImageSource } from './source'
import { } from 'koishi-plugin-assets-local'

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

  hasSource(name?: string): boolean {
    if (name) {
      return Object.values(this.sources).some((source) => source.config.label === name)
    }
    return Object.keys(this.sources).length > 0
  }

  async get(query: ImageService.Query): Promise<ImageArray> {
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
        if (a.config.weight !== b.config.weight) return b.config.weight - a.config.weight
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
      if (images?.length) return Object.assign(images, {
        source: source.source
      })
    }

    return undefined
  }

  async imgUrlToAssetUrl(image) {
    return 'http://' + await this.ctx.assets.upload(image.url, process.uptime().toString())
  }

  async imgUrlToBase64(image) {
    const buffer = await this.ctx.http.get(image.url, { responseType: 'arraybuffer' }).catch((err) => {
      if (Quester.isAxiosError(err)) {
        logger.warn(`request failed when switch a iamge to base64 format with code ${err.status} ${JSON.stringify(err.response?.data)}`)
      } else {
        logger.error(`unknown error when switch a iamge to base64 format: ${err.message}`)
      }
      return ''
    })
    return 'data:image/*;base64,' + Buffer.from(buffer, 'binary').toString('base64')
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
  asset: boolean
  base64: boolean
}

interface ImageArray extends Array<ImageSource.Result> {
  source: string
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
    asset: Schema.boolean().default(false).description('优先使用 assets 服务转存图片。'),
    base64: Schema.boolean().default(false).description('使用 base64 发送图片。')
  }).description('输出设置'),
])

export function apply(ctx: Context, config: Config) {
  ctx.plugin(ImageService, config)

  ctx.i18n.define('zh', require('./locales/zh-CN'))

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
      if (!ctx.booru.hasSource()) return session.text('.no-source')

      query = query?.trim() ?? ''

      const images = await ctx.booru.get({
        query,
        count: options.count,
        labels: options.label?.split(',')?.map((x) => x.trim())?.filter(Boolean) ?? [],
      })
      const source = images.source

      const filtered = images.filter((image) => config.nsfw || !image.nsfw)

      if (!filtered?.length) return session?.text('.no-result')

      const output: (string | Element)[] = []

      for (const image of filtered) {
        if (config.asset && ctx.assets) image.url = await ctx.booru.imgUrlToAssetUrl(image)
        if (config.base64) {
          image.url = await ctx.booru.imgUrlToBase64(image)
          if (!image.url) {
            output.unshift(session.text('.no-image'))
            continue
          }
        }
        switch (config.output) {
          case OutputType.All:
            if (image.tags)
              output.unshift(session.text('.output.source', { ...image, source, tags: image.tags.join(' ') }))
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
