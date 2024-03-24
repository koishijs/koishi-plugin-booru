import { Schema, trimSlash } from 'koishi'

import { ImageSource } from '../../source'

import { Gelbooru } from './types'

class GelbooruImageSource extends ImageSource<GelbooruImageSource.Config> {
  languages = ['en']
  source = 'gelbooru'

  get keyPair() {
    if (!this.config.keyPairs.length) return
    return this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://gelbooru.com/index.php?page=help&topic=dapi
    const params = {
      tags: query.tags.join('+') + '+sort:random',
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      limit: query.count,
    }
    let url =
      trimSlash(this.config.endpoint) +
      '?' +
      Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

    const keyPair = this.keyPair
    if (keyPair) {
      // The keyPair from Gelbooru is already url-encoded.
      url += keyPair
    }

    const data = await this.http.get<Gelbooru.Response>(url)

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

namespace GelbooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    keyPairs: string[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'gelbooru' }),
    Schema.object({
      endpoint: Schema.string().description('Gelbooru 的 URL。').default('https://gelbooru.com/index.php'),
      keyPairs: Schema.array(Schema.string().required().role('secret'))
        .description('Gelbooru 的登录凭据。')
        .default([]),
    }).description('搜索设置'),
  ])
}

export default GelbooruImageSource
