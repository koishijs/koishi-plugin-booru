import { Context } from '@koishijs/client'

import Main from './main.vue'

export default (ctx: Context) => {
  ctx.page({
    name: '页面标题',
    path: '/custom-page',
    component: Main,
  })
}
