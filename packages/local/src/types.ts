export interface IndexStore {
  version: 1
  updatedAt: number
  imageMap: Map<string, ImageMetadata>
  auxiliary: IndexAuxiliary
}

export interface IndexAuxiliary {
    tag?: Record<string, string[]>
    nsfw?: { nsfw: string[]; safe: string[] }
    author?: Record<string, string[]>
    // NOTE: { md5Hash: fullPath }
    hash?: Record<string, string>
  }

export type IndexUserStore = Omit<IndexStore, 'auxiliary'>

export interface ImageMetadata {
  name: string
  hash: string
  tags?: string[]
  nsfw?: boolean
  sourcePath: string
  author?: string
  [key: string]: unknown // Additional properties can be added by the scraper
}

export namespace Scraper {
  export type String = `#${Type}#${string}` | string
  export type Type = 'name' | 'meta' | 'index'
  export type Function = (scraper: string, path: string, hash: string) => ImageMetadata
  export type TokenDefinitions = {
    [key: string]: {
      matcher: string
      formatter: (...args: unknown[]) => unknown
    }
  }
  export type Strategies = {
    [key in Type]?: Scraper.Function
  }
  export type TokenKeys = keyof TokenDefinitions
}
