import { resolve } from 'node:path'

import { } from '@koishijs/plugin-console'
import { Context } from 'koishi'

import { Image } from './types'

declare module '@koishijs/plugin-console' {
  namespace Console {
    interface Services {

    }
  }

  interface Events {
    'booru-local/user-locale': (locale: string) => void
    'booru-local/image-update': (metadata: Image) => Promise<void>
    'booru-local/image-remove': (id: string) => Promise<void>
    'booru-local/tags-update': (tags: string[]) => Promise<void>
    'booru-local/tags-remove': (tags: number[]) => Promise<void>
  }
}

export function apply(ctx: Context) {
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })

  ctx.console.addListener('booru-local/image-update', async (metadata) => {
    await ctx.booruLocal.updateImage(metadata)
  })

  ctx.console.addListener('booru-local/image-remove', async (id) => {
    await ctx.booruLocal.removeImage(id)
  })

  ctx.console.addListener('booru-local/tags-update', async (tags) => {
    await ctx.booruLocal.updateTags(tags)
  })

  ctx.console.addListener('booru-local/tags-remove', async (tagIDs) => {
    await ctx.booruLocal.removeTags(tagIDs)
  })
}
