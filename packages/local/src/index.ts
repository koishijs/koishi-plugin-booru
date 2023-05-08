import { Context, Logger, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { LocalStorage } from './types'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFile } from 'node:fs'
import { basename, extname, isAbsolute, join, resolve } from 'node:path'

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  languages = ['en', 'zh-CN', 'ja']
  static usage = `
## 使用说明

插件启动时会扫描文件夹并建立数据标记，这将会耗费较长的时间，请耐心等待。
`
  private imageMap: LocalStorage.Type[]
  private logger: Logger

  constructor(ctx: Context, config: LocalImageSource.Config) {
    super(ctx, config)
    this.logger = ctx.logger('booru-local')

    ctx.on('ready', () => {
      if (config.endpoint.length <= 0) {
        this.logger.warn('no folder set')
        return
      } else {
        this.init(config.endpoint)
      }
    })
  }

  private hash(buf: any) {
    return createHash('md5').update(readFileSync(buf)).digest('hex')
  }

  async init(paths: string[]) {
    const _name = 'booru-map.json'
    paths.forEach(path => {
      if (existsSync(path)) {
        const mapfile = join(path, _name)
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
              imageCount: 0,
              images: [],
              imagePaths: []
            }
        }
        mapset['imageCount'] = files.length
        // load image files
        files.forEach(f => {
          f = this.pathFormat(f)
          if (!mapset.imagePaths.includes(f)
            && statSync(f).isFile()
            && this.config.extension.includes(extname(f))
          ) {
            const imageHash = this.hash(readFileSync(f))
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
    const eleRule = {
      filename: '(.+)',
      tag: '(\[(.+)\])'
    }

    const filename = basename(path, extname(path))
    const scraper = this.config.scraper.toLowerCase()
    const rules = []
    let pattren = '^'
    const end = scraper.charAt(-1) === '+' ? '(.+)' : '$'
    const rule = new RegExp(pattren + rules.join('-') + end)
    const unitData = rule.exec(filename)
    let name: string = ''
    let tags: string[] = []

    if (scraper.charAt(0) === '.') pattren += '\.'
    scraper.replace(/^\./gm, '').replace(/\+$/gm, '') // delete `.` and `+`
    scraper.split('-').forEach(ele => {
      ele = ele.slice(1, -1)
      if (Object.keys(eleRule).includes(ele)) rules.push(eleRule[ele])
    })

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
    // const proxy = typeof this.config.proxy === 'string' ? this.config.proxy : this.config.proxy?.endpoint
    // const param: LocalStorage.Request = {
    //   r18: this.config.r18,
    //   tag: query.tags,
    //   num: query.count,
    //   proxy,
    // }
    // const resp = await this.ctx.http.post<LocalStorage.Response>(this.config.endpoint, param)

    // if (!Array.isArray(resp.data)) {
    //   return
    // }

    // return resp.data.map((setu) => {
    //   return {
    //     url: setu.urls.original,
    //     title: setu.title,
    //     author: setu.author,
    //     nsfw: setu.r18,
    //     tags: setu.tags,
    //     pageUrl: `https://pixiv.net/i/${setu.pid}`,
    //   }
    // })
    return
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
      endpoint: Schema.array(String).description('图源文件夹，支持多个不同的文件夹').required(),
      scraper: Schema.string().description('文件名元信息生成格式，详见<a herf="">文档</a>').default('{filename}-{tag}'),
      extension: Schema.array(String).description('支持的扩展名').default(['.jpg', '.png', '.jpeg', '.gif'])
    }).description('图源设置')
  ])
}

export default LocalImageSource
