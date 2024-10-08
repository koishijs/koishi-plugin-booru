import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

import { Context, Logger, Random, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { Mapping } from './mapping'
import { scraper } from './scraper'
import { LocalStorage } from './types'
import { hash, mkdirs } from './utils'

declare module 'koishi' {
  interface Tables {
    booru_local: LocalStorage.Type
  }
}

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  static override inject = {
    required: ['booru'],
    optional: ['database', 'cache'],
  }

  languages = []
  source = 'local'
  private imageMap: LocalStorage.Type[] = []
  private logger: Logger

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.languages = config.languages
    this.logger = ctx.logger('booru-local')

    if (config.storage === 'database') {
      ctx.inject(['database'], async (ctx) => {
        ctx.model.extend(
          'booru_local',
          {
            storeId: 'string',
            storeName: 'text',
            imageCount: 'integer',
            imagePaths: 'list',
            images: 'json',
          },
          {
            autoInc: false,
            primary: 'storeId',
            unique: ['storeId', 'storeName'],
          },
        )

        this.imageMap = await ctx.database.get('booru_local', {})
      })
    }

    if (config.storage === 'file') {
      const absMap = resolve(ctx.root.baseDir, LocalImageSource.DataDir, LocalImageSource.RootMap)
      if (!existsSync(resolve(ctx.root.baseDir, LocalImageSource.DataDir))) {
        mkdirs(resolve(ctx.root.baseDir, LocalImageSource.DataDir))
      }

      if (existsSync(absMap)) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          this.imageMap = require(absMap) as LocalStorage.Type[]
        } catch (err) {
          readFile(absMap, 'utf-8')
            .then((map) => {
              this.imageMap = JSON.parse(map)
            })
            .catch((err) => {
              this.logger.error(err)
            })
        }
      }
    }

    // TODO: cache storage
    if (config.storage === 'cache') ctx.inject(['cache'], () => {})

    ctx.on(
      'ready',
      async () => {
        if (config.endpoint.length <= 0) return this.logger.warn('no folder yet')
        let mapping: Mapping = new Mapping(ctx.root.baseDir, config.storage)
        const imgScrap = scraper(config.scraper)
        const count = {
          folder: 0,
          images: 0,
        }
        this.logger.info('Initializing storages...')
        // duplicate check
        this.config.endpoint = [...new Set(this.config.endpoint)]
        if (this.imageMap.length > 0) mapping = mapping.update(this.imageMap)
        // mapping the folders to memory by loop
        for await (const path of config.endpoint) {
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
          const imgIndex = this.imageMap.findIndex((img) => img.storeId === store.storeId)
          if (imgIndex >= 0) this.imageMap[imgIndex] = store
          else this.imageMap.push(store)
        }
        this.logger.info(`${count.images} images in ${count.folder} folders is loaded.`)
        // save mapping
        if (config.storage === 'database') ctx.database.upsert('booru_local', this.imageMap, ['storeId', 'storeName'])
        else if (config.storage === 'file') {
          // TODO: fill this part
        }
        writeFile(
          resolve(ctx.root.baseDir, LocalImageSource.DataDir, LocalImageSource.RootMap),
          JSON.stringify(this.imageMap),
        )
      },
      true,
    )
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    if (this.imageMap.length < 1) return undefined
    let pickPool = []
    // Flatten all maps
    if (this.imageMap.length > 1) {
      for (const storage of this.imageMap) {
        if (query.tags.length > 0) {
          // filter by tags
          for (const image of storage.images) {
            if (query.tags.every((tag) => image.tags.includes(tag))) pickPool.push(image)
          }
        } else {
          // pick from all images
          pickPool.push(...storage.images)
        }
      }
    } else {
      // pick from one image map
      pickPool = this.imageMap
        .map((storage) => {
          if (query.tags.length > 0) {
            // filter by tags
            return storage.images.filter((image) => query.tags.every((tag) => image.tags.includes(tag)))
          } else {
            // pick from all images
            return storage.images
          }
        })
        .flat()
    }
    const picker = Random.pick(pickPool, query.count)
    return picker.map((img) => {
      return {
        urls: {
          original: pathToFileURL(img.path).href,
        },
        title: img.name,
        // nsfw: img.nsfw,
        tags: img.tags,
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
    Schema.intersect([
      Schema.object({
        // TODO: Schema.path()?
        endpoint: Schema.array(String),
        storage: Schema.union<Mapping.Storage>(['file', 'database']).default('file'),
        reload: Schema.boolean().default(false),
        languages: Schema.array(String).default(['zh-CN']),
      }),
      Schema.object({
        scraper: Schema.string().default('{filename}-{tag}'),
        extension: Schema.array(String).default(['.jpg', '.png', '.jpeg', '.gif']),
      }),
    ]).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

export default LocalImageSource
