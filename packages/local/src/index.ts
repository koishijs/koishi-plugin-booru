import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

import { DataService } from '@koishijs/plugin-console'
import { Notifier } from '@koishijs/plugin-notifier'
import { Context, Logger, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import * as BooruLocalConsole from './console'
import { scraper } from './scraper'
import { ImageMetadata, IndexStore, IndexUserStore } from './types'
import { mkdirs } from './utils'

declare module '@koishijs/plugin-console' {
  interface Events {
    'booru-local/load-user-index': IndexUserStore
  }
}

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  static override inject = {
    required: ['booru'],
    optional: ['server', 'console', 'notifier'],
  }

  private logger: Logger
  private index: IndexStore = {
    version: 1,
    imageMap: new Map<string, ImageMetadata>(),
    updatedAt: -1,
    auxiliary: {
      tag: {},
      nsfw: { nsfw: [], safe: [] },
      author: {},
      hash: {},
    },
  }

  /**
   * User changes to the index will be observed here.
   */
  private indexObserve: Record<string, ImageMetadata> = {}
  private initialized = false
  private readonly dataDir = './data/booru-local'

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.languages = config.languages
    this.logger = ctx.logger('booru-local')

    ctx.on('ready', this.init.bind(this))

    ctx.inject(['console'], (ctx) => {
      ctx.plugin(BooruLocalConsole, {
        index: this.index,
        indexObserve: this.indexObserve,
      })
    })

    if (config.proxy && ctx.server) {
      ctx.server.get('/booru-local/:hash', async (ctx, next) => {
        const { hash } = ctx.params
        const source = this.index.auxiliary.hash?.[hash]
        if (!source) {
          ctx.status = 404
          ctx.body = 'Image not found'
        } else {
          ctx.status = 200
          ctx.type = 'image/' + extname(source).slice(1)
          ctx.body = Readable.from(await readFile(source))
        }
        return next()
      })
    }
  }

  private imageUrl(metadata: ImageMetadata): string {
    if (this.config.proxy) {
      const { hash } = metadata
      return new URL(`/booru-local/${hash}`, this.ctx.server.selfUrl).href
    } else {
      return pathToFileURL(metadata.sourcePath).href
    }
  }

  private get __pluginID() {
    return Object.keys(this.ctx.runtime.parent.config as Record<string, unknown>)
      .find(key => key.startsWith('booru-local')).split(':')[1]
  }

  private get indexFile() {
    return 'index.' + this.__pluginID + '.json'
  }

  private get indexUserFile() {
    return 'index.user.' + this.__pluginID + '.json'
  }

  private notifier = (content: string, type: Notifier.Type = 'primary') => this.ctx.notifier.create({
    type,
    content,
  })

  private async fileHash(path: string, hash: string = 'md5'): Promise<string> {
    const hasher = createHash(hash)
    const fStream = createReadStream(path)

    await pipeline(fStream, hasher)
    return hasher.digest('hex')
  }

  private async* readImageDir(dir: string): AsyncGenerator<string> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const absPath = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        yield* this.readImageDir(absPath)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (this.config.extension.includes(ext)) {
          yield absPath
        }
      }
    }
  }

  private async loadIndex(path: string) {
    try {
      const indexData = JSON.parse(await readFile(path, 'utf-8')) as IndexStore
      indexData.imageMap = new Map(Object.entries(indexData.imageMap))
      this.index = indexData
      return true
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`failed to load index from ${path}:`, error)
      }
    }
    return false
  }

  private async saveIndex(path: string) {
    const indexData: IndexStore = {
      version: 1,
      updatedAt: Date.now(),
      // Map to Object conversion for JSON serialization
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      imageMap: Object.fromEntries(this.index.imageMap),
      auxiliary: this.index.auxiliary,
    }

    try {
      const temp = `${this.indexFile}.tmp`
      await writeFile(temp, JSON.stringify(indexData))
      await rename(temp, path)
      this.logger.debug(`index saved to ${path}`)
    } catch (error) {
      this.logger.error(`failed to save index to ${path}:`, error)
    }
  }

  private async saveUserIndex() {
    const userIndex: IndexUserStore = {
      version: 1,
      updatedAt: Date.now(),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      imageMap: Object.fromEntries(this.indexObserve),
    }

    try {
      const temp = `${this.indexUserFile}.tmp`
      await writeFile(temp, JSON.stringify(userIndex))
      await rename(temp, resolve(this.ctx.root.baseDir, this.dataDir, this.indexUserFile))
      this.logger.debug(`user index saved to ${this.indexUserFile}`)
    } catch (error) {
      this.logger.error(`failed to save user index:`, error)
    }
  }

  private async loadUserIndex() {
    const userIndexPath = resolve(this.ctx.root.baseDir, this.dataDir, this.indexUserFile)
    try {
      const userIndexData = JSON.parse(await readFile(userIndexPath, 'utf-8')) as IndexUserStore
      this.indexObserve = new Proxy(Object.fromEntries(userIndexData.imageMap), {
        set: (target, key, value) => {
          if (typeof key !== 'string') return false
          this.indexObserve[key] = value
          this.saveUserIndex()
          return true
        },
        get: (target, key) => {
          if (typeof key !== 'string') return undefined
          return this.indexObserve[key]
        },
        has: (target, key) => {
          if (typeof key !== 'string') return false
          return key in this.indexObserve
        },
      })
      this.logger.debug(`user index loaded from ${userIndexPath}`)
      return true
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`failed to load user index from ${userIndexPath}:`, error)
      }
    }
    return false
  }

  async init() {
    if (this.config.endpoint.length === 0) {
      this.notifier('配置 endpoint 以使用本地图源', 'warning')
      return this.logger.warn('no folder yet.')
    }

    const absPath = resolve(this.ctx.root.baseDir, this.dataDir, this.indexFile)
    mkdirs(resolve(this.ctx.root.baseDir, this.dataDir))
    const folders = new Set(this.config.endpoint.map(p => resolve(this.ctx.root.baseDir, p)))
    const imageScraper = scraper(this.config.scraper)
    const loaded = await this.loadIndex(absPath)
    this.loadUserIndex()

    if (this.config.buildByReload || !loaded) {
      const startTime = Date.now()
      this.logger.info('building index, please wait...')
      try {
        for (const folder of folders) {
          for await (const imageFile of this.readImageDir(folder)) {
            if (this.index.imageMap.has(imageFile)) continue
            const imageHash = await this.fileHash(imageFile)
            // skip if the image already exists in the index
            if (this.index.imageMap.values().some(img => img.hash === imageHash)) continue
            const metadata = imageScraper(imageFile, imageHash)
            this.index.imageMap.set(basename(imageFile), metadata)
            // auxiliary index
            this.index.auxiliary.hash![imageHash] = imageFile
            metadata.tags?.forEach(tag => {
              this.index.auxiliary.tag![tag].push(imageFile)
            })
            if (metadata.nsfw) {
              this.index.auxiliary.nsfw!.nsfw.push(imageFile)
            } else {
              this.index.auxiliary.nsfw!.safe.push(imageFile)
            }
            if (metadata.author) {
              if (!this.index.auxiliary.author![metadata.author]) {
                this.index.auxiliary.author![metadata.author] = []
              }
              this.index.auxiliary.author![metadata.author].push(imageFile)
            }
          }
        }
      } catch (error) {
        this.logger.error('failed to build index:', error)
      }
      this.index.updatedAt = Date.now()
      await this.saveIndex(absPath)
      this.logger.info(`index built in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`)
    }
    this.notifier(`已加载本地图源，共 ${this.index.imageMap.size} 张图片`, 'success')
    this.initialized = true
  }

  private* filterImages(query: ImageSource.Query): Generator<ImageMetadata> {
    for (const metadata of this.index.imageMap.values()) {
      if (query.tags && !query.tags.every(tag => metadata.tags?.includes(tag))) continue
      yield metadata
    }
  }

  private createImageResult(metadata: ImageMetadata): ImageSource.Result {
    return {
      title: metadata.name,
      nsfw: metadata.nsfw || false,
      tags: metadata.tags || [],
      author: metadata.author || '',
      urls: {
        original: this.imageUrl(metadata),
      },
    }
  }

  private randomPick(generator: Generator<ImageMetadata>, count: number): ImageSource.Result[] {
    const results: ImageSource.Result[] = []
    const pikers: ImageMetadata[] = []
    let pickIndex = 0

    for (const item of generator) {
      if (results.length < count) {
        results.push(this.createImageResult(item))
      } else {
        const random = Math.floor(Math.random() * (pickIndex + 1))
        if (random < count) {
          pikers.push(item)

          if (pikers.length >= 5) {
            const replaceIndex = Math.floor(Math.random() * count)
            results[replaceIndex] = this.createImageResult(pikers.pop()!)
          }
        }
      }
      pickIndex++
    }

    while (pikers.length > 0) {
      const replaceIndex = Math.floor(Math.random() * count)
      results[replaceIndex] = this.createImageResult(pikers.pop()!)
    }

    return results
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    if (!this.initialized) return undefined

    const filtered = this.filterImages(query)

    return this.randomPick(filtered, query.count)
  }
}

namespace LocalImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string[]
    extension: string[]
    languages: string[]
    proxy: boolean
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
        proxy: Schema.boolean().default(false),
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

export class LocalImageSourceProvide extends DataService {}

export default LocalImageSource
