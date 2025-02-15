/* eslint-disable no-fallthrough */
import { Channel, Context, Random, Session, User } from 'koishi'

import { Config, OutputType, SpoilerType, preferSizes, sizeNameToFixedWidth } from '.'

export const inject = {
  required: ['booru'],
  optional: ['assets'],
}

export function apply(ctx: Context, config: Config) {
  const getTips = (session: Session) => {
    for (const locale of ctx.i18n.fallback([
      ...((session.user as User.Observed)?.locales || []),
      ...((session.channel as Channel.Observed)?.locales || []),
    ])) {
      if (ctx.i18n._data[locale]) {
        const tips = Object.keys(ctx.i18n._data[locale] || {}).filter((k) => k.startsWith('booru.tips'))
        if (tips.length) return tips
      }
    }
  }

  const count = (value: string, session: Session) => {
    const count = parseInt(value)
    if (count < 1 || count > config.maxCount) {
      session.send('booru.count-invalid')
      return 1
    }
    return count
  }

  const command = ctx
    .command('booru <query:text>')
    .option('count', '-c <count:number>', { type: count, fallback: 1 })
    .option('label', '-l <label:string>')
    .action(async ({ session, options }, query) => {
      if (!ctx.booru.hasSource(options.label)) return session.text('.no-source')

      query = query?.trim() ?? ''

      if (query) {
        // Since the type of query is text, when user append options after the query, the options
        // would not be parsed correctly. So we need to manually parse the query and options here.
        // https://github.com/koishijs/koishi-plugin-booru/issues/39
        const countMatch = /(-c|--count)\s+(\d+)/g.exec(query)
        if (countMatch) {
          options.count = count(countMatch[2], session)
          query = query.replace(countMatch[0], '').trim()
        }
        const labelMatch = /(-l|--label)\s+([^\s]+)/g.exec(query)
        if (labelMatch) {
          options.label = labelMatch[2]
          query = query.replace(labelMatch[0], '').trim()
        }
      }

      const images = await ctx.booru.get({
        query,
        count: options.count || 1,
        labels:
          options.label
            ?.split(',')
            ?.map((x) => x.trim())
            ?.filter(Boolean) ?? [],
      })
      const source = images?.source

      const filtered = images?.filter((image) => {
        if (config.nsfw && image.nsfw) return false

        if (config.blacklist?.length && image.tags?.length) {
          for (const tag of image.tags) {
            if (config.blacklist.includes(tag)) return false
          }
        }
        return true
      })

      if (!filtered?.length) return session?.text('commands.booru.messages.no-result')

      const output: Element[][] = []

      for (const image of filtered) {
        const children: Element[] = []
        let url = ''
        for (const size of preferSizes.slice(preferSizes.indexOf(config.preferSize))) {
          url = image.urls?.[size]
          if (url) {
            break
          }
        }
        url ||= image.url
        if (session.resolve(config.autoResize) && sizeNameToFixedWidth[config.preferSize]) {
          url = await ctx.booru.resizeImageToFixedWidth(url, sizeNameToFixedWidth[config.preferSize])
        }

        if (config.asset && ctx.assets) {
          url = await ctx.booru.imgUrlToAssetUrl(url)
          if (!url) {
            children.unshift(<i18n path='commands.booru.messages.no-image'></i18n>)
            continue
          }
        } else if (config.base64) {
          url = await ctx.booru.imgUrlToBase64(url)
          if (!url) {
            children.unshift(<i18n path='commands.booru.messages.no-image'></i18n>)
            continue
          }
        }
        switch (config.output) {
          case OutputType.All:
            if (image.tags) {
              children.unshift(
                <p>
                  <i18n path='commands.booru.messages.output.source'>{[source]}</i18n>
                </p>,
                <p>
                  <i18n path='commands.booru.messages.output.tags'>{[image.tags.join(', ')]}</i18n>
                </p>,
              )
            }
          case OutputType.ImageAndLink:
          case OutputType.ImageAndInfo:
            if (image.title || image.author || image.desc) {
              children.unshift(
                <p>
                  {config.output >= OutputType.ImageAndLink && image.pageUrl ? (
                    <a href={image.pageUrl}>{image.title}</a>
                  ) : (
                    image.title
                  )}
                </p>,
                <p>
                  {config.output >= OutputType.ImageAndLink && image.authorUrl ? (
                    <a href={image.authorUrl}>
                      <i18n path='commands.booru.messages.output.author'>{[image.author]}</i18n>
                    </a>
                  ) : (
                    <i18n path='commands.booru.messages.output.author'>{[image.author]}</i18n>
                  )}
                </p>,
                <p>
                  <i18n path='commands.booru.messages.output.desc'>{[image.desc]}</i18n>
                </p>,
              )
            }
          case OutputType.ImageOnly:
            children.unshift(
              /**
               * @TODO waiting for upstream to support spoiler tag
               * but is only is attribute, so it's can work now.
               */

              <img
                spoiler={(() => {
                  switch (config.spoiler) {
                    case SpoilerType.Disabled:
                      return false
                    case SpoilerType.All:
                      return true
                    case SpoilerType.OnlyNSFW:
                      return Boolean(image.nsfw)
                  }
                })()}
                src={url}
              ></img>,
            )
        }
        output.push(children)
      }

      if (config.showTips) {
        const tips = getTips(session)
        if (tips) {
          const tip = Random.pick(tips)
          output.push(
            <p>
              <i18n path='commands.booru.messages.tips'></i18n>
              <i18n path={tip}>{[command.displayName]}</i18n>
            </p>,
          )
        }
      }

      switch (session.resolve(config.outputMethod)) {
        case 'one-by-one':
          return output.map((children) => <message>{children}</message>)
        case 'merge-multiple':
          return <message>{output.map((children) => children)}</message>
        case 'forward-all':
          return (
            <message forward>
              {/* Use <author> for mimicry Bot itself in forward messages (QQ) */}
              <author id={session.userId} name={session.username}></author>
              {output.map((children) => (
                <message>{children}</message>
              ))}
            </message>
          )
        case 'forward-multiple':
          if (output.length === 1) return <message>{output[0]}</message>
          return (
            <message forward>
              {/* Use <author> for mimicry Bot itself in forward messages (QQ) */}
              <author id={session.userId} name={session.username}></author>
              {output.map((children) => (
                <message>{children}</message>
              ))}
            </message>
          )
      }
    })
}
