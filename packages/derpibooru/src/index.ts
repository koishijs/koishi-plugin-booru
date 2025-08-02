import { Context, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { Derpibooru } from './types'

class DerpibooruImageSource extends ImageSource<DerpibooruImageSource.Config> {
  languages = ['en']
  source = 'derpibooru'

  constructor(ctx: Context, config: DerpibooruImageSource.Config) {
    super(ctx, config)
  }

  get keyPair() {
    if (!this.config.keyPairs.length) return
    return this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://derpibooru.org/pages/api
    const params = {
      q: query.tags.join('+'),
      sf: 'random',
    }

    const data = await this.http.get<Derpibooru.Response>(
      trimSlash(this.config.endpoint) + '/api/v1/json/search/images',
      { params },
    )

    if (!Array.isArray(data.post)) {
      return
    }

    return data.post.map((post) => {
      return {
        // Size: file_url > sample_url > preview_url
        urls: {
          original: post.file_url,
          medium: post.sample_url,
          thumbnail: post.preview_url,
        },
        pageUrl: post.source,
        author: post.owner.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: ['explicit', 'questionable'].includes(post.rating),
      }
    })
  }
}

namespace DerpibooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    keyPairs: string[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'derpibooru' }),
    Schema.object({
      endpoint: Schema.string().default('https://derpibooru.org'),
      keyPairs: Schema.array(Schema.string().required().role('secret')).default([]),
    }).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

export default DerpibooruImageSource
