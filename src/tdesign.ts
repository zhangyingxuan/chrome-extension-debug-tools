import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import {
  Button,
  Switch,
  Form,
  FormItem,
  Input,
  Select,
  Option,
  RadioGroup,
  Radio,
} from 'tdesign-vue-next'

// 导出TDesign Vue Next组件
export default TDesign

// 导出单个组件
export {
  Button,
  Switch,
  Form,
  FormItem,
  Input,
  Select,
  Option,
  RadioGroup,
  Radio,
}

// TDesign配置
export const tdesignConfig = {
  size: 'small' as const,
  zIndex: 2000
}