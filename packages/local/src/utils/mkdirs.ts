import { PathLike, existsSync } from "fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "path";

export function mkdirs(path: PathLike) {
  if (existsSync(path)) return true
  else if (mkdirs(dirname(path.toString()))) {
    let mk = false
    mkdir(path)
      .then(() => { mk = true })
    return mk
  }
}
