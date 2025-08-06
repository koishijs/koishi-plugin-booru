import { Stats } from 'node:fs'

import { ImageSource } from 'koishi-plugin-booru'

export interface BooruLocalConfig extends ImageSource.Config {
  endpoint: string[]
  extension: string[]
  languages: string[]
  proxy: boolean
  buildByReload: boolean
  scraper: string
}

export interface Galleries {
  id: number
  name: string
  path: string
  status: 'active' | 'disabled'
}

export interface Image {
  id: string // md5 hash
  gid: number // gallery id
  filename: string
  filepath: string // full path
  tags?: number[] // tag ids
  nsfw?: boolean
  author?: string
  size?: number
  updated_at: Date
  created_at: Date
  source?: string // original source URL
  mime?: string
  stat_raw: Stats
}

export interface Tags {
  id: number
  name: string
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
