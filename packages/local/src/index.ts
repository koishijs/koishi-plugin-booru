/* eslint-disable no-throw-literal */
import { opendir } from 'node:fs/promises'
import { extname } from 'node:path'

import { Context, Logger, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import * as BooruLocalWebUI from './console'
import BooruLocalManager, { BooruTables } from './manager'
import { Image } from './types'
import { AsyncQueue, LRUCache, randomPick } from './utils'

class BooruLocalSource extends ImageSource<BooruLocalSource.Config> {
  static override inject = {
    required: ['booru', 'server', 'database'],
    optional: ['console', 'notifier'],
  }

  private logger: Logger
  private manager: BooruLocalManager

  constructor(ctx: Context, config: BooruLocalSource.Config) {
    super(ctx, config)
    this.languages = config.languages
    this.logger = ctx.logger('booru-local')

    this.manager = new BooruLocalManager(ctx, config)

    if (ctx.console) ctx.plugin(BooruLocalWebUI)

    ctx.on('ready', async () => {
      if (config.endpoint.length === 0) return this.logger.warn('No endpoint yet.')

      for await (const gallery of this.manager.scanGalleries(config.endpoint)) {
        const { id, path } = gallery
        const queuer = new AsyncQueue(10)
        const handle = await opendir(path)
        let temp: Image[] = []

        for await (const entry of handle) {
          if (entry.isFile() && config.extension.includes(extname(entry.name))) {
            queuer.run(async () => {
              const scaned = await this.manager.scanImage(path)

              if (!scaned) return

              temp.push({
                gid: id,
                created_at: new Date(),
                updated_at: new Date(),
                ...scaned,
              })
            })
          }

          if (temp.length >= 100) {
            await ctx.database.upsert(BooruTables.IMAGES, temp)
            temp = []
          }
        }

        // flush
        if (temp.length > 0) {
          await ctx.database.upsert(BooruTables.IMAGES, temp)
          temp = []
        }
      }
    })

    // file proxy
    ctx.server.get('/booru-local/i/:hash', async (context, next) => {
      const { hash } = context.params

      try {
        if (!hash || typeof hash !== 'string' || hash.length !== 32) throw [400, 'Bad Request']
        if (!context.headers.referer || context.headers.referer !== ctx.server.selfUrl) throw [403, 'Forbidden']

        const { filepath, mime } = await this.manager.queryByHash(hash)
        const cacher = new LRUCache<string, Buffer>(4096)

        if (!filepath) throw [404, 'Not Found']

        context.set({
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': `image/${mime}` || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        })
        context.body = await cacher.getElse(filepath, async () => {
          const readable = await this.manager.readableStream(filepath)
          return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = []
            readable.on('data', (chunk) => chunks.push(chunk))
            readable.on('end', () => resolve(Buffer.concat(chunks)))
            readable.on('error', (err) => reject(err))
          })
        })
      } catch (error) {
        context.status = error[0] || 500
        context.body = error[1] || 'Internal Server Error'
      } finally {
        context.status = context.status || 200
      }

      return next()
    })
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const { tags, count } = query
    const images = await this.manager.queryByTags(tags)
    const namedTags = await this.manager.namedTags(images.map(image => image.tags).flat())

    const results: ImageSource.Result[] = randomPick(images, count).map((image) => ({
      url: this.ctx.server.selfUrl + '/booru-local/i/' + image.id,
      urls: {
        original: this.ctx.server.selfUrl + '/booru-local/i/' + image.id,
      },
      tags: namedTags,
      pageUrl: image.source,
      author: image.author,
      nsfw: image.nsfw,
      title: image.mime ?? image.filename,
    }))

    return results
  }
}

namespace BooruLocalSource {
  export interface Config extends ImageSource.Config {
    endpoint: string[]
    extension: string[]
    languages: string[]
    buildByReload: boolean
    scraper: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'local' }),
    Schema.intersect([
      Schema.object({
        endpoint: Schema.array(Schema.path({ allowCreate: true, filters: ['directory'] })),
        buildByReload: Schema.boolean().default(false),
        languages: Schema.array(String).default(['zh-CN']),
      }),
      Schema.object({
        scraper: Schema.string().default('{filename}-{tag}'),
        extension: Schema.array(String).default(['.jpg', '.png', '.jpeg', '.gif']).collapse(),
      }),
    ]).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

export default BooruLocalSource
