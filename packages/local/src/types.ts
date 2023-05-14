export namespace LocalStorage {
  export interface Response {
    name: string
    hash: string
    tags?: string[]
    path: string
  }

  export interface Type {
    storeId: string
    storeName: string
    imageCount: number
    images: Response[]
    imagePaths: string[]
  }
}

export namespace Scraper {
  export type String = `#${Type}#${string}` | string
  export type Type = 'name' | 'meta'
  export type Function = (path: string, hash: string) => LocalStorage.Response
}
