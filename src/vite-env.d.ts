import 'vue'
/// <reference types="vite/client" />

//https://cn.vitejs.dev/guide/env-and-mode.html#env-files
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明合并，扩展组件实例的自定义属性
declare module 'vue' {
  // 推荐使用 vue-i18n 官方提供的类型，以获得完整的 $t() 函数签名
  import type { Composer } from 'vue-i18n'

  // ComponentCustomProperties 是 Vue 3 中用来扩展组件实例属性的接口
  interface ComponentCustomProperties {
    /**
     * vue-i18n 插件提供的翻译函数。
     * @param key 翻译键值
     * @param options 可选参数
     */
    $t: Composer['t']

    // 如果您还使用了 $i18n 对象，也需要声明
    // $i18n: Composer
  }
}

// 确保文件被 TypeScript 识别，不需要在其他地方导入这个文件
export { }