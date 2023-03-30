import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Moehu } from './types'

class MoehuImageSource extends ImageSource<MoehuImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: MoehuImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://img.moehu.org/
    const params = {
      id: query.tags,
      num: query.count,
      return: "json"
    }
    const url = trimSlash(this.config.endpoint) + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')
    const { data } = await this.ctx.http.axios<Moehu.Response>(url)

    if (!Array.isArray(data.pic)) {
      return
    }

    return data.pic.map((img) => {
      return {
        url: img,
      }
    })
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
