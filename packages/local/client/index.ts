import { Context } from '@koishijs/client'

import Main from './main.vue'

export default (ctx: Context) => {
  ctx.page({
    name: 'Local WebUI',
    path: '/booru-local-ui',
    component: Main,
  })
}
