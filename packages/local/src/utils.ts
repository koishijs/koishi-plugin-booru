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

export function toJSON(value: object, stringify: boolean = true): object | string {
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'object') {
      value[key] = toJSON(val)
    } else if (!['string', 'number', 'boolean'].includes(typeof val)) {
      delete value[key]
    } else {
      continue
    }
  }
  return stringify ? JSON.stringify(value) : value
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

type CacheEntry<V> = {
  value: V
  timestamp: number
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>
  private size: number
  private pending: Map<K, Promise<V>>
  private accessQueue: K[]

  constructor(size: number) {
    this.cache = new Map()
    this.size = size
    this.pending = new Map()
    this.accessQueue = []
  }

  async getElse(
    key: K,
    factory: () => Promise<V>,
    options?: { skipRefresh?: boolean },
  ): Promise<V> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    const entry = this.cache.get(key)
    if (entry) {
      if (!options?.skipRefresh) {
        this.refresh(key)
      }
      return entry.value
    }

    try {
      const promise = factory()
      this.pending.set(key, promise)
      const value = await promise

      this.set(key, value)
      return value
    } finally {
      this.pending.delete(key)
    }
  }

  getElseSync(
    key: K,
    factory: () => V,
    options?: { skipRefresh?: boolean },
  ): V {
    const entry = this.cache.get(key)
    if (entry) {
      if (!options?.skipRefresh) {
        this.refresh(key)
      }
      return entry.value
    }

    const value = factory()
    this.set(key, value)
    return value
  }

  peek(key: K): V | undefined {
    return this.cache.get(key)?.value
  }

  updatePresent(
    key: K,
    updater: (current: V) => V,
  ): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const newValue = updater(entry.value)
    this.set(key, newValue, { skipRefresh: true })
    return true
  }

  set(
    key: K,
    value: V,
    options?: { skipRefresh?: boolean },
  ): void {
    if (this.cache.size >= this.size && !this.cache.has(key)) {
      const lruKey = this.accessQueue.shift()
      if (lruKey) {
        this.cache.delete(lruKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })

    if (!options?.skipRefresh) {
      this.refresh(key)
    }
  }

  withValue<R>(
    key: K,
    onPresent: (value: V) => R,
    onAbsent: () => R,
  ): R {
    const value = this.peek(key)
    return value !== undefined
      ? onPresent(value)
      : onAbsent()
  }

  private refresh(key: K): void {
    const index = this.accessQueue.indexOf(key)
    if (index > -1) {
      this.accessQueue.splice(index, 1)
    }

    this.accessQueue.push(key)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    const index = this.accessQueue.indexOf(key)
    if (index > -1) {
      this.accessQueue.splice(index, 1)
    }
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.accessQueue = []
  }
}
