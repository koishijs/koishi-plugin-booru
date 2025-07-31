import { resolve } from 'node:path'

import { DataService } from '@koishijs/plugin-console'
import { Context } from 'koishi'

import { ImageMetadata, IndexStore, IndexUserStore } from './types'

declare module '@koishijs/plugin-console' {
  namespace Console {
    interface Services {
      booruLocal: UserIndexProvider
    }
  }

  interface Events {
    'booru-local/set-index': (key: string, value: ImageMetadata) => Promise<void>
  }
}

export function apply(ctx: Context, options: { index: IndexStore; indexObserve: Record<string, ImageMetadata> }) {
  ctx.plugin(UserIndexProvider, options.index)

  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })

  ctx.console.addListener('booru-local/set-index', async (key, value) => {
    options.indexObserve[key] = value
  })
}

export class UserIndexProvider extends DataService<IndexUserStore> {
  constructor(ctx: Context, private index: IndexStore) {
    super(ctx, 'booruLocal')
  }

  async get() {
    return {
      version: this.index.version,
      updatedAt: this.index.updatedAt,
      imageMap: this.index.imageMap,
    }
  }
}
