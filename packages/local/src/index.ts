import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

import { Notifier } from '@koishijs/plugin-notifier'
import { } from '@koishijs/plugin-console'
import { Context, Logger, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { scraper } from './scraper'
import { mkdirs } from './utils'

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  static override inject = {
    required: ['booru', 'console', 'notifier'],
  }

  private logger: Logger
  private index: LocalImageSource.IndexStore = {
    version: '1',
    imageMap: new Map<string, LocalImageSource.ImageMetadata>(),
    auxiliary: {},
  }

  private initialized = false
  private readonly dataDir = './data/booru-local'

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.languages = config.languages
    this.logger = ctx.logger('booru-local')

    ctx.on('ready', this.init.bind(this))

    if (ctx.console) {
      ctx.console.addEntry({
        dev: resolve(__dirname, '../client/index.ts'),
        prod: resolve(__dirname, '../dist'),
      })
    }
  }

  private get indexFile() {
    const id = Object.keys(this.ctx.runtime.parent.config as Record<string, unknown>)
      .find(key => key.startsWith('booru-local')).split(':')[1]
    return `index.${id || 'default'}.json`
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
        if (this.config.extension.includes(`.${ext}`)) {
          yield absPath
        }
      }
    }
  }

  private async loadIndex(path: string) {
    try {
      const indexData = JSON.parse(await readFile(path, 'utf-8')) as LocalImageSource.IndexStore
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
    const indexData: LocalImageSource.IndexStore = {
      version: '1',
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

  private* filterImages(query: ImageSource.Query): Generator<LocalImageSource.ImageMetadata> {
    for (const metadata of this.index.imageMap.values()) {
      if (query.tags && !query.tags.every(tag => metadata.tags?.includes(tag))) continue
      yield metadata
    }
  }

  private createImageResult(metadata: LocalImageSource.ImageMetadata): ImageSource.Result {
    return {
      title: metadata.name,
      nsfw: metadata.nsfw,
      tags: metadata.tags || [],
      urls: {
        original: pathToFileURL(metadata.sourcePath).href,
      },
    }
  }

  private randomPick(generator: Generator<LocalImageSource.ImageMetadata>, count: number): ImageSource.Result[] {
    const results: ImageSource.Result[] = []
    const pikers: LocalImageSource.ImageMetadata[] = []
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

  export interface IndexStore {
    version: '1'
    imageMap: Map<string, ImageMetadata>
    updatedAt?: number
    auxiliary: IndexAuxiliary
  }

  export interface IndexAuxiliary {
    tag?: Record<string, string[]>
    nsfw?: { nsfw: string[]; safe: string[] }
  }

  export interface ImageMetadata {
    name: string
    hash: string
    tags?: string[]
    nsfw?: boolean
    sourcePath: string
  }

  export namespace Scraper {
    export type String = `#${Type}#${string}` | string
    export type Type = 'name' | 'meta'
    export type Function = (path: string, hash: string) => ImageMetadata
  }
}

export default LocalImageSource
