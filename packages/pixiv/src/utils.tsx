import type { Element } from 'koishi'
import { h } from 'koishi'

export function normaliseCaption(caption: string): Element {
  if (!caption?.trim()) {
    return <text></text>
  }

  return (
    <>
      {h.transform(h.parse(caption), {
        a(attrs) {
          let url = (attrs.href || '') as string
          if (url) {
            // Convert pixiv://users/1234 to https://www.pixiv.net/u/1234,
            // pixiv://illusts/1234 to https://www.pixiv.net/i/1234, and
            // pixiv://novels/1234 to https://www.pixiv.net/novel/show.php?id=1234
            const converted = /^pixiv:\/\/(?:users|illusts|novels)\/(?<id>\d+)$/.exec(url)
            if (converted?.groups?.id) {
              const { id } = converted.groups
              switch (url.split('/')[2]) {
                case 'users':
                  url = `https://www.pixiv.net/u/${id}`
                  break
                case 'illusts':
                  url = `https://www.pixiv.net/i/${id}`
                  break
                case 'novels':
                  url = `https://www.pixiv.net/novel/show.php?id=${id}`
                  break
              }
            }
            // There are also `twitter/` link, since its href is just a valid URL, we don't need to handle it
          }
          return <a href={url}>{attrs.children || []}</a>
        },
      })}
    </>
  )
}
