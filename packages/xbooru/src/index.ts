import { Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { XbooruPost } from './types'

class XbooruImageSource extends ImageSource<XbooruImageSource.Config> {
  languages = ['en']
  source = 'xbooru'
  reusable = true

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://xbooru.com/index.php?page=help&topic=dapi
    const params = {
      tags: query.tags.join('+') + '+sort:random',
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      limit: query.count,
    }
    const url =
      trimSlash(this.config.endpoint) +
      '?' +
      Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

    // The JSON API returns a flat array of posts (unlike Gelbooru which wraps it in { post: [...] })
    const data = await this.http.get<XbooruPost[]>(url)

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        // Size: file_url > sample_url > preview_url
        urls: {
          original: post.file_url,
          medium: post.sample_url,
          thumbnail: post.preview_url,
        },
        pageUrl: post.source || undefined,
        author: post.owner.replace(/_/g, ' '),
        tags: post.tags.split(' ').filter(Boolean).map((t) => t.replace(/_/g, ' ')),
        nsfw: ['explicit', 'questionable'].includes(post.rating),
      }
    })
  }
}

namespace XbooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'xbooru' }),
    Schema.object({
      endpoint: Schema.string().default('https://xbooru.com/index.php'),
    }).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

export default XbooruImageSource
