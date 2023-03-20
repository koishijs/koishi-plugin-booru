import { Context, Quester, Schema, SessionError, trimSlash } from 'koishi'
import { ImageSource } from 'koishi-plugin-booru'

export const name = 'koishi-plugin-booru-pixiv'

export const using = ['booru']

export interface Config extends ImageSource.Config {
  endpoint: string
  token?: string
  minBookmarks: number
  pximgProxy?: string
}

export const Config = Schema.object({
  label: Schema.string().default('pixiv').description('图源标签，可用于在指令中手动指定图源。'),
  weight: Schema.number().default(1).description('图源权重。在多个符合标签的图源中，将按照各自的权重随机选择。'),

  endpoint: Schema.string().description('Pixiv 的 API Root').default('https://app-api.pixiv.net/'),
  token: Schema.string().description('Pixiv 的 Refresh Token'),
  minBookmarks: Schema.number().default(0).description('最少收藏数'),
  pximgProxy: Schema.string().description('Pixiv 图片代理，用于解决图片无法访问的问题').default('https://i.pixiv.re/'),
})

const CLIENT_ID = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
const CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'
const HASH_SECRET = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c'

export class PixivImageSource extends ImageSource<Config> {
  languages = ['en']

  private userId?: string
  private accessToken?: string
  private refreshToken?: string

  constructor(ctx: Context, config: Config) {
    super(ctx, config)
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    const url = '/v1/search/illust'
    const params = {
      word: query.tags.join(' '),
      search_target: 'partial_match_for_tags',
      sort: 'date_desc', // TODO: Pixiv member could use 'popular_desc'
      filter: 'for_ios',
    }

    if (this.config.token) {
      await this._login()
    }

    try {
      const data = await this.ctx.http.get(trimSlash(this.config.endpoint) + url, {
        params,
        headers: this._getHeaders(),
      })

      return data.illusts
        .filter((illust) => illust.total_bookmarks > this.config.minBookmarks)
        .slice(0, query.count)
        .map((illust: any) => {
          let url = ''
          if (illust.page_count > 1) {
            url = illust.meta_pages[0].image_urls.original
          } else {
            url = illust.meta_single_page.original_image_url
          }

          if (this.config.pximgProxy) {
            url = this.config.pximgProxy + url.replace(/^https?:\/\/i\.pximg\.net\//, '')
          }

          return {
            url,
            title: illust.title,
            pageUrl: `https://pixiv.net/i/${illust.id}`,
            author: illust.user.name,
            authorUrl: `https://pixiv.net/u/${illust.user.id}`,
            desc: illust.caption,
            tags: illust.tags.map((tag: any) => tag.name),
            nsfw: illust.x_restrict >= 1,
          }
        })
    } catch (err) {
      throw new SessionError('commands.booru.messages.no-response')
    }
  }

  async _login() {
    const endpoint = 'https://oauth.secure.pixiv.net/' // OAuth Endpoint
    const url = trimSlash(endpoint) + '/auth/token'

    const data = {
      get_secure_url: true,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: this.config.token,
    }

    const resp = await this.ctx.http.axios(url, {
      method: 'POST',
      data,
      headers: {
        ...this._getHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'host': 'oauth.secure.pixiv.net',
      },
      validateStatus: () => true,
    })

    const SUCCESS_STATUS = [200, 301, 302]
    if (!SUCCESS_STATUS.includes(resp.status)) {
      throw new Error('Login failed with status code ' + resp.status + JSON.stringify((resp as any).data))
    }

    this.userId = resp.data.user.id
    this.accessToken = resp.data.access_token
    this.refreshToken = resp.data.refresh_token

    return this.accessToken
  }

  _getHeaders() {
    const headers: Record<string, string> = {
      'app-os': 'ios',
      'app-os-version': '14.6',
      'user-agent': 'PixivIOSApp/7.13.3 (iOS 14.6; iPhone13,2)',
    }

    if (this.config.token && this.accessToken) {
      headers.Authorization = 'Bearer ' + this.accessToken
    }

    return headers
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.booru.register(new PixivImageSource(ctx, config))
}