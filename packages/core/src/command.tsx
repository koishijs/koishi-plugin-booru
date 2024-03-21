import { Channel, Context, Random, Session, User } from 'koishi'
import { Config, OutputType, SpoilerType, preferSizes } from '.'

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

  ctx
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
        count: options.count,
        labels:
          options.label
            ?.split(',')
            ?.map((x) => x.trim())
            ?.filter(Boolean) ?? [],
      })
      const source = images?.source

      const filtered = images?.filter((image) => config.nsfw || !image.nsfw)

      if (!filtered?.length) return session?.text('.no-result')

      const output: Element[] = []

      for (const image of filtered) {
        let url = ''
        for (const size of preferSizes.slice(preferSizes.indexOf(config.preferSize))) {
          url = image.urls?.[size]
          if (url) {
            break
          }
        }
        url ||= image.url
        if (config.showTips) {
          const tips = getTips(session)
          if (tips) {
            const tip = Random.pick(tips)
            output.unshift(
              <p>
                <i18n path='.tips'></i18n>
                <i18n path={tip}></i18n>
              </p>,
            )
          }
        }

        if (config.asset && ctx.assets) {
          url = await ctx.booru.imgUrlToAssetUrl(url)
          if (!url) {
            output.unshift(<i18n path='.no-image'></i18n>)
            continue
          }
        } else if (config.base64) {
          url = await ctx.booru.imgUrlToBase64(url)
          if (!url) {
            output.unshift(<i18n path='.no-image'></i18n>)
            continue
          }
        }
        switch (config.output) {
          case OutputType.All:
            if (image.tags)
              output.unshift(
                <message>
                  <p>
                    <i18n path='.output.source'>{[source]}</i18n>
                  </p>
                  <p>
                    <i18n path='.output.tags'>{[image.tags.join(', ')]}</i18n>
                  </p>
                </message>,
              )
          case OutputType.ImageAndLink:
          case OutputType.ImageAndInfo:
            if (image.title || image.author || image.desc)
              output.unshift(
                <message>
                  <p>
                    {config.output >= OutputType.ImageAndLink && image.pageUrl ? (
                      <a href={image.pageUrl}>{image.title}</a>
                    ) : (
                      image.title
                    )}
                  </p>
                  <p>
                    {config.output >= OutputType.ImageAndLink && image.authorUrl ? (
                      <a href={image.authorUrl}>
                        <i18n path='.output.author'>{[image.author]}</i18n>
                      </a>
                    ) : (
                      <i18n path='.output.author'>{[image.author]}</i18n>
                    )}
                  </p>
                  <p>
                    <i18n path='.output.desc'>{[image.desc]}</i18n>
                  </p>
                </message>,
              )
          case OutputType.ImageOnly:
            output.unshift(
              /**
               * @TODO waiting for upstream to support spoiler tag
               * but is only is attribute, so it's can work now.
               */
              <message>
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
                ></img>
              </message>,
            )
        }
      }
      // the qq platform will can merge the all forward message with one element(forward message block).
      // so can treat it as a spoiler message.
      if (['qq', 'red', 'onebot'].includes(session.platform) && config.spoiler !== SpoilerType.Disabled)
        return <message forward>{output}</message>
      else return output.length === 1 ? output[0] : <message forward>{output}</message>
    })
}
