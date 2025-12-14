import { createApp } from 'vue'
import App from './App.vue'
import TDesign from './tdesign'
import { t } from './utils/i18n'
import './styles/app.less'
import './styles/common.less'

const app = createApp(App)

// 配置Vue警告处理
app.config.warnHandler = (msg: string, instance: any, trace: string) => {
  // 抑制特定的插槽警告
  if (msg.includes('Slot "panel" invoked outside of the render function')) {
    return
  }

  // 其他警告正常显示
  console.warn(`[Vue warn]: ${msg}\n${trace}`)
}

app.config.globalProperties.$t = t
app.use(TDesign)
app.mount('#app')
