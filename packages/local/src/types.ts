export namespace LocalStorage {
  export interface Response {
    name: string
    hash: string
    tags?: string[]
    path: string
  }

  export interface Type {
    storeId: string
    imageCount: number
    images: Response[]
    imagePaths: string[]
  }
}
