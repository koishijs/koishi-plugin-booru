# service

`booru` 插件会注册名为 `booru` 的服务，可以被其他插件调用。

## 检测图源

`booru` 服务提供了 `hasSource()` 方法，可以用于判断是否存在任意图源，或是否存在指定的图源。

```ts
import { Context } from 'koishi'

export function apply(ctx: Context) {
  ctx.booru.hasSource() // 是否存在任意图源
  ctx.boooru.hasSource('pixiv') // 是否存在 pixiv 图源
}
```

## 获取图片

`booru` 服务提供了 `get()` 方法，可以用于获取图片。

```tsx
import { Context } from 'koishi'

export function apply(ctx: Context) {
  ctx.command('恋恋最可爱').action(async () => {
    const image = await ctx.booru.get({ tags: 'komeiji koishi', raw: 'komeiji koishi', count: 1 })
    return <image url={image.url} />
  })
}
```

<chat-panel>
<chat-message nickname="Alice">恋恋最可爱</chat-message>
<chat-message nickname="Koishi">
<picture>
  <source srcset="https://pixiv.nl/101250949.jpg" />
  <source srcset="https://pixiv.re/101250949.jpg" />
  <img src="">
</picture>
 <br>
</chat-message>
</chat-panel>

## 注册图源

`booru` 服务提供了 `register()` 方法，可以用于注册图源。

```ts
import { Context } from 'koishi'

class PixivSource extends ImageSource<Config> {
  name = 'pixiv'
  async get(query) {
    // ...
  }
}

export function apply(ctx: Context, config: Config) {
  // 注册图源
  const dispose = ctx.booru.register(new PixivSource(ctx, config))
  // 注销图源
  dispose()
}
```
