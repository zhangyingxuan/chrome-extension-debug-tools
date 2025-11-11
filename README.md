# 前端调试增强器 Chrome 插件

一个专为前端工程师设计的 Chrome 插件，集成了网络请求拦截和性能监控功能，无需 Charles、无需 root，即插即用。

## 🚀 功能特性

### 网络请求拦截

- 🔧 **Mock 数据**：拦截指定 URL 的请求，返回预设的响应数据
- 🎯 **正则匹配**：支持正则表达式匹配 URL 模式
- ⚡ **实时生效**：规则修改后立即生效，无需刷新页面
- 💾 **规则持久化**：拦截规则自动保存到本地存储

### 性能监控

- 📊 **实时图表**：使用 ECharts 展示 CPU、内存使用率实时曲线
- 🔍 **DOM 监控**：监控页面 DOM 节点数量和事件监听器数量
- 📈 **历史数据**：保留最近性能数据，支持趋势分析
- 🔄 **进程信息**：显示当前页面的进程和线程信息

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI 组件**：TDesign Vue Next
- **图表库**：ECharts + Vue-ECharts
- **样式预处理器**：Less

## 📦 安装与使用

### 开发环境

1. 克隆项目

```bash
git clone <repository-url>
cd chrome-extension-debug-tools
```

2. 安装依赖

```bash
npm install
```

3. 开发模式

```bash
npm run dev
```

4. 构建插件

```bash
npm run build
```

### 安装到 Chrome

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录下的 `dist` 文件夹
5. 插件安装完成，可在开发者工具中看到"前端调试"面板

## 🎯 使用指南

### 网络请求拦截

1. 打开 Chrome 开发者工具
2. 切换到"前端调试"面板
3. 在"网络请求拦截"区域添加拦截规则：

   - **URL 模式**：使用正则表达式匹配目标 URL
   - **请求方法**：选择要拦截的 HTTP 方法
   - **响应状态码**：设置 mock 响应的状态码
   - **响应头**：设置响应头信息
   - **响应体**：设置 JSON 格式的响应数据

4. 启用规则后，匹配的请求将被拦截并返回预设响应

### 性能监控

1. 在"性能监控"面板中查看实时数据：

   - **CPU 使用率**：页面 JavaScript 执行占用情况
   - **内存使用率**：JavaScript 堆内存使用情况
   - **DOM 节点数**：当前页面的 DOM 元素数量
   - **事件监听器**：注册的事件监听器数量

2. 查看进程信息，了解页面运行状态

## 📁 项目结构

```
src/
├── components/          # Vue 组件
│   ├── RequestInterceptor.vue    # 网络请求拦截组件
├── styles/             # 样式文件
│   └── common.less     # 全局样式
├── types.ts            # TypeScript 类型定义
├── utils/              # 工具函数
│   └── index.ts        # 通用工具方法
├── content.ts          # 内容脚本（性能收集）
├── tdesign.ts          # TDesign Vue Next 配置
└── main.ts            # 应用入口
```

## 🔧 配置说明

### manifest.json

- `manifest_version`: 3（使用 Manifest V3）
- `permissions`: 网络请求、存储、调试等权限
- `devtools_page`: 开发者工具面板入口
- `content_scripts`: 页面内容脚本

### vite.config.ts

- 多入口配置：devtools、background、content
- TypeScript 支持
- Vue 3 插件配置

## 🐛 故障排除

### 常见问题

1. **插件无法加载**

   - 检查 Chrome 版本是否支持 Manifest V3
   - 确认已开启开发者模式

2. **网络拦截不生效**

   - 检查 URL 模式是否正确（支持正则表达式）
   - 确认规则已启用
   - 检查请求方法是否匹配

3. **性能数据不显示**
   - 确认页面已完全加载
   - 检查 Chrome 性能 API 是否可用

### 调试技巧

- 打开 Chrome 扩展程序页面查看背景脚本日志
- 在内容脚本中使用 `console.log` 调试性能收集
- 使用 Vue DevTools 调试组件状态

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

感谢以下开源项目：

- Vue.js - 渐进式 JavaScript 框架
- TDesign Vue Next - 企业级 UI 组件库
- ECharts - 强大的图表库
- Vite - 下一代前端构建工具
