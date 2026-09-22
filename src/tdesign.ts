import type { App, Plugin } from 'vue'
// 按需引入：只注册模板中实际使用的组件。
// 禁止 `import TDesign from 'tdesign-vue-next'` 全量引入——它会把 t-icon
// 组件及其内置的远程脚本地址（tdesign.gtimg.com 图标 JS loader）打进产物，
// 触发 Chrome Web Store「禁止远程代码」政策导致审核被拒。
import {
  Button,
  Dialog,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Option,
  Popconfirm,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  Tooltip,
} from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'

const components = [
  Button,
  Dialog,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Option,
  Popconfirm,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  Tooltip,
]

const TDesign: Plugin = {
  install(app: App) {
    for (const component of components) {
      if ('name' in component && typeof component.name === 'string') {
        app.component(component.name, component)
      }
    }
  },
}

export default TDesign
