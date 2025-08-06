import { PathLike, existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

export function mkdirs(path: PathLike) {
  if (existsSync(path)) return true
  else if (mkdirs(dirname(path.toString()))) {
    let mk = false
    mkdir(path).then(() => {
      mk = true
    })
    return mk
  }
}

export function randomPick<T>(array: T[], count: number): T[] {
  if (count <= 0 || array.length === 0) return []
  if (array.length <= 1) return [...array]

  const pool: T[] = []
  let index = 0

  for (const item of array) {
    if (index < count) {
      pool.push(item)
    } else {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      if (randomIndex < count) {
        pool[randomIndex] = item
      }
    }
    index++
  }

  return pool
}

export class AsyncQueue {
  private running: number
  private awaiting: (() => void)[]

  constructor(private concurrency: number) {
    this.awaiting = []
    this.running = 0
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.concurrency) {
      await new Promise<void>((resolve) => this.awaiting.push(resolve))
    }

    this.running++
    try {
      return await task()
    } finally {
      this.running--
      const next = this.awaiting.shift()
      if (next) next()
    }
  }

  async idle(): Promise<void> {
    while (this.running > 0 || this.awaiting.length > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
    }
  }
}
