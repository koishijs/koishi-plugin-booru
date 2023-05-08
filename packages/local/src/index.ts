import { Context, Logger, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { LocalStorage } from './types'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

class LocalImageSource extends ImageSource<LocalImageSource.Config> {
  languages = ['en', 'zh-CN', 'ja']
  private inited: boolean = false
  private imageMap: LocalStorage.Type[]
  private store: LocalStorage.Type
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

  init(paths: string[]) {
    const mapFileName = 'booru-map.json'
    paths.forEach(path => {
      readFile()
    })
  }

  pathFormat(path: string) {
    path = isAbsolute(path) ? path : resolve(__dirname, path)
  }

  scraperFormat(scraper: string, hash: string) {
    let filename: string
    let tags: string[]
    const unitData = scraper.split('-').forEach(rule => {
      rule.replace(/\{|\}/g, '')
      if (/[a-zA-Z,]/g.test(rule)) {
        if (rule.includes(',')) {
          tags = rule.split(',')
        } else {
          switch (rule) {
            case 'filename':
              filename = rule
              break;
            default:
              break;
          }
        }
      }
    })
    return { filename, tags, hash }
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
