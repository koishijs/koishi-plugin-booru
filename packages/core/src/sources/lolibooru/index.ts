import { createHash } from 'node:crypto'

import { Dict, Schema, trimSlash } from 'koishi'

import { ImageSource } from '../../source'

import { Lolibooru } from './types'

/**
 * Lolibooru requires a password hash for authentication.
 *
 * @see https://lolibooru.moe/help/api
 */
function hashPassword(password: string) {
  const salted = `--${password}--`
  // do a SHA1 hash of the salted password
  const hash = createHash('sha1')
  hash.update(salted)
  return hash.digest('hex')
}

class LolibooruImageSource extends ImageSource<LolibooruImageSource.Config> {
  languages = ['en']
  source = 'lolibooru'

  get keyPair() {
    if (!this.config.keyPairs.length) return
    const key = this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
    return {
      login: key.login,
      password_hash: hashPassword(key.password),
    }
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://lolibooru.moe/help/api
    const params: Dict<string> = {
      tags: query.tags.join('+') + '+order:random',
      limit: `${query.count}`,
    }

    const url = trimSlash(this.config.endpoint) + '/post/index.json'

    const keyPair = this.keyPair
    if (keyPair) {
      params['login'] = keyPair.login
      params['password_hash'] = keyPair.password_hash
    }
    const data = await this.http.get<Lolibooru.Response[]>(url, { params: new URLSearchParams(params) })

    if (!Array.isArray(data)) {
      return
    }

    return data.map((post) => {
      return {
        // Since lolibooru returns URL that contains white spaces that are not transformed
        // into `%20`, which breaks in go-cqhttp who cannot resolve to a valid URL.
        // Fixes: https://github.com/koishijs/koishi-plugin-booru/issues/95
        urls: {
          original: encodeURI(post.file_url),
          medium: encodeURI(post.sample_url),
          thumbnail: encodeURI(post.preview_url),
        },
        pageUrl: post.source,
        author: post.author.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.split(' ').map((t) => t.replace(/_/g, ' ')),
        nsfw: ['e', 'q'].includes(post.rating),
      }
    })
  }
}

namespace LolibooruImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    keyPairs: { login: string; password: string }[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'lolibooru' }),
    Schema.object({
      endpoint: Schema.string().description('Lolibooru 的 URL。').default('https://lolibooru.moe'),
      keyPairs: Schema.array(
        Schema.object({
          login: Schema.string().required().description('用户名'),
          password: Schema.string().required().role('secret').description('密码'),
        }),
      ).description('Lolibooru 的登录凭据。'),
    }).description('搜索设置'),
  ])
}

export default LolibooruImageSource
