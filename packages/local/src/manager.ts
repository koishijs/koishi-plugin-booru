import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { Context } from 'koishi'

import { scraper } from './scraper'
import { Galleries, Tags, Image } from './types'

import type BooruLocalSource from '.'

declare module 'koishi' {
  interface Tables {
    [BooruTables.GALLERIES]: Galleries
    [BooruTables.IMAGES]: Image
    [BooruTables.TAGS]: Tags
  }
}

export const BooruTables = {
  GALLERIES: 'booru_galleries',
  IMAGES: 'booru_images',
  TAGS: 'booru_tags',
} as const

export const IMAGE_SCAN_LIMIT = 20

class BooruLocalManager {
  constructor(public ctx: Context, public config: BooruLocalSource.Config) {
    // #region Database
    ctx.model.extend(BooruTables.GALLERIES, {
      id: 'unsigned',
      name: 'string',
      path: 'string',
      status: 'string',
    }, {
      autoInc: true,
      primary: 'id',
    })

    ctx.model.extend(BooruTables.IMAGES, {
      id: 'string(32)',
      gid: 'unsigned',
      filename: 'string',
      filepath: 'string',
      tags: 'array',
      nsfw: 'boolean',
      author: 'string',
      size: 'unsigned',
      updated_at: 'timestamp',
      created_at: 'timestamp',
      source: 'string',
      stat_raw: 'json',
    }, {
      autoInc: false,
      primary: 'id',
    })

    ctx.model.extend(BooruTables.TAGS, {
      id: 'unsigned',
      name: 'string',
    }, {
      autoInc: true,
      primary: 'id',
    })
    // #endregion

    ctx.on('ready', async () => { })
  }

  async* scanGalleries(galleryPaths: string[]): AsyncGenerator<Galleries> {
    for (const path of galleryPaths) {
      const stats = await stat(path)
      if (!stats.isDirectory()) continue
      // auto create by upsert
      await this.ctx.database.upsert(BooruTables.GALLERIES, [{
        name: basename(path),
        path,
        status: 'active',
      }])

      const [gallery] = await this.ctx.database.get(BooruTables.GALLERIES, { path })

      if (gallery) yield gallery
    }
  }

  async scanImage(filepath: string): Promise<
    Omit<Image, 'gid' | 'created_at' | 'updated_at'>
  > {
    const filename = basename(filepath)
    const fileStats = await stat(filepath)
    const hasher = createHash('md5')
    const fileStream = createReadStream(filepath)

    try {
      await pipeline(fileStream, hasher)
    } finally {
      if (!fileStream.closed) fileStream.close()
    }

    const hash = hasher.digest('hex')
    const scrap = scraper(this.config.scraper)
    const { tags, nsfw, author } = scrap(filepath, hash)

    this.ctx.logger('booru-local').debug(`scanned image: ${filename} (${hash})`)

    return {
      id: hash,
      filename,
      filepath,
      tags: await this.createTags(tags) || [],
      nsfw,
      author,
      size: fileStats.size,
      stat_raw: fileStats,
    }
  }

  private async createTags(tags: string[]): Promise<number[]> {
    await this.ctx.database.upsert(BooruTables.TAGS, tags.map((name) => ({ name })))

    return (await this.ctx.database.get(BooruTables.TAGS, { name: tags })).map(row => row.id)
  }

  async queryByHash(hash: string): Promise<Image | null> {
    const [result] = await this.ctx.database.get(BooruTables.IMAGES, { id: hash })
    return result || null
  }

  async queryByTags(tags: string[]): Promise<Image[]> {
    const tagIDs = (await this.ctx.database.get(BooruTables.TAGS, { name: tags })).map(tag => tag.id)
    if (tagIDs.length === 0) return []

    const images = await this.ctx.database.get(BooruTables.IMAGES, { tags: { $el: { $in: tagIDs } } })
    return images
  }

  async namedTags(tags: number[]): Promise<string[]> {
    const tagNames = await this.ctx.database.get(BooruTables.TAGS, { id: { $in: tags } })
    return tagNames.map(tag => tag.name)
  }

  async readableStream(path: string): Promise<Readable> {
    const file = await readFile(path)
    const readable = Readable.from(file)
    this.ctx.on('dispose', () => {
      if (!readable.readableEnded) {
        readable.destroy(new Error('disposed'))
      }
    })
    return readable
  }
}

namespace BooruLocalManager {}

export default BooruLocalManager
