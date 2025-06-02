import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'
import { ReadableStream } from 'node:stream/web'

import {} from '@koishijs/assets'
import {} from '@koishijs/plugin-server'

import { Context, HTTP, Random, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

import { PixivAppApi } from './types'
import { normaliseCaption } from './utils'

const CLIENT_ID = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
const CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'

class PixivImageSource extends ImageSource<PixivImageSource.Config> {
  static inject = {
    required: ['booru'],
    optional: ['assets', 'server'],
  }

  languages = ['en', 'zh', 'zh-CN', 'zh-TW', 'ja', 'ko']
  source = 'pixiv'

  private userId?: string
  private accessToken?: string
  private refreshToken?: string
  private refreshTime?: NodeJS.Timeout

  private logger = this.ctx.logger('booru-pixiv')

  constructor(ctx: Context, config: PixivImageSource.Config) {
    super(ctx, config)
    this.refreshToken = config.token

    if (config.bypassMethod === 'route') {
      if (!config.route || !this.ctx.server?.selfUrl) {
        throw new Error('route and selfUrl are required for bypass method "route".')
      }

      if (!config.aesKey) {
        // Generate a random AES key
        const aesKey = randomBytes(32).toString('hex')
        config.aesKey = aesKey
        this.ctx.setTimeout(() => ctx.scope.update(config, false), 0)
        this.logger.info("Found empty aesKey with a bypass method set to 'route', generated a random one in config.")
      }

      this.ctx.server.get(trimSlash(config.route) + '/:url(.+)', async (ctx, next) => {
        const url = ctx.request.url.replace(/^\/booru\/pixiv\/proxy\//, '')
        const decrypted = Cipher.decrypt(decodeURIComponent(url), config.aesKey)
        if (typeof decrypted !== 'string' || !decrypted.startsWith('https://i.pximg.net/')) return next()
        const file = await this.http<ReadableStream>(decrypted, {
          headers: { Referer: 'https://www.pixiv.net/' },
          responseType: 'stream',
        })
        ctx.set(Object.fromEntries(file.headers.entries()))
        ctx.remove('Content-Length')
        ctx.response.status = file.status
        ctx.response.message = file.statusText
        ctx.body = Readable.fromWeb(file.data)
        return next()
      })
    }
  }

  override tokenize(query: string) {
    return query.split(/\s+/)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    try {
      const data = await (query.raw.length ? this.search(query.tags.join(' ')) : this.recommend())

      return Promise.all(
        Random.shuffle(
          data.illusts
            .filter((illust) => illust.total_bookmarks > this.config.minBookmarks)
            .filter((illust) => illust.x_restrict <= this.config.rank)
            .filter((illust) => illust.illust_ai_type <= this.config.ai),
        )
          .slice(0, query.count)
          .map(async (illust) => {
            let url = ''
            if (illust.page_count > 1) {
              url = illust.meta_pages[0].image_urls.original
            } else {
              url = illust.meta_single_page.original_image_url
            }

            return {
              urls: {
                // TODO: fill up other urls
                original: await this._handleImage(url),
              },
              title: illust.title,
              pageUrl: `https://pixiv.net/i/${illust.id}`,
              author: illust.user.name,
              authorUrl: `https://pixiv.net/u/${illust.user.id}`,
              desc: normaliseCaption(illust.caption),
              tags: illust.tags.map((tag) => tag.name),
              nsfw: illust.x_restrict >= 1,
            }
          }),
      )
    } catch (err) {
      if (HTTP.Error.is(err)) {
        throw new Error('get pixiv image failed: ' + `${err.message} (${err.response?.status})`)
      } else {
        throw new Error('get pixiv image failed: ' + err)
      }
    }
  }

  async search(keyword: string): Promise<PixivAppApi.Result> {
    const url = '/v1/search/illust'
    const params: PixivAppApi.SearchParams = {
      word: keyword,
      search_target: this.config.target,
      search_ai_type: this.config.ai === 2 ? PixivAppApi.SearchAIType.SHOW_AI : PixivAppApi.SearchAIType.HIDE_AI,
      sort: this.config.sort,
      duration: this.config.duration !== 'all' && this.config.duration !== 'custom' ? this.config.duration : undefined,
      min_bookmarks: this.config.minBookmarks || undefined,
      max_bookmarks: this.config.maxBookmarks || undefined,
      filter: 'for_ios',
    }

    // remove undefined params
    Object.keys(params).forEach((key) => {
      if (params[key as keyof PixivAppApi.SearchParams] === undefined) {
        delete params[key as keyof PixivAppApi.SearchParams]
      }
    })

    if (!this.accessToken) {
      await this._login()
    }

    return await this.http.get<PixivAppApi.Result>(trimSlash(this.config.endpoint) + url, {
      params,
      headers: this._getHeaders(),
    })
  }

  async recommend(): Promise<PixivAppApi.Result> {
    const url = /* this.config.token ?  */ '/v1/illust/recommended' // : '/v1/illust/recommended-nologin'

    if (/* this.config.token &&  */ !this.accessToken) {
      await this._login()
    }

    return await this.http.get<PixivAppApi.Result>(trimSlash(this.config.endpoint) + url, {
      params: {
        content_type: 'illust',
        include_ranking_label: true,
        filter: 'for_ios',
      },
      headers: this._getHeaders(),
    })
  }

  async _login() {
    const endpoint = 'https://oauth.secure.pixiv.net/' // OAuth Endpoint
    const url = trimSlash(endpoint) + '/auth/token'

    const data = new URLSearchParams({
      get_secure_url: 'true',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    })

    try {
      const resp = await this.http.post(url, data, {
        headers: {
          ...this._getHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'host': 'oauth.secure.pixiv.net',
        },
        validateStatus: (status) => [200, 301, 302].includes(status),
      })

      this.userId = resp.user.id
      this.accessToken = resp.access_token
      this.refreshToken = resp.refresh_token
      if (this.refreshTime) clearTimeout(this.refreshTime)
      this.refreshTime = setTimeout(() => (this.accessToken = undefined), resp.expires_in * 1000)

      return this.accessToken
    } catch (err) {
      if (HTTP.Error.is(err)) {
        throw new Error('Login failed with status code ' + err.response?.status + '\n' + JSON.stringify(err.response))
      } else {
        throw new Error('Login failed with unknown error: ' + err.message)
      }
    }
  }

  _getHeaders() {
    const headers: Record<string, string> = {
      'app-os': 'ios',
      'app-os-version': '14.6',
      'user-agent': 'PixivIOSApp/7.13.3 (iOS 14.6; iPhone13,2)',
    }

    if (this.refreshToken && this.accessToken) {
      headers.Authorization = 'Bearer ' + this.accessToken
    }

    return headers
  }

  async _handleImage(url: string) {
    if (this.config.bypassMethod === 'proxy' && this.config.proxy) {
      const proxy = typeof this.config.proxy === 'string' ? this.config.proxy : this.config.proxy.endpoint
      return url.replace(/^https?:\/\/i\.pximg\.net/, trimSlash(proxy))
    } else if (this.config.bypassMethod === 'route' && this.config.route && this.ctx.get('server')) {
      const encrypted = Cipher.encrypt(url, this.config.aesKey)
      return (
        trimSlash(this.ctx.server.config.selfUrl) + trimSlash(this.config.route) + '/' + encodeURIComponent(encrypted)
      )
    } else if (this.config.bypassMethod === 'asset' && this.ctx.get('assets')) {
      const filename = url.split('/').pop().split('?')[0]
      const file = await this.http<ArrayBuffer>(url, { headers: { Referer: 'https://www.pixiv.net/' } })
      const base64 = Buffer.from(file.data).toString('base64')
      return this.ctx.assets.upload(`data:${file.headers['content-type']};base64,${base64}`, filename)
    } else {
      this.logger.warn(
        `Bypass method is set to ${this.config.bypassMethod}, but there's no candidate to handle the image.`,
      )
      return url
    }
  }
}

namespace PixivImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    token?: string
    target: 'partial_match_for_tags' | 'exact_match_for_tags' | 'title_and_caption'
    sort: 'date_desc' | 'date_asc' | 'popular_desc'
    duration: 'within_last_day' | 'within_last_week' | 'within_last_month' | 'all' | 'custom'
    minBookmarks: number
    maxBookmarks: number
    rank: number
    ai: number
    bypassMethod: 'proxy' | 'route' | 'asset'
    proxy?: { endpoint: string } | string
    route?: string
    aesKey?: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'pixiv' }),
    Schema.intersect([
      Schema.object({
        endpoint: Schema.string().default('https://app-api.pixiv.net/'),
        // TODO: set token as non-required for illust recommend
        token: Schema.string().required().role('secret'),
        target: Schema.union([
          Schema.const('partial_match_for_tags'),
          Schema.const('exact_match_for_tags'),
          Schema.const('title_and_caption'),
        ]).default('partial_match_for_tags'),
        sort: Schema.union([Schema.const('date_desc'), Schema.const('date_asc'), Schema.const('popular_desc')]).default(
          'date_desc',
        ),
        duration: Schema.union([
          Schema.const('within_last_day'),
          Schema.const('within_last_week'),
          Schema.const('within_last_month'),
          Schema.const('all'),
          Schema.const('custom').disabled(),
        ]).default('all'),
        minBookmarks: Schema.number().default(0),
        maxBookmarks: Schema.number().default(0),
        rank: Schema.union([Schema.const(0), Schema.const(1), Schema.const(2)]).default(0),
        ai: Schema.union([Schema.const(1), Schema.const(2)]).default(1),
      }),
      Schema.intersect([
        Schema.object({
          bypassMethod: Schema.union([Schema.const('proxy'), Schema.const('route'), Schema.const('asset')]).default(
            'proxy',
          ),
        }),
        Schema.union([
          Schema.object({
            bypassMethod: Schema.const('proxy'),
            proxy: Schema.union([
              Schema.const('https://i.pixiv.re'),
              Schema.const('https://i.pixiv.cat'),
              Schema.const('https://i.pixiv.nl'),
              Schema.object({
                endpoint: Schema.string().required(),
              }),
            ]).default('https://i.pixiv.re'),
          }),
          Schema.object({
            bypassMethod: Schema.const('route'),
            route: Schema.string().default('/booru/pixiv/proxy'),
            aesKey: Schema.string().hidden().default(''),
          }),
          Schema.object({
            bypassMethod: Schema.const('asset'),
          }),
        ]),
      ]),
    ]).i18n({
      'zh-CN': require('./locales/zh-CN.schema'),
    }),
  ])
}

class Cipher {
  static encrypt(data: string, key: string) {
    try {
      const iv = randomBytes(16)
      const cipher = createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
      const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()])
      return encrypted.toString('base64')
    } catch (err) {
      return null
    }
  }

  static decrypt(data: string, key: string) {
    try {
      const encrypted = Buffer.from(data, 'base64')
      const iv = encrypted.slice(0, 16)
      const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
      const decrypted = Buffer.concat([decipher.update(encrypted.slice(16)), decipher.final()])
      return decrypted.toString()
    } catch (err) {
      return null
    }
  }
}

export default PixivImageSource
