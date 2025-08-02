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
    const params: Derpibooru.RequestParams = {
      q: query.tags.join('+') || '*',
      sf: 'random',
    }

    if (this.keyPair) {
      params.key = this.keyPair
    }

    const data = await this.http.get(
      trimSlash(this.config.endpoint) + '/api/v1/json/search/images',
      { params },
    ) as Derpibooru.ImagesResponse

    if (!Array.isArray(data.images)) {
      return []
    }

    return data.images.slice(query.count).map((image) => {
      const rep = image.representations
      return {
        // Size: images.representations.{full,large,medium,small,tall,thumb,thumb_small,thumb_tiny}
        urls: {
          original: rep?.full,
          large: rep?.large,
          medium: rep?.medium,
          small: rep?.small,
          thumbnail: rep?.thumb || rep?.thumb_small || rep?.thumb_tiny,
        },
        pageUrl: `${trimSlash(this.config.endpoint)}/images/${image.id}`,
        author: image.uploader,
        tags: image.tags,
        authorUrl: image.uploader_id
          ? `${trimSlash(this.config.endpoint)}/profile/${image.uploader}`
          : undefined,
        desc: image.description,
        title: image.name,
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
