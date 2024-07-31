/* eslint-disable brace-style */
import { Element, h } from 'koishi'

export function normaliseCaption(caption: string): Element {
  if (!caption?.trim()) {
    return <text></text>
  }

  return (
    <>
      {h.transform(h.parse(caption), {
        a(attrs) {
          let url = (attrs['href'] || '') as string
          if (url) {
            let m: RegExpMatchArray | null = null
            // Convert pixiv://users/1234 to https://www.pixiv.net/u/1234
            if (((m = /pixiv:\/\/users\/(?<id>\d+)/.exec(url)), m?.groups?.id)) {
              url = `https://www.pixiv.net/u/${m.groups.id}`
            }
            // Convert pixiv://illusts/1234 to https://www.pixiv.net/i/1234
            else if (((m = /pixiv:\/\/illusts\/(?<id>\d+)/.exec(url)), m?.groups?.id)) {
              url = `https://www.pixiv.net/i/${m.groups.id}`
            }
            // Convert pixiv://novels/1234 to https://www.pixiv.net/novel/show.php?id=1234
            else if (((m = /pixiv:\/\/novels\/(?<id>\d+)/.exec(url)), m?.groups?.id)) {
              url = `https://www.pixiv.net/novel/show.php?id=${m.groups.id}`
            }
            // There are also `twitter/` link, since its href is just a valid URL, we don't need to handle it
          }
          return <a href={url}>{attrs.children || []}</a>
        },
      })}
    </>
  )
}
