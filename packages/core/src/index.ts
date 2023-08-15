import { Context, Element, Logger, Quester, Schema, Service, Session } from 'koishi'
import LanguageDetect from 'languagedetect'
import { ImageSource } from './source'
import { } from '@koishijs/assets'

export * from './source'

const logger = new Logger('booru')

declare module 'koishi' {
  interface Context {
    booru: ImageService
  }
}

class ImageService extends Service {
  private sources: ImageSource[] = []
  private languageDetect = new LanguageDetect()

  constructor(ctx: Context, private config: Config) {
    super(ctx, 'booru', true)
    this.config = config
  }

  register(source: ImageSource) {
    const index = this.sources.length
    this.sources.push(source)
    return this.caller.collect('booru', () => delete this.sources[index])
  }

  hasSource(name?: string): boolean {
    if (name) {
      return this.sources.some((source) => source.config.label === name)
    }
    return this.sources.some(Boolean)
  }

  async get(query: ImageService.Query): Promise<ImageArray> {
    const sources = this.sources
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
      const images = await source.get({ count: query.count, tags, raw: query.query }).catch((err) => {
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

  async imgUrlToAssetUrl(image: ImageSource.Result): Promise<string> {
    return await this.ctx.assets.upload(image.url, Date.now().toString()).catch(() => {
      logger.warn('Request failed when trying to store image with assets service.')
      return null
    })
  }

  async imgUrlToBase64(image: ImageSource.Result): Promise<string> {
    return this.ctx.http.axios(image.url, { method: 'GET', responseType: 'arraybuffer' }).then(resp => {
      return `data:${resp.headers['content-type']};base64,${Buffer.from(resp.data, 'binary').toString('base64')}`
    }).catch(err => {
      if (Quester.isAxiosError(err)) {
        logger.warn(`Request images failed with HTTP status ${err.status}: ${JSON.stringify(err.response?.data)}.`)
      } else {
        logger.error(`Request images failed with unknown error: ${err.message}.`)
      }
      return null
    })
  }
}

namespace ImageService {
  export interface Query {
    query: string
    labels: string[]
    count: number
  }
}

export type Layout = string

export interface Config {
  detectLanguage: boolean
  confidence: number
  maxCount: number
  layout: Layout[]
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
  Schema.intersect([
    Schema.object({
      asset: Schema.boolean().default(false).description('优先使用 [assets服务](https://assets.koishi.chat/) 转存图片。'),
      base64: Schema.boolean().default(false).description('使用 base64 发送图片。'),
      output: Schema.union([
        Schema.const(0).description('仅发送图片'),
        Schema.const(1).description('发送图片和少量信息'),
        Schema.const(2).description('发送图片和全部信息'),
        Schema.const(3).description('自定义布局'),
      ]).default(1),
    }).description('输出设置'),
    Schema.union([
      Schema.object({
        output: Schema.const(0),
        layout: Schema.const(['image']).hidden()
      }),
      Schema.object({
        output: Schema.const(1),
        layout: Schema.const(['image', 'title', 'author', 'description']).hidden()
      }),
      Schema.object({
        output: Schema.const(2),
        layout: Schema.const(['image', 'title', 'author', 'description', 'pageUrl', 'sourceUrl', 'tags', 'plugin']).hidden()
      }),
      Schema.object({
        output: Schema.const(3),
        layout: Schema.array(Schema.union([
          Schema.const('image').description('图片'),
          Schema.const('title').description('标题'),
          Schema.const('author').description('作者以及作者链接'),
          Schema.const('description').description('作品简介'),
          Schema.const('pageUrl').description('链接'),
          Schema.const('sourceUrl').description('源网站'),
          Schema.const('tags').description('标签'),
          Schema.const('plugin').description('图源插件名'),
        ]).default('image')
        ).description('输出布局').role('table').default(['image', 'author', 'description']),
      }),
    ])
  ])
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
      if (!ctx.booru.hasSource(options.label)) return session.text('.no-source')

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
        if (config.asset && ctx.assets) {
          image.url = await ctx.booru.imgUrlToAssetUrl(image)
          if (!image.url) {
            output.unshift(session.text('.no-image'))
            continue
          }
        }
        if (config.base64) {
          image.url = await ctx.booru.imgUrlToBase64(image)
          if (!image.url) {
            output.unshift(session.text('.no-image'))
            continue
          }
        }
        // switch (config.output) {
        //   case OutputType.All:
        //     if (image.tags)
        //       output.unshift(session.text('.output.source', { ...image, source, tags: image.tags.join(' ') }))
        //   case OutputType.ImageAndLink:
        //     if (image.pageUrl || image.authorUrl)
        //       output.unshift(session.text('.output.link', image))
        //   case OutputType.ImageAndInfo:
        //     if (image.title && image.author && image.desc)
        //       output.unshift(session.text('.output.info', image))
        //   case OutputType.ImageOnly:
        //     output.unshift(session.text('.output.image', image))
        // }
      }

      return output.length === 1 ? output[0] : `<message forward>${output.join('\n')}</message>`
    })
}
