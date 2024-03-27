/* eslint-disable brace-style */
import { Element, h } from 'koishi'

export function normaliseCaption(caption: string): Element {
  if (!caption?.trim()) {
    return h.text('')
  }

  return h(
    '',
    h.transform(h.parse(caption), {
      a(attrs) {
        let url = (attrs['href'] || '') as string
        if (url) {
          let m: RegExpMatchArray | null = null
          // Convert pixiv://users/1234 to https://www.pixiv.net/u/1234
          if (((m = /pixiv:\/\/users\/(?<id>\d+)/.exec(url)), m?.groups?.id)) {
            url = `https://www.pixiv.net/u/${m.groups.id}`
          }
          // FIXME: Not confirmed yet
          // Convert pixiv://illusts/1234 to https://www.pixiv.net/i/1234
          else if (((m = /pixiv:\/\/illusts\/(?<id>\d+)/.exec(url)), m?.groups?.id)) {
            url = `https://www.pixiv.net/i/${m.groups.id}`
          }
          // FIXME: Not confirmed yet
          // Convert pixiv://novels/1234 to https://www.pixiv.net/novel/show.php?id=1234
          else if (((m = /pixiv:\/\/novels\/(?<id>\d+)/.exec(url)), m?.groups?.id)) {
            url = `https://www.pixiv.net/novel/show.php?id=${m.groups.id}`
          }
        }
        return h('a', { href: url }, ...(attrs.children || []))
      },
    }),
  )
}
