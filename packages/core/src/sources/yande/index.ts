import { createHash } from 'node:crypto'

import { Schema, trimSlash } from 'koishi'

import { ImageSource } from '../../source'

import { Yande } from './types'

/**
 * Yande.re requires a password hash for authentication.
 *
 * @see https://yande.re/help/api
 */
function hashPassword(password: string) {
  const salted = `choujin-steiner--${password}--`
  // do a SHA1 hash of the salted password
  const hash = createHash('sha1')
  hash.update(salted)
  return hash.digest('hex')
}

class YandeImageSource extends ImageSource<YandeImageSource.Config> {
  languages = ['en']
  source = 'yande'

  get keyPair() {
    if (!this.config.keyPairs.length) return
    const key = this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
    return {
      login: key.login,
      password_hash: hashPassword(key.password),
    }
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://yande.re/help/api
    const params = {
      tags: [...query.tags, 'order:random'].join('+'),
      limit: query.count,
    }
    const url = trimSlash(this.config.endpoint) + '/post.json'

    const keyPair = this.keyPair
    if (keyPair) {
      params['login'] = keyPair.login
      params['password_hash'] = keyPair.password_hash
    }

    const data = await this.http.get<Yande.Response[]>(url, { params })

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

namespace YandeImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    keyPairs: {
      login: string
      password: string
    }[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'yande' }),
    Schema.object({
      endpoint: Schema.string().description('Yande.re 的 URL。').default('https://yande.re'),
      keyPairs: Schema.array(
        Schema.object({
          login: Schema.string().required().description('Yande.re 的用户名。'),
          password: Schema.string().required().role('secret').description('Yande.re 的密码。'),
        }),
      ).description('Yande.re 的登录凭据。'),
    }).description('搜索设置'),
  ])
}
export default YandeImageSource
