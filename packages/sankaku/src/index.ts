import { Context, Schema } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import * as consts from './constants'
import { SankakuComplex } from './types'

class SankakuComplexImageSource extends ImageSource<SankakuComplexImageSource.Config> {
  languages = ['en']
  source = 'sankaku'
  reusable = true

  constructor(ctx: Context, config: SankakuComplexImageSource.Config) {
    super(ctx, config)
    this.http = this.http.extend({
      headers: {
        'User-Agent': config.userAgent,
      },
    })
  }

  get keyPair() {
    if (!this.config.keyPairs.length) return
    return this.config.keyPairs[Math.floor(Math.random() * this.config.keyPairs.length)]
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    // API docs: https://chan.sankakucomplex.com/cn/help/api (Link not available)
    const params = {
      tags: [...query.tags, 'order:random'].join('+'),
      limit: `${query.count}`,
    }

    const keyPair = this.keyPair
    if (!keyPair.accessToken) {
      await this._login(keyPair)
    }

    const data = await this.http.get<SankakuComplex.Response[]>(consts.POSTS_URL, {
      params,
      headers: keyPair.accessToken ? { Authentication: `${keyPair.tokenType} ${keyPair.accessToken}` } : {},
    })
    console.log(data)

    if (!Array.isArray(data)) return

    return data.map((post) => {
      return {
        urls: {
          original: post.file_url,
          medium: post.sample_url,
          thumbnail: post.preview_url,
        },
        pageUrl: post.source,
        author: post.author.name.replace(/ /g, ', ').replace(/_/g, ' '),
        tags: post.tags.map((t) => t.name.replace(/_/g, ' ')),
        nsfw: ['e', 'q'].includes(post.rating),
      }
    })
  }

  async _login(keyPair: SankakuComplexImageSource.KeyPair) {
    if (!keyPair.accessToken) {
      const data = await this.http.post<SankakuComplex.LoginResponse>(consts.LOGIN_URL, {
        login: keyPair.login,
        password: keyPair.password,
      })
      console.log(data)

      if (data.access_token) {
        keyPair.accessToken = data.access_token
        keyPair.tokenType = data.token_type

        this.ctx.setTimeout(() => {
          this.ctx.scope.update(this.config)
        }, 0)
      }
    }
    return keyPair
  }
}

namespace SankakuComplexImageSource {
  export interface KeyPair {
    login?: string
    password?: string
    tokenType?: string
    accessToken?: string
  }

  export interface Config extends ImageSource.Config {
    keyPairs: KeyPair[]
    userAgent: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'sankaku' }),
    Schema.object({
      keyPairs: Schema.array(
        Schema.object({
          login: Schema.string().required(),
          password: Schema.string().required().role('secret'),
          tokenType: Schema.string().hidden().default('Bearer'),
          accessToken: Schema.string().hidden(),
        }),
      ).default([]),
      userAgent: Schema.string().default(
        // eslint-disable-next-line max-len
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ),
    }).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

export default SankakuComplexImageSource
