# 🚀 Chrome Extension Debug Tools - 网络请求拦截器

> 一款专为研发打造的网络请求拦截器，集成在 devtools NetLimit 选项卡中，支持网络请求拦截替换为预设的请求体、返回体，支持 XMLHttpRequest、fetch 请求拦截，同时支持 declarativeNetRequest 拦截

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/Version-1.2.0-blue.svg)](https://github.com/yxuanzhang/chrome-extension-debug-tools)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

## ✨ 核心特性

### 🔧 双重拦截机制

- **脚本拦截**：基于 XMLHttpRequest 和 Fetch API 的深度拦截，支持复杂逻辑处理
- **声明式拦截**：使用 Chrome declarativeNetRequest API，系统级高性能拦截

### 🎯 智能规则管理

- **正则表达式匹配**：支持复杂的 URL 模式匹配
- **多条件过滤**：支持请求方法、URL、请求头等多维度匹配
- **实时生效**：规则修改后立即应用，无需页面刷新
- **规则持久化**：自动保存到 Chrome 本地存储

### � 可视化调试界面

- **实时拦截记录**：详细展示拦截请求的完整信息
- **性能监控**：显示请求耗时、响应大小等关键指标
- **规则编辑器**：直观的可视化规则配置界面

### ⚡ 高性能架构

- **三层通信机制**：页面层 → 中转层 → 展示层，确保消息可靠传递
- **懒加载优化**：按需加载拦截规则，减少内存占用
- **错误边界处理**：完善的错误处理机制，不影响正常请求

## 🛠️ 技术架构

### 技术栈

- **前端框架**：Vue 3 + Composition API + TypeScript
- **构建工具**：Vite 5.x
- **UI 组件库**：TDesign Vue Next
- **样式预处理器**：Less
- **浏览器扩展**：Chrome Extensions Manifest V3
- **核心权限**：storage, unlimitedStorage, declarativeNetRequest, declarativeNetRequestFeedback, declarativeNetRequestWithHostAccess
- **主机权限**：http://_/_, https://_/_

### 核心模块

```
├── src/
│   ├── components/           # Vue 组件层
│   │   ├── ScriptInterceptor.vue          # 脚本拦截管理
│   │   ├── RequestLogger.vue              # 请求日志记录
│   │   ├── ScriptInterceptorHistory.vue   # 拦截历史
│   │   ├── DeclarativeNetInterceptor.vue  # 声明式拦截
│   │   └── DeclarativeNetInterceptionHistory.vue # 声明式拦截历史
│   ├── utils/
│   │   └── interceptor.ts    # 核心拦截器逻辑
│   ├── types.ts             # TypeScript 类型定义
│   └── main.ts              # 应用入口
├── public/
│   ├── background.js        # 后台脚本（消息中转）
│   ├── content.js           # 内容脚本（页面通信）
│   ├── interceptor.js       # 拦截器脚本（web可访问资源）
│   ├── devtools.html        # 开发者工具页面
│   └── manifest.json        # 扩展配置
└── dist/                    # 构建输出目录
```

## � 快速开始

### 环境要求

- Node.js 16.0+
- Chrome 88+（支持 Manifest V3）
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/yxuanzhang/chrome-extension-debug-tools.git
cd chrome-extension-debug-tools
```

2. **安装依赖**

```bash
npm install
# 或使用 yarn
yarn install
```

3. **开发模式**

```bash
npm run dev
# 开发服务器将在 http://localhost:3000 启动
```

4. **构建生产版本**

```bash
npm run build
# 构建产物将输出到 dist/ 目录
```

### Chrome 安装指南

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"开关
3. 点击"加载已解压的扩展程序"按钮
4. 选择项目根目录下的 `dist` 文件夹
5. 扩展安装完成，可在 Chrome 工具栏看到扩展图标
6. 打开开发者工具（F12），在选项卡中找到 "NetLimit" 面板开始使用

## 📖 使用教程

### 基本使用流程

1. **打开开发者工具**

   - 在任意网页按 F12 打开开发者工具
   - 切换到 "NetLimit" 面板

2. **配置拦截规则**

   - 在"脚本拦截"选项卡中添加新规则，支持 XMLHttpRequest 和 fetch 请求拦截
   - 在"声明式拦截"选项卡中配置 declarativeNetRequest 规则
   - 设置 URL 模式（支持正则表达式和包含匹配）
   - 配置响应状态码、响应头和响应体
   - 启用规则使其生效

3. **查看拦截记录**

   - 在"拦截历史"选项卡中查看所有拦截请求
   - 分析请求耗时、响应大小等性能指标
   - 支持导出拦截记录用于分析

4. **管理请求日志**
   - 在"请求记录器"中查看详细的网络请求信息
   - 支持清空记录和导出日志数据

### 高级功能

#### 正则表达式匹配

```regex
# 匹配所有 API 请求
^https://api\.example\.com/.*

# 匹配特定路径的请求
^https://.*/api/v1/users/.*

# 匹配 JSON 数据接口
^.*\.json$
```

#### 条件拦截规则

- **请求方法过滤**：GET、POST、PUT、DELETE、ALL
- **URL 匹配模式**：包含匹配、正则匹配
- **请求头过滤**：基于特定请求头进行拦截
- **响应状态码**：自定义 mock 响应的状态码

## 🔧 开发指南

### 项目结构说明

```typescript
// 核心拦截器类型定义
export interface RequestRule {
  id: string;
  name: string;
  enabled: boolean;
  urlPattern: string;
  filterType: "urlFilter" | "regexFilter";
  method: HttpMethod;
  response: MockResponse;
}

// 拦截器管理器
export class InterceptorManager {
  private interceptFetch(): void;
  private interceptXMLHttpRequest(): void;
  private findMatchingRule(url: string, method: string): RequestRule | null;
}
```

### 自定义开发

#### 添加新的拦截类型

1. 在 `src/types.ts` 中定义新的拦截规则类型
2. 在 `src/utils/interceptor.ts` 中实现拦截逻辑
3. 在对应的 Vue 组件中添加配置界面

#### 扩展通信协议

1. 修改 `public/background.js` 中的消息处理逻辑
2. 更新 `src/components/` 中组件的消息监听器
3. 确保类型安全，更新 `src/types.ts`

## 🐛 故障排除

### 常见问题

**Q: 扩展安装后无法在开发者工具中看到 NetLimit 面板**
A: 检查 Chrome 版本是否支持 Manifest V3，确认扩展已正确加载

**Q: 拦截规则配置后不生效**
A: 确认规则已启用，URL 模式匹配正确，请求方法匹配

**Q: 拦截记录不显示**
A: 检查开发者工具是否打开，background.js 是否正常运行

**Q: 性能问题**
A: 减少不必要的拦截规则，优化正则表达式匹配逻辑

### 调试技巧

- 打开 `chrome://extensions/` 查看扩展控制台日志
- 使用 Vue DevTools 调试组件状态
- 在 background.js 中添加详细日志输出
- 使用 Chrome 扩展调试工具检查消息传递

## 🤝 贡献指南

我们欢迎任何形式的贡献！请参考以下流程：

### 提交 Issue

- 使用明确的标题描述问题
- 提供复现步骤和环境信息
- 如果是功能请求，请详细描述使用场景

### 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 ESLint + Prettier 保持代码风格一致
- 为新功能添加单元测试
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目的支持：

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TDesign Vue Next](https://tdesign.tencent.com/) - 企业级 UI 组件库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 浏览器扩展 API

## 📞 联系我们

- 项目主页：https://github.com/yxuanzhang/chrome-extension-debug-tools
- 问题反馈：https://github.com/yxuanzhang/chrome-extension-debug-tools/issues
- 邮箱：yxuanzhang@example.com

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
