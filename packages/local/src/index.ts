import { Context, Logger, Random, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { scraper } from './scraper'
import { Mapping } from './mapping'
import { hash } from './utils/hash'
import { LocalStorage } from './types'

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  languages = []
  source = 'local'
  private imageMap: LocalStorage.Type[] = []
  private logger: Logger

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.languages = config.languages
    this.logger = ctx.logger('booru-local')

    ctx.on('ready', async () => {
      if (config.endpoint.length <= 0) {
        this.logger.warn('no folder yet')
        return
      } else {  
        const mapper = new Mapping(ctx.root.baseDir, config.storage)
        const imgScrap = scraper(config.scraper)
        this.logger.info('Initializing storages...')
        for await (let path of config.endpoint) {
          const store = await mapper.create(path, {
            extnames: config.extension
          })
          // create image informations
          for await (const image of store.imagePaths) {
            const imageHash = hash(await readFile(image))
            store.images.push(imgScrap(image, imageHash))
          }
        }
        this.logger.info('')
      }
    })
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
  export const usage = `
  ## 使用说明
  
  插件启动时会扫描文件夹并建立数据标记，这将会耗费较长的时间，请耐心等待。
  `
  export interface Config extends ImageSource.Config {
    endpoint: string[]
    extension: string[]
    languages: string[]
    scraper: string
    storage: Mapping.Storage
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'local' }),
    Schema.object({
      endpoint: Schema.array(String).description('图源文件夹，支持多个不同的文件夹'),
      storage: Schema.union<Mapping.Storage>(['file', 'cache', 'database']).description('图源数据保存方式').default('file'),
      scraper: Schema.string().description('文件名元信息生成格式，详见<a herf="https://booru.koishi.chat/plugins/local.html">文档</a>').default('{filename}-{tag}'),
      languages: Schema.array(String).description('支持的语言').default(['zh-CN']),
      extension: Schema.array(String).description('支持的扩展名').default(['.jpg', '.png', '.jpeg', '.gif'])
    }).description('图源设置')
  ])
}

export default LocalImageSource
