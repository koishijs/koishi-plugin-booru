import { createHash } from 'node:crypto'
import { createReadStream, Stats } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { $, Context } from 'koishi'

import { scraper } from './scraper'
import { Galleries, Tags, Image } from './types'
import { toJSON } from './utils'

import type BooruLocalSource from '.'

declare module 'koishi' {
  interface Context {
    booruLocal: BooruLocalManager
  }

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
  private _flushBatch: Image[] = []
  private readonly _flushThreshold = 100

  constructor(public ctx: Context, public config: BooruLocalSource.Config) {
    ctx.provide('booruLocal', this)

    // #region Database
    ctx.model.extend(BooruTables.GALLERIES, {
      id: 'unsigned',
      name: 'string',
      path: 'string',
      status: 'string',
    }, {
      autoInc: true,
      primary: 'id',
      unique: ['path'],
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
      unique: ['id', 'filepath'],
      indexes: ['id', 'gid', 'tags', 'nsfw', 'author'],
    })

    ctx.model.extend(BooruTables.TAGS, {
      id: 'unsigned',
      name: 'string',
    }, {
      autoInc: true,
      primary: 'id',
      unique: ['name'],
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
    Omit<Image, 'gid' | 'updated_at'>
  > {
    const filename = basename(filepath)
    const mime = extname(filename).toLowerCase().split('.').pop() || 'unknown'
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

    return {
      id: hash,
      filename,
      filepath,
      tags: await this.createTags(tags) || [],
      nsfw,
      mime,
      author,
      created_at: fileStats.birthtime,
      size: fileStats.size,
      stat_raw: toJSON(fileStats, false) as Stats, // type happy
    }
  }

  private async createTags(tags: string[]): Promise<number[]> {
    await this.ctx.database.upsert(BooruTables.TAGS, tags.map((name) => ({ name })))

    return (await this.ctx.database.get(BooruTables.TAGS, { name: tags })).map(row => row.id)
  }

  async _processImage(meta: Omit<Image, 'updated_at'>): Promise<void> {
    const metadata: Image = {
      ...meta,
      updated_at: new Date(),
    }

    this._flushBatch.push(metadata)
    if (this._flushBatch.length >= this._flushThreshold) {
      await this._flush()
    }
  }

  async _flush(): Promise<void> {
    if (this._flushBatch.length === 0) return

    await this.updateImage(this._flushBatch)
    this._flushBatch = []
  }

  async updateImage(metadata: Image | Image[]): Promise<void> {
    await this.ctx.database.upsert(BooruTables.IMAGES, (Array.isArray(metadata) ? metadata : [metadata]))
  }

  async removeImage(id: string): Promise<void> {
    await this.ctx.database.remove(BooruTables.IMAGES, { id })
  }

  async updateTags(tags: string[]): Promise<void> {
    await this.ctx.database.upsert(BooruTables.TAGS, tags.map((name) => ({ name })))
  }

  async removeTags(tagIDs: number[]): Promise<void> {
    await this.ctx.database.remove(BooruTables.TAGS, { id: { $in: tagIDs } })
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

  async existIndex(): Promise<boolean> {
    const imageIndexCount = await this.ctx.database.eval(BooruTables.IMAGES, row => $.count(row.id))
    return imageIndexCount > 0
  }
}

namespace BooruLocalManager {}

export default BooruLocalManager
