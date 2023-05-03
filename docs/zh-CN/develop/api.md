# API

## `ctx.booru.register()`

```ts
ctx.booru.register(source: ImageSource): () => boolean
```

注册一个图源，返回一个 dispose 函数，调用此函数可以注销此图源。

## `ctx.booru.get()`

```ts
ctx.booru.get(query: ImageService.Query): Promise<ImageSource.Result[]>
```

获取符合条件的图片，返回一个 Promise，resolve 时返回一个图片数组。

当获取不到图片时，返回 `undefined`。
