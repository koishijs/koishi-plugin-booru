import { Context, Element, Logger, Quester, Schema, Service, Session } from 'koishi'
import LanguageDetect from 'languagedetect'
import { ImageSource } from './source'
import * as Command from './command'
import { } from '@koishijs/assets'

export * from './source'

const logger = new Logger('booru')

declare module 'koishi' {
  interface Context {
    booru: ImageService
  }
}

class ImageService extends Service {
  static inject = {
    required: [],
    optional: ['assets'],
  }
  private sources: ImageSource[] = []
  private languageDetect = new LanguageDetect()

  constructor(ctx: Context, config: Config) {
    super(ctx, 'booru', true)
    this.config = config
  }

  register(source: ImageSource) {
    const index = this.sources.length
    this.sources.push(source)
    return this[Context.current].collect('booru', () => delete this.sources[index])
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
          logger.warn(`source ${source.config.label} request failed ${err.status ? `with code ${err.status} ${JSON.stringify(err.response?.data)}` : ''}`)
        } else {
          logger.error(`source ${source.config.label} unknown error: ${err.message}`)
        }
        // log full error in debug mode, if user want to see it.
        logger.debug(err)
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

export enum OutputType {
  ImageOnly = 0,
  ImageAndInfo = 1,
  ImageAndLink = 2,
  All = 3,
}

export enum SpoilerType {
  Disabled = 0,
  All = 1,
  OnlyNSFW = 2,
}

export interface Config {
  detectLanguage: boolean
  confidence: number
  maxCount: number
  output: OutputType
  nsfw: boolean
  asset: boolean
  base64: boolean
  spoiler: SpoilerType
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
    asset: Schema.boolean().default(false).description('优先使用 [assets服务](https://assets.koishi.chat/) 转存图片。'),
    base64: Schema.boolean().default(false).description('使用 base64 发送图片。'),
    spoiler: Schema.union([
      Schema.const(0).description('禁用'),
      Schema.const(1).description('所有图片'),
      Schema.const(2).description('仅 NSFW 图片'),
    ]).description('发送为隐藏图片，单击后显示（在 QQ 平台中以「合并转发」发送）。').default(0).experimental(),
  }).description('输出设置'),
])


export function apply(ctx: Context, config: Config) {
  ctx.plugin(ImageService, config)
  ctx.plugin(Command, config)

  ctx.i18n.define('zh', require('./locales/zh-CN'))
}
