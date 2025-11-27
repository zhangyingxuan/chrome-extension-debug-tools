# 前端调试增强器 Chrome 插件

一款专为研发打造的网络请求拦截器，集成在 devtools NetLimit 选项卡中，支持网络请求拦截替换为预设的请求体、返回体，支持 XMLHttpRequest、fetch 请求拦截，同时支持 declarativeNetRequest 拦截

## 🚀 功能特性

### 网络请求拦截

- 🔧 **Mock 数据**：支持拦截并修改 XMLHttpRequest 和 fetch 请求的响应结果、请求体，同时支持 chrome.declarativeNetRequest 拦截规则
- 🎯 **正则匹配**：支持正则表达式匹配 URL 模式
- ⚡ **实时生效**：规则修改后立即生效，无需刷新页面
- 💾 **规则持久化**：拦截规则自动保存到本地存储
- 💾 **拦截记录**：匹配并完成拦截的请求，可在拦截历史中查看

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI 组件**：TDesign Vue Next
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
2. 切换到"NetLimit"面板
3. 左侧"请求记录"选项卡：开启记录后，刷新页面将列出 xhr/fetch 请求，可快速添加"脚本拦截"/"请求拦截"
4. 左侧"脚本拦截"选项卡：添加基于 xhr/fetch 的拦截规则：
5. 左侧"请求拦截"选项卡：添加基于 declarativeNetRequest 的拦截规则：

   - **URL 模式**：使用正则表达式匹配目标 URL
   - **请求方法**：选择要拦截的 HTTP 方法
   - **响应状态码**：设置 mock 响应的状态码
   - **响应头**：设置响应头信息
   - **响应体**：设置 JSON 格式的响应数据

6. 启用规则后，匹配的请求将被拦截并返回预设响应

## 📁 项目结构

```
src/
├── components/          # Vue 组件
│   ├── RequestLogger.vue              # 请求日志记录组件
│   ├── ScriptInterceptor.vue          # 脚本拦截管理组件
│   ├── ScriptInterceptorHistory.vue   # 脚本拦截历史记录组件
│   ├── DeclarativeNetInterceptor.vue  # 声明式网络拦截组件
│   ├── DeclarativeNetInterceptionHistory.vue    # 拦截历史记录组件
│   └── DeclarativeNetRuleEditor.vue   # 拦截规则编辑器
├── styles/             # 样式文件
│   └── common.less     # 全局样式
├── types.ts            # TypeScript 类型定义
├── utils/              # 工具函数
│   ├── interceptor.ts  # 网络请求拦截器核心逻辑
│   └── common.ts       # 通用工具方法
├── content.ts          # 内容脚本（性能收集）
├── tdesign.ts          # TDesign Vue Next 配置
└── main.ts            # 应用入口

public/
├── background.js       # 后台脚本，负责消息中转
├── content.js          # 内容脚本，负责页面通信
└── manifest.json       # 扩展配置文件
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

## 🔄 通信机制

### 消息传递流程

插件采用三层通信架构确保消息可靠传递：

```
页面上下文 (interceptor.ts) → background.js → devtools页面 (ScriptInterceptor.vue)
```

1. **页面层** (`interceptor.ts`)

   - 运行在网页上下文中
   - 拦截网络请求（fetch/XHR）
   - 通过 `chrome.runtime.sendMessage` 发送拦截记录到 background.js

2. **中转层** (`background.js`)

   - 接收来自页面的拦截记录
   - 通过 `chrome.runtime.sendMessage` 转发到 devtools 页面
   - 处理消息转发错误，确保不影响正常拦截功能

3. **展示层** (`ScriptInterceptor.vue`)
   - 接收来自 background.js 的拦截记录
   - 显示拦截历史和管理拦截规则
   - 通过 `chrome.runtime.onMessage` 监听消息

### 错误处理

- 消息发送失败时自动降级处理
- 不影响正常的网络请求拦截功能
- 支持 devtools 页面未打开时的静默处理

## 🐛 故障排除

### 常见问题

1. **插件无法加载**

   - 检查 Chrome 版本是否支持 Manifest V3
   - 确认已开启开发者模式

2. **网络拦截不生效**

   - 检查 URL 模式是否正确（支持正则表达式）
   - 确认规则已启用
   - 检查请求方法是否匹配

3. **拦截记录不显示**

   - 确认 devtools 页面已打开
   - 检查 background.js 是否正常运行
   - 查看浏览器控制台是否有通信错误

4. **性能数据不显示**
   - 确认页面已完全加载
   - 检查 Chrome 性能 API 是否可用

### 调试技巧

- 打开 Chrome 扩展程序页面查看背景脚本日志
- 在内容脚本中使用 `console.log` 调试性能收集
- 使用 Vue DevTools 调试组件状态
- 检查 background.js 的消息转发日志
- 使用 Chrome 扩展调试工具查看消息传递状态

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
- Vite - 下一代前端构建工具
