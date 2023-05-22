import { Context, Logger, Random, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { scraper } from './scraper'
import { Mapping } from './mapping'
import { hash, mkdirs } from './utils'
import { LocalStorage } from './types'

declare module 'koishi' {
  interface Tables {
    booru_local: LocalStorage.Type
  }
}

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  languages = []
  source = 'local'
  private imageMap: LocalStorage.Type[] = []
  private logger: Logger

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.languages = config.languages
    this.logger = ctx.logger('booru-local')

    if (this.config.storage === 'database') this.ctx.using(['database'], async (ctx, options) => {
      ctx.model.extend('booru_local', {
        storeId: 'string',
        storeName: 'text',
        imageCount: 'integer',
        imagePaths: 'list',
        images: 'json'
      }, {
        autoInc: false,
        primary: 'storeId',
        unique: ['storeId', 'storeName']
      })

      this.imageMap = await ctx.database.get('booru_local', {})
    })

    if (this.config.storage === 'file') {
      const absMap = resolve(ctx.root.baseDir, LocalImageSource.DataDir, LocalImageSource.RootMap)
      if (!existsSync(resolve(ctx.root.baseDir, LocalImageSource.DataDir)))
        mkdirs(resolve(ctx.root.baseDir, LocalImageSource.DataDir))

      if (existsSync(absMap)) {
        try {
          this.imageMap = require(absMap) as LocalStorage.Type[]
        } catch (err) {
          readFile(absMap, 'utf-8').then((map) => {
            this.imageMap = JSON.parse(map)
          }).catch((err) => {
            this.logger.error(err)
          })
        }
      }
    }

    // TODO: cache storage
    if (this.config.storage === 'cache') this.ctx.using(['cache'], () => { })

    ctx.on('ready', async () => {
      if (config.endpoint.length <= 0) return this.logger.warn('no folder yet')
      let mapping: Mapping = new Mapping(ctx.root.baseDir, config.storage)
      const imgScrap = scraper(config.scraper)
      const count = {
        folder: 0,
        images: 0
      }
      this.logger.info('Initializing storages...')
      if (this.imageMap.length > 0) mapping = mapping.update(this.imageMap)
      // mapping the folders to memory by loop
      for await (let path of config.endpoint) {
        const store = await mapping.create(path, { extnames: config.extension })
        const images = store.imagePaths.filter((path) => !store.images.map((img) => img.path).includes(path))
        // create image informations
        for await (const image of images) {
          const imageHash = hash(await readFile(image))
          store.images.push(imgScrap(image, imageHash))
        }
        store.imageCount = store.images.length
        count.folder++
        count.images = count.images + store.imagePaths.length
        const imgIndex = this.imageMap.findIndex(img => img.storeId === store.storeId)
        if (imgIndex >= 0)
          this.imageMap[imgIndex] = store
        else
          this.imageMap.push(store)
      }
      this.logger.info(`${count.images} images in ${count.folder} folders is loaded.`)
      // save mapping
      if (config.storage === 'database')
        ctx.database.upsert('booru_local', this.imageMap, ['storeId', 'storeName'])
      else if (config.storage === 'file') { }
      writeFile(resolve(ctx.root.baseDir, LocalImageSource.DataDir, LocalImageSource.RootMap), JSON.stringify(this.imageMap))
    }, true)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    if (this.imageMap.length < 1) return undefined
    const map = this.imageMap.length === 1 ? this.imageMap[0] : Random.pick(this.imageMap)
    if (query.tags.length > 0) {
      map.images = map.images.filter(img => [...new Set([...img.tags, ...query.tags])].length > 0)
    }
    const picker = Random.pick(map.images, query.count)
    return picker.map(img => {
      return {
        url: pathToFileURL(img.path).href,
        title: img.name,
        // nsfw: img.nsfw,
        tags: img.tags
      }
    })
  }
}

namespace LocalImageSource {
  export const RootMap = 'booru-maps.json'
  // export const FileRegex = /^booru\-M(.*).json$/g
  export const DataDir = './data/booru-local'
  export interface Config extends ImageSource.Config {
    endpoint: string[]
    extension: string[]
    languages: string[]
    reload: boolean
    scraper: string
    storage: Mapping.Storage
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'local' }),
    Schema.object({
      // TODO: Schema.path()?
      endpoint: Schema.array(String).description('图源文件夹，支持多个不同的文件夹'),
      storage: Schema.union<Mapping.Storage>(['file', 'database']).description('图源数据保存方式').default('file'),
      reload: Schema.boolean().description('每次启动时重新加载所有图片').default(false),
      languages: Schema.array(String).description('支持的语言').default(['zh-CN'])
    }).description('图源设置'),
    Schema.object({
      scraper: Schema.string().description('文件名元信息生成格式，详见<a herf="https://booru.koishi.chat/plugins/local.html">文档</a>').default('{filename}-{tag}'),
      extension: Schema.array(String).description('支持的扩展名').default(['.jpg', '.png', '.jpeg', '.gif'])
    }).description('文件设置')
  ])
}

export default LocalImageSource
