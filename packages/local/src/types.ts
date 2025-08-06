import { ImageSource } from 'koishi-plugin-booru'

export interface BooruLocalConfig extends ImageSource.Config {
    endpoint: string[]
    extension: string[]
    languages: string[]
    proxy: boolean
    buildByReload: boolean
    scraper: string
  }

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
