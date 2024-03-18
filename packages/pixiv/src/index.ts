import { Context, Quester, Schema, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'
import { PixivAppApi } from './types'

const CLIENT_ID = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
const CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'
const HASH_SECRET = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c'

class PixivImageSource extends ImageSource<PixivImageSource.Config> {
  languages = ['en', 'zh', 'zh-CN', 'zh-TW', 'ja', 'ko']
  source = 'pixiv'

  private userId?: string
  private accessToken?: string
  private refreshToken?: string
  private refreshTime?: NodeJS.Timeout

  constructor(ctx: Context, config: PixivImageSource.Config) {
    super(ctx, config)
    this.refreshToken = config.token
  }

  override tokenize(query: string) {
    return query.split(/\s+/)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    try {
      const data = await (query.raw.length ? this.search(query.tags.join(' ')) : this.recommend())

      return data.illusts
        .filter((illust) => illust.total_bookmarks > this.config.minBookmarks)
        .filter((illust) => illust.x_restrict <= this.config.rank)
        .filter((illust) => illust.illust_ai_type <= this.config.ai)
        .slice(0, query.count)
        .map((illust) => {
          let url = ''
          if (illust.page_count > 1) {
            url = illust.meta_pages[0].image_urls.original
          } else {
            url = illust.meta_single_page.original_image_url
          }

          if (this.config.proxy) {
            const proxy = typeof this.config.proxy === 'string' ? this.config.proxy : this.config.proxy.endpoint
            url = url.replace(/^https?:\/\/i\.pximg\.net/, trimSlash(proxy))
          }

          return {
            url,
            title: illust.title,
            pageUrl: `https://pixiv.net/i/${illust.id}`,
            author: illust.user.name,
            authorUrl: `https://pixiv.net/u/${illust.user.id}`,
            desc: illust.caption,
            tags: illust.tags.map((tag) => tag.name),
            nsfw: illust.x_restrict >= 1,
          }
        })
    } catch (err) {
      if (Quester.Error.is(err)) {
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
      search_target: 'partial_match_for_tags',
      search_ai_type: this.config.ai === 2 ? PixivAppApi.SearchAIType.SHOW_AI : PixivAppApi.SearchAIType.HIDE_AI,
      sort: 'date_desc', // TODO: Pixiv member could use 'popular_desc'
      filter: 'for_ios',
    }

    if (!this.accessToken) {
      await this._login()
    }

    return await this.http.get<PixivAppApi.Result>(trimSlash(this.config.endpoint) + url, {
      params,
      headers: this._getHeaders(),
    })
  }

  async recommend(): Promise<PixivAppApi.Result> {
    const url = /* this.config.token ?  */'/v1/illust/recommended' //: '/v1/illust/recommended-nologin'

    if (/* this.config.token &&  */!this.accessToken) {
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
      if (Quester.Error.is(err)) {
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
}

namespace PixivImageSource {
  export interface Config extends ImageSource.Config {
    endpoint: string
    token?: string
    minBookmarks: number
    rank: number
    ai: number
    proxy?: { endpoint: string } | string
  }

  export const Config: Schema<Config> = Schema.intersect([
    ImageSource.createSchema({ label: 'pixiv' }),
    Schema.object({
      endpoint: Schema.string().description('Pixiv 的 API Root').default('https://app-api.pixiv.net/'),
      // TODO: set token as non-required for illust recommend
      token: Schema.string().required().role('secret').description('Pixiv 的 Refresh Token'),
      minBookmarks: Schema.number().default(0).description('最少收藏数，仅在设置了 Token 并有 Pixiv Premium 的情况下可用'),
      proxy: Schema.union([
        Schema.const('https://i.pixiv.re').description('i.pixiv.re'),
        Schema.const('https://i.pixiv.cat').description('i.pixiv.cat'),
        Schema.const('https://i.pixiv.nl').description('i.pixiv.nl'),
        Schema.object({
          endpoint: Schema.string().required().description('反代服务的地址。'),
        }).description('自定义'),
      ]).description('Pixiv 反代服务。').default('https://i.pixiv.re'),
      rank: Schema.union([
        Schema.const(0).description('全年龄'),
        Schema.const(1).description('R18'),
        Schema.const(2).description('R18G')
      ]).description('年龄分级').default(0),
      ai: Schema.union([
        Schema.const(1).description('不允许AI作品'),
        Schema.const(2).description('允许AI作品')
      ]).description('是否允许搜索AI作品').default(1)
    }).description('搜索设置'),
  ])
}

export default PixivImageSource
