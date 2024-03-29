# API

## 服务方法

### `ctx.booru.register()`

```ts
ctx.booru.register(source: ImageSource): () => void
```

注册一个图源，返回一个 dispose 函数，调用此函数可以注销此图源。

### `ctx.booru.hasSource()`

```ts
ctx.booru.hasSource(name?: string): boolean
```

当不传入参数时，判断是否存在激活的图源；当传入参数时，判断是否存在指定名称的图源。

### `ctx.booru.get()`

```ts
ctx.booru.get(query: ImageService.Query): Promise<ImageSource.Result[]>
```

获取符合条件的图片，返回一个 Promise，resolve 时返回一个图片数组。

当 `query.tags` 为空时，应当返回随机的图片。

当获取不到图片时，应当返回 `undefined`。

## 类型定义

### `ImageSource`

```ts
export abstract class ImageSource<Config extends ImageSource.Config = ImageSource.Config> {
  languages: string[] = ['en'] // 图源支持的语言

  constructor(public ctx: Context, public config: Config) {
    this.ctx.booru.register(this)
  }

  // 对标签进行分词，返回一个标签数组
  tokenize(query: string): string[]

  // 获取图片
  abstract get(query: ImageSource.Query): Promise<ImageSource.Result[]>
}
```

### `ImageSource.Query`

```ts
export interface Query {
  tags: string[]
  /** raw query */
  raw: string
  count: number
}
```

### `ImageSource.Result`

```ts
export type NsfwType = 'furry' | 'guro' | 'shota' | 'bl'

export enum PreferSize {
  Original = 'original',
  Large = 'large',
  Medium = 'medium',
  Small = 'small',
  Thumbnail = 'thumbnail',
}

export interface Result {
  urls: Partial<Record<Exclude<PreferSize, 'original'>, string>> & { original: string }
  pageUrl?: string
  author?: string
  authorUrl?: string
  title?: string
  desc?: string
  tags?: string[]
  nsfw?: boolean | NsfwType
}
```
