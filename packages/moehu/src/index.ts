import { closest, distance } from 'fastest-levenshtein'
import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import ids from '../data/ids.json'
import { Moehu } from './types'

const availableTags: string[] = Object.entries(ids).map(([k, v]) => [k, v]).flat()

class MoehuImageSource extends ImageSource<MoehuImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: MoehuImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://img.moehu.org/
    const params = {
      id: this.getSimilarTag(query.raw),
      num: query.count,
      return: "json"
    }
    const url = trimSlash(this.config.endpoint) + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')
    const data = await this.ctx.http.get<Moehu.Response>(url)

    if (!Array.isArray(data.pic)) {
      return
    }

    return data.pic.map((img) => {
      return {
        url: img,
      }
    })
  }

  getSimilarTag(tags: string) {
    const c = closest(tags, availableTags)
    // TODO: Maybe we should check the distance of `c` and `tags` then only return the resonable one?
    return c
  }
}

namespace MoehuImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'moehu' }),
    Schema.object({
      endpoint: Schema.string().description('Moehu 的 URL。').default('https://img.moehu.org/pic.php'),
    }).description('搜索设置'),
  ])
}

export default MoehuImageSource
