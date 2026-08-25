import type { BinaryLike } from 'node:crypto'
import { createHash } from 'node:crypto'

export const hash = (buf: BinaryLike) => createHash('md5').update(buf).digest('hex')
