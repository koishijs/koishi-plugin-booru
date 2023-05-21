import { PathLike, existsSync, statSync } from "fs";
import { readdir } from "fs/promises";
import { extname, isAbsolute, resolve, sep } from "path";
import { LocalStorage } from "./types";
import { hash } from "./utils/hash";

export class Mapping {
  private map: LocalStorage.Type[] = []
  constructor(private root: string, storage: Mapping.Storage) { }

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
    const storage: LocalStorage.Type = this.map.filter(s => s.storeId === storeId)[0]
    const imagePaths: string[] = []
    try {
      const files = await readdir(folderPath)
      await files.forEach((file) => {
        file = this.absPath(file)
        if (statSync(file).isFile() && options.extnames.includes(extname(file)))
          imagePaths.push(file)
      })
    } catch (error) {
      throw new Error(error)
    }
    return {
      storeId,
      storeName: folderPath.toString().split(sep).at(-1),
      imageCount: 0,
      images: storage.images || [],
      imagePaths
    }
  }
}

export namespace Mapping {
  export type Storage = 'file' | 'cache' | 'database'
  export type Options = {
    extnames: string[]
  }
}
