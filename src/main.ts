import { createApp } from 'vue'
import TDesign from './tdesign'
import './styles/common.less'

import App from './App.vue'

const app = createApp(App)

// 创建Chrome开发者工具面板
chrome.devtools.panels.create(
  "前端调试",
  "icon.png", // 需要提供图标文件
  "index.html",
  (panel) => {
    console.log("前端调试面板已创建");

    panel.onShown.addListener((window) => {
      // 面板显示时的初始化逻辑
      console.log("调试面板已显示");
    });

    panel.onHidden.addListener(() => {
      // 面板隐藏时的清理逻辑
      console.log("调试面板已隐藏");
    });
  }
);
// 使用TDesign Vue Next
app.use(TDesign)

app.mount('#app')
