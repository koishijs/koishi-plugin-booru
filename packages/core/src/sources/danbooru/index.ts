import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from '../../source'
import { Danbooru } from './types'

class DanbooruImageSource extends ImageSource<DanbooruImageSource.Config> {
  languages = ['en']
  source = 'danbooru'

  constructor(ctx: Context, config: DanbooruImageSource.Config) {
    super(ctx, config)
  }

  get keyPair() {
    if (!this.config.keyPairs.length) return
    return this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const keyPair = this.keyPair
    const data = await this.http.get<Danbooru.Post[]>(trimSlash(this.config.endpoint) + '/posts.json', {
      params: {
        tags: query.tags.join(' '),
        random: true,
        limit: query.count,
        ...(keyPair ? { login: keyPair.login, api_key: keyPair.apiKey } : {}),
      },
    })

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        // Size: file_url > large_file_url > preview_file_url
        urls: {
          original: post.file_url,
          large: post.large_file_url,
          thumbnail: post.preview_file_url,
        },
        pageUrl: post.source,
        author: post.tag_string_artist.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tag_string.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: post.rating === 'e' || post.rating === 'q',
      }
    })
  }
}

namespace DanbooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    keyPairs: { login: string; apiKey: string }[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'danbooru' }),
    Schema.object({
      endpoint: Schema.string().description('Danbooru 的 URL。').default('https://danbooru.donmai.us/'),
      /**
       * @see https://danbooru.donmai.us/wiki_pages/help%3Aapi
       */
      keyPairs: Schema.array(
        Schema.object({
          login: Schema.string().required().description('用户名。'),
          apiKey: Schema.string().required().role('secret').description('API 密钥。'),
        }),
      ).description(
        'API 密钥对。[点击前往获取及设置教程](https://booru.koishi.chat/zh-CN/plugins/danbooru.html#获取与设置登录凭据)',
      ),
    }).description('搜索设置'),
  ])
}

export default DanbooruImageSource
