import { Context, Logger, Random, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { LocalStorage } from './types'
import { createHash } from 'node:crypto'
import { PathOrFileDescriptor, existsSync, readFileSync, readdirSync, statSync, writeFile } from 'node:fs'
import { basename, extname, isAbsolute, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  languages = ['en', 'zh-CN', 'ja']
  static source = 'local'
  static usage = `
## 使用说明

插件启动时会扫描文件夹并建立数据标记，这将会耗费较长的时间，请耐心等待。
`
  private imageMap: LocalStorage.Type[] = []
  private logger: Logger

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.logger = ctx.logger('booru-local')

    ctx.on('ready', () => {
      if (config.endpoint.length <= 0) {
        this.logger.warn('no folder yet')
        return
      } else {
        this.init(config.endpoint)
      }
    })
  }

  private hash(path: PathOrFileDescriptor, file: boolean = false) {
    return createHash('md5').update(file ? readFileSync(path) : path.toString()).digest('hex')
  }

  async init(paths: string[]) {
    const _name = 'booru-map.json'
    paths.forEach(path => {
      if (existsSync(path)) {
        const mapfile = resolve(this.ctx.root.baseDir, path, _name)
        const files = readdirSync(path)
        let mapset: LocalStorage.Type
        if (existsSync(mapfile)) {
          try {
            mapset = require(mapfile) as LocalStorage.Type
            if (files.length === mapset.imageCount) {
              this.imageMap.push(mapset)
              return
            }
          } catch (error) {
            this.logger.error(error)
            return
          }
        } else {
          if (!mapset)
            mapset = {
              storeId: this.hash(path),
              storeName: path.split(sep).at(-1),
              imageCount: 0,
              images: [],
              imagePaths: []
            }
        }
        mapset['imageCount'] = files.length
        // load image files
        files.forEach(f => {
          f = this.pathFormat(resolve(path, f))
          if (!mapset.imagePaths.includes(f)
            && statSync(f).isFile()
            && this.config.extension.includes(extname(f))
          ) {
            const imageHash = this.hash(f, true)
            mapset.images.push(this.scraperFormat(f, imageHash))
            mapset.imagePaths.push(imageHash)
          }
        })
        this.imageMap.push(mapset)
        this.logger.debug(`created image map '${mapset.storeId}' from memory`)
        writeFile(mapfile, JSON.stringify(mapset), err => {
          if (err) {
            this.logger.error(`failed store image map to '${mapfile}'`)
          }
          this.logger.debug(`stored image map '${mapset.storeId}' to '${mapfile}'`)
        })
      } else this.logger.error(`folder '${path}' is not found`)
    })
  }

  pathFormat(path: string) {
    return path = isAbsolute(path) ? path : resolve(this.ctx.root.baseDir, path)
  }

  scraperFormat(path: string, hash: string): LocalStorage.Response {
    const element = {
      filename: '(.+)',
      tag: '(\\[.+\\])'
    }

    const filename = basename(path, extname(path))
    const scraper = this.config.scraper.toLowerCase()
    const start = scraper.charAt(0) === '.' ? '^\.' : '^'
    const end = scraper.charAt(-1) === '+' ? '(.+)' : '$'
    const pattren = []
    scraper.replace(/^\./gm, '').replace(/\+$/gm, '') // delete `.` and `+`
    scraper.split('-').forEach(key => {
      key = key.slice(1, -1)
      if (Object.keys(element).includes(key)) pattren.push(element[key])
    })
    const rule = new RegExp(start + pattren.join('-') + end, 'gm')
    const unitData = rule.exec(filename)
    let name: string = ''
    let tags: string[] = []
    if (unitData == null) name = filename
    else {
      for (let i = 1; i < unitData.length; i++) {
        const e = unitData[i]
        if (/\[([^\]]+)\]/gm.test(e)) tags = e.slice(1, -1).replace('，', ',').split(',').map(s => s.trim())
        else if (/(.+)/gm.test(e) && i < unitData.length - 1) name = e
      }
    }
    return { name, tags, hash, path }
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
  export interface Config extends ImageSource.Config {
    endpoint: string[]
    extension: string[]
    scraper: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'local' }),
    Schema.object({
      endpoint: Schema.array(String).description('图源文件夹，支持多个不同的文件夹'),
      scraper: Schema.string().description('文件名元信息生成格式，详见<a herf="">文档</a>').default('{filename}-{tag}'),
      extension: Schema.array(String).description('支持的扩展名').default(['.jpg', '.png', '.jpeg', '.gif'])
    }).description('图源设置')
  ])
}

export default LocalImageSource
