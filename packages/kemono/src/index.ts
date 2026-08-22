import { Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { KemonoResponse, KemonoPost } from './types'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

class KemonoImageSource extends ImageSource<KemonoImageSource.Config> {
  languages = ['en']
  source = 'kemono'
  reusable = true

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API requires Accept: text/css header (as per site's anti-scraping measure)
    const http = this.http.extend({
      headers: { Accept: 'text/css' },
    })

    const params = {
      q: query.raw || query.tags.join(' '),
      limit: Math.min(query.count * 3, 50),
      o: 0,
    }

    const data = await http.get(
      `${this.config.endpoint}?${Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`,
    )

    if (!data?.posts?.length) {
      return
    }

    // Extract image files from posts
    const results: ImageSource.Result[] = []

    for (const post of data.posts) {
      const files: { name: string; path: string }[] = []

      // Main post file
      if (post.file?.path && IMAGE_EXTS.has(post.file.name?.split('.').pop() || '')) {
        files.push({ name: post.file.name!, path: post.file.path })
      }

      // Attachments
      for (const att of post.attachments || []) {
        if (att.path && IMAGE_EXTS.has(att.name?.split('.').pop() || '')) {
          files.push({ name: att.name!, path: att.path })
        }
      }

      for (const file of files) {
        results.push({
          urls: {
            original: `${this.config.dataEndpoint}${file.path}`,
          },
          title: post.title,
          tags: [post.service, post.user],
          nsfw: true, // kemono hosts NSFW content by default
        })
      }

      // Respect requested count
      if (results.length >= query.count) break
    }

    return results.length > 0 ? results : undefined
  }
}

namespace KemonoImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    dataEndpoint: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'kemono' }),
    Schema.object({
      endpoint: Schema.string().default('https://kemono.cr/api/v1/posts'),
      dataEndpoint: Schema.string().default('https://kemono.cr/data'),
    }).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

export default KemonoImageSource
