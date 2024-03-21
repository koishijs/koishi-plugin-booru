import { BinaryLike, createHash } from 'crypto'

export const hash = (buf: BinaryLike) => createHash('md5').update(buf).digest('hex')
