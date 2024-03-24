import { createHash } from 'node:crypto'

import { Dict, Schema, trimSlash } from 'koishi'

import { ImageSource } from '../../source'

import { Konachan } from './types'

/**
 * Konachan requires a password hash for authentication.
 *
 * @see https://konachan.net/help/api
 */
function hashPassword(password: string) {
  const salted = `So-I-Heard-You-Like-Mupkids-?--${password}--`
  // do a SHA1 hash of the salted password
  const hash = createHash('sha1')
  hash.update(salted)
  return hash.digest('hex')
}

class KonachanImageSource extends ImageSource<KonachanImageSource.Config> {
  languages = ['en']
  source = 'konachan'

  get keyPair() {
    if (!this.config.keyPairs.length) return
    const key = this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
    return {
      login: key.login,
      password_hash: hashPassword(key.password),
    }
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://konachan.net/help/api and https://konachan.com/help/api
    const params: Dict<string> = {
      tags: query.tags.join('+') + '+order:random',
      limit: `${query.count}`,
    }
    const url = trimSlash(this.config.endpoint) + '/post.json'

    const keyPair = this.keyPair
    if (keyPair) {
      params['login'] = keyPair.login
      params['password_hash'] = keyPair.password_hash
    }
    const data = await this.http.get<Konachan.Response[]>(url, { params: new URLSearchParams(params) })

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        urls: {
          original: post.file_url,
          medium: post.sample_url,
          thumbnail: post.preview_url,
        },
        pageUrl: post.source,
        author: post.author.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: ['e', 'q'].includes(post.rating),
      }
    })
  }
}

namespace KonachanImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    keyPairs: { login: string; password: string }[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'konachan' }),
    Schema.object({
      endpoint: Schema.union([
        Schema.const('https://konachan.com/').description('Konachan.com (NSFW)'),
        Schema.const('https://konachan.net/').description('Konachan.net (SFW)'),
      ])
        .description('Konachan 的 URL。')
        .default('https://konachan.com/'),
      keyPairs: Schema.array(
        Schema.object({
          login: Schema.string().required().description('用户名'),
          password: Schema.string().required().role('secret').description('密码'),
        }),
      ).description('Konachan 的登录凭据。'),
    }).description('搜索设置'),
  ])
}

export default KonachanImageSource
