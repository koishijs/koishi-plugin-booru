import type { PathLike } from 'node:fs'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export function mkdirs(path: PathLike) {
  if (existsSync(path)) {
    return true
  }
  else if (mkdirs(dirname(path.toString()))) {
    let mk = false
    mkdir(path).then(() => {
      mk = true
    })
    return mk
  }
}
