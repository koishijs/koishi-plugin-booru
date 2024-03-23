import { PathLike, existsSync, statSync } from 'fs'
import { readdir } from 'fs/promises'
import { extname, isAbsolute, resolve, sep } from 'path'

import { LocalStorage } from './types'
import { hash } from './utils/hash'

export class Mapping {
  private map: LocalStorage.Type[] = []
  constructor(
    private root: string,
    storage: Mapping.Storage,
  ) {}

  protected absPath(path: string) {
    return isAbsolute(path) ? path : resolve(this.root, path)
  }

  update(mapData: LocalStorage.Type[]) {
    this.map = mapData
    return this
  }

  async create(folderPath: PathLike, options: Mapping.Options): Promise<LocalStorage.Type> {
    if (!existsSync(folderPath)) return
    if (options.extnames.length === 0) return // no extname set is ignore all files for this folder

    const storeId = hash(folderPath.toString())
    const storage: LocalStorage.Type[] = this.map.filter((s) => s.storeId === storeId)
    const storeName = storage.length > 0 ? storage[0].storeName : folderPath.toString().split(sep).at(-1)
    const imagePaths: string[] = storage.length > 0 ? storage[0].imagePaths : []
    const images = storage.length > 0 ? storage[0].images : []

    try {
      const files = await readdir(folderPath)
      await files.forEach((file) => {
        file = this.absPath(resolve(folderPath.toString(), file))
        if (statSync(file).isFile() && options.extnames.includes(extname(file)) && !imagePaths.includes(file)) {
          imagePaths.push(file)
        }
      })
    } catch (error) {
      // ignore error task
    }

    return {
      storeId,
      storeName,
      imageCount: 0,
      images,
      imagePaths,
    }
  }
}

export namespace Mapping {
  export type Storage = 'file' | 'cache' | 'database'
  export type Options = {
    extnames: string[]
  }
}
