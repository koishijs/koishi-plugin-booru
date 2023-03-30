import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { SankakuComplex } from './types'

class SankakuComplexImageSource extends ImageSource<SankakuComplexImageSource.Config> {
  languages = ['en']

  constructor(ctx: Context, config: SankakuComplexImageSource.Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://chan.sankakucomplex.com/cn/help/api
    const params = {
      tags: query.tags.join('+') + "+order:random",
      limit: query.count
    }
    const url = trimSlash(this.config.endpoint) + '?' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')

    const { data } = await this.ctx.http.axios<SankakuComplex.Response[]>(url)

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        url: post.file_url,
        pageUrl: post.source,
        author: post.author.name.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.map(item => item.name.replace(/_/g, ' ')),
        nsfw: !['e', 'q'].includes(post.rating),
      }
    })
  }
}

namespace SankakuComplexImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'sankaku' }),
    Schema.object({
      endpoint: Schema.string().description('SankakuComplex 的 URL。').default('https://capi-v2.sankakucomplex.com/posts'),
    }).description('搜索设置'),
  ])
}

export default SankakuComplexImageSource
