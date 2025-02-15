import { Computed, Context, Logger, HTTP, Schema, Service, remove } from 'koishi'
import LanguageDetect from 'languagedetect'

import * as Command from './command'
import { ImageSource } from './source'
import {} from '@koishijs/assets'
import {} from '@koishijs/canvas'

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
    optional: ['assets', 'canvas'],
  }

  private sources: ImageSource[] = []
  private languageDetect = new LanguageDetect()

  constructor(ctx: Context, config: Config) {
    super(ctx, 'booru', true)
    this.config = config
  }

  register(source: ImageSource) {
    return this[Context.origin].effect(() => {
      this.sources.push(source)
      return () => remove(this.sources, source)
    })
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
        if (HTTP.Error.is(err)) {
          logger.warn(
            [
              `source ${source.config.label} request failed`,
              err.response?.status ? `with code ${err.response?.status} ${JSON.stringify(err.response?.data)}` : '',
            ].join(' '),
          )
        } else {
          logger.error(`source ${source.config.label} unknown error: ${err.message}`)
        }
        // log full error in debug mode, if user want to see it.
        logger.debug(err)
        return []
      })
      if (images?.length) {
        return Object.assign(images, {
          source: source.source,
        })
      }
    }

    return undefined
  }

  async resizeImageToFixedWidth(url: string, size: number): Promise<string> {
    if (!size || size < 0) {
      return url
    }
    if (!this.ctx.canvas) {
      logger.warn('Canvas service is not available, thus cannot resize image now.')
      return url
    }
    const resp = await this.ctx
      .http(url, { method: 'GET', responseType: 'arraybuffer', proxyAgent: '' })
      .catch((err) => {
        if (HTTP.Error.is(err)) {
          logger.warn(
            `Request images failed with HTTP status ${err.response?.status}: ${JSON.stringify(err.response?.data)}.`,
          )
        } else {
          logger.error(`Request images failed with unknown error: ${err.message}.`)
        }
        return null
      })
    if (!resp?.data) {
      return url
    }

    const buffer = Buffer.from(resp.data)
    url = `data:${resp.headers.get('content-type')};base64,${buffer.toString('base64')}`
    try {
      const img = await this.ctx.canvas.loadImage(buffer)
      let width = img.naturalWidth
      let height = img.naturalHeight
      const ratio = size / Math.max(width, height)
      if (ratio < 1) {
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
        const canvas = await this.ctx.canvas.createCanvas(width, height)
        const ctx2d = canvas.getContext('2d')
        ctx2d.drawImage(img, 0, 0, width, height)
        url = await canvas.toDataURL('image/png')
        if (typeof canvas.dispose === 'function') {
          // skia-canvas does not have this method
          await canvas.dispose()
        }
      }
      if (typeof img.dispose === 'function') {
        await img.dispose()
      }
      return url
    } catch (err) {
      logger.error(`Resize image failed with error: ${err.message}.`)
      return url
    }
  }

  async imgUrlToAssetUrl(url: string): Promise<string> {
    return await this.ctx.assets.upload(url, Date.now().toString()).catch(() => {
      logger.warn('Request failed when trying to store image with assets service.')
      return null
    })
  }

  async imgUrlToBase64(url: string): Promise<string> {
    return this.ctx
      .http(url, { method: 'GET', responseType: 'arraybuffer', proxyAgent: '' })
      .then((resp) => {
        return `data:${resp.headers['content-type']};base64,${Buffer.from(resp.data).toString('base64')}`
      })
      .catch((err) => {
        if (HTTP.Error.is(err)) {
          logger.warn(
            `Request images failed with HTTP status ${err.response?.status}: ${JSON.stringify(err.response?.data)}.`,
          )
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
  outputMethod: 'one-by-one' | 'merge-multiple' | 'forward-all' | 'forward-multiple'
  preferSize: ImageSource.PreferSize
  autoResize: Computed<boolean>
  nsfw: boolean
  blacklist: string[]
  asset: boolean
  base64: boolean
  spoiler: SpoilerType
  showTips: boolean
}

interface ImageArray extends Array<ImageSource.Result> {
  source: string
}

export const Config = Schema.intersect([
  Schema.intersect([
    Schema.union([
      Schema.object({
        detectLanguage: Schema.boolean().default(false),
      }),
      Schema.object({
        detectLanguage: Schema.const(true),
        confidence: Schema.number().default(0.5),
      }),
    ]),
    Schema.object({
      maxCount: Schema.number().default(10),
      nsfw: Schema.boolean().default(false),
      blacklist: Schema.array(Schema.string()).default([]),
    }),
  ]),
  Schema.object({
    output: Schema.union([Schema.const(0), Schema.const(1), Schema.const(2), Schema.const(3)]).default(1),
    outputMethod: Schema.union([
      Schema.const('one-by-one'),
      Schema.const('merge-multiple'),
      Schema.const('forward-all'),
      Schema.const('forward-multiple'),
    ])
      .experimental()
      .role('radio')
      .default('merge-multiple'),
    preferSize: Schema.union([
      Schema.const('original'),
      Schema.const('large'),
      Schema.const('medium'),
      Schema.const('small'),
      Schema.const('thumbnail'),
    ]).default('large'),
    autoResize: Schema.computed(Schema.boolean()).experimental().default(false),
    asset: Schema.boolean().default(false),
    base64: Schema.boolean().default(false),
    spoiler: Schema.union([Schema.const(0), Schema.const(1), Schema.const(2)])
      .default(0)
      .experimental(),
    showTips: Schema.boolean().default(true),
  }),
]).i18n({
  'zh-CN': require('./locales/zh-CN.schema'),
})

export function apply(ctx: Context, config: Config) {
  // @ts-expect-error inject structure not compatible
  ctx.plugin(ImageService, config)
  // @ts-expect-error inject structure not compatible
  ctx.plugin(Command, config)

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ctx.i18n.define('zh', require('./locales/zh-CN'))
}
