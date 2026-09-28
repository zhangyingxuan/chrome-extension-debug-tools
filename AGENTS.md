# AI Agent 工作指南

## 工作台定位

- 本仓库是面向人和 AI Agent 的 **chrome-extension 领域工程工作台**，以受治理的知识库和轻量 Ontology 为事实底座。
- 工作台覆盖领域知识维护、需求与设计、测试与代码评审、发布追踪、运维排查、问题复盘、流量与成本分析等工程活动。
- `.agents/skills/` 和项目脚本负责固化可复用工作流程；正式文档、Context 和 Ontology 负责沉淀可验证的事实、决策与产物。

## Agent 职责

- **按需加载上下文**：从根 `INDEX.md` 和领域 Context 定位事实来源，避免无目标地扫描整个仓库。
- **基于证据工作**：优先使用 Ontology、正式文档、源码、配置和运行数据，明确区分当前事实、历史快照、推断和待验证项。
- **完成工程闭环**：根据任务产出设计、分析、测试、评审、发布或复盘结果；需要长期复用的结论写入对应权威文档，不把临时数据当作知识沉淀。
- **复用领域能力**：任务命中 `.agents/skills/` 时优先遵循对应 Skill，临时数据和中间产物统一放入 `.tmp/aiot_agent/yyyyMMDD`。
- **守住操作边界**：只在用户授权范围内调用外部工具；查询、发布、部署、数据库写入等操作遵循对应 Skill 和环境规则。
- **保证可验证性**：文档变更后更新生成索引并通过知识质量检查，确保导航、元数据、关系和来源引用保持一致。

- 目录下如有 `AGENTS.md` 文件，读取 `AGENTS.md`，遵循其中的规则和指引。
- 文档查找从根 `INDEX.md` 定位知识域，再读取目标目录的 `INDEX.md`；不要默认加载全部索引和 Context。
- 临时文件保存到 `./.tmp/aiot_agent/yyyyMMDD`，避免污染工作台的正式知识资产。

## 核心规则

- 文档创建遵循 `rules/document-rules.md`
- 概要设计（含后端概要设计和 HLD）统一保存到 `04_技术方案/`，使用 `doc_type: design`；禁止保存到 `03_架构设计/`。
- CHANGELOG 生成遵循 `rules/changelog-rules.md`
- 业务规则入口：`00_CONTEXT/INDEX.md`；根据任务按需读取对应领域 Context
- 文档导航：根 `INDEX.md` 只维护知识域入口，各目录 `INDEX.md` 维护具体文档列表
- 查询表、接口、服务及其关系时，优先在 `ontology/` 查找对应领域本体文件；只有本体未覆盖时才回退到代码或文档扫描
- 生成或维护文档时，如果某个尚未建模的业务已经积累了较完整的知识，出现可稳定复用的业务对象、关键事实或跨文档关系，应主动提醒用户是否为该业务单独建立领域 Ontology；未经用户确认不直接创建
- 未闭环事项登记与更新到根 `TRACKING.md`：AI 在工程活动中识别到待验证、待确认、待观察、待处理事项时主动登记，事项闭环后从该文件删除

## 验证（文档变更后必须执行）

文档修改后，在 Verify 阶段按顺序执行：

1. `python scripts/build_indexes.py` — 更新 INDEX.md
2. `python scripts/knowledge_check.py` — 质量检查，必须 0 error 才能提交

## 文档规则

- 画图使用 **Mermaid** 语法
- 普通知识文档必须维护 YAML Front Matter，字段规范见 `rules/document-rules.md`
- `services` 必须使用 `rules/metadata-taxonomy.yaml` 中的规范值
- 强一致 Context 必须维护可验证的 `source_refs`
- 涉及已建模业务对象时使用 `ontology_refs`，对象、关键事实和语义关系遵循 `ontology/README.md`
- 根 `INDEX.md` 只在新增、删除或调整一级知识域时修改

## 已知问题修复记录

> 记录 Agent 排查结论，供后续复用，避免重复踩坑。本节为轻量登记；需长期复用的正式结论迁入 `10_问题分析/`、`11_常见问题/`。

### 2026-09-28 请求拦截（declarativeNetRequest）规则不生效，接口仍返回真实数据

- **现象**：请求拦截标签配置规则后，页面请求接口仍返回真实数据（mock 未生效）；历史上偶有生效。
- **根因**（两个叠加，均导致 `updateDynamicRules` 原子校验拒绝整条规则，从而从未安装）：
  1. **规则 id 非法**：DNR 编辑器新建规则 `ruleId` 恒为 `-1`，而 Chrome DNR 要求规则 `id >= 1`。编辑器默认 `ruleId: -1` 且保存不赋值，面板 `ruleManager.save` 新建分支也未分配 → 主规则 `id: -1` 被拒。
  2. **resourceTypes 含非法值 `"fetch"`**：`resourceTypes: ["xmlhttprequest", "fetch"]` 中 `fetch` 不是 Chrome DNR 的 ResourceType 枚举值（那是 Firefox `webRequest` 类型），校验 index 1 报错 → 规则被整体拒绝。页面 `fetch()`/`XMLHttpRequest` 在 Chrome 均归类为 `xmlhttprequest`，只保留该项即可。
  - 补充：扩展重载/更新会清空 dynamic rules；仅面板展示缓存规则不会重装到 DNR。后台 service worker 需在 `onInstalled`/`onStartup` 及 `requestRules` 变更时重装，且逐条安装以隔离单条非法规则（DNR 校验为 all-or-nothing）。
- **修复**（工作区未提交，用户要求先人工验证、不主动提交；详见下方登记）：
  - `src/components/DeclarativeNetInterceptor.vue`：`ruleManager.save` 新建规则分配真实 `maxRuleId`；`loadRules` 调 `repairInvalidRuleIds()` 修复历史 `ruleId:-1`/重复；`dnrConverter.convert` 的 `resourceTypes` 改为 `["xmlhttprequest"]`。
  - `public/background.js`：新增 `syncDnrRules()`，在启动/存储变更时重装 DNR 规则并跳过非法 `ruleId`；`convertDnrRule` 的 `resourceTypes` 同样改为 `["xmlhttprequest"]`。
- **验证要点**：stub 面板 + 记录型 DNR 确认 `ruleId:-1` 被修复为 `1000` 且以 `id:1000` 安装；真实扩展报错 `[DNR][bg] ... resourceTypes index 1 ...` 在去掉 `fetch` 后消失。
- **关键教训**：Chrome DNR 的 ResourceType 枚举**无 `fetch`**（`main_frame/sub_frame/stylesheet/script/image/font/object/xmlhttprequest/ping/csp_report/media/websocket/webtransport/webbundle/other`）；`updateDynamicRules` 是原子操作，任何一条非法规则（非法 id、非法 resourceType、重复 id、超限）都会让整批 `addRules` 失败且 `Promise` reject。面板/后台的 DNR 转换逻辑必须保持一致（同规则 id、同 resourceType）。

### 2026-09-28 请求拦截 启用/禁用 交互异常（紧接上条）

- **现象**：请求拦截的启用/禁用开关状态异常：面板打开后总开关恒显示「禁用」即使规则实际已启用；或对单条规则切换后数据丢失。
- **根因**（三个叠加）：
  1. **总开关状态未从存储恢复**：DNR 面板 `cacheManager.load()` 只读 `requestRules` 回填规则列表，从未读 `requestRulesEnabled` 到 `isEnabled`（脚本拦截面板有做，DNR 漏了）→ 挂载后 `isEnabled` 恒为 `false`，总开关恒显示「禁用」。
  2. **`repairInvalidRuleIds` 误伤全部规则**：初版用 `validSet` 预先把所有合法 id 放入 `used`，主循环再把「id 在 used 里」当重复 → 每条合法规则都被重新分配 id（1001/1002/1003 → 1000/1004/1005），且每次加载都重分，造成 id 抖动、DNR 旧规则残留。
  3. **浅拷贝泄漏响应式 Proxy**：`ruleManager.update`/`save` 用 `{...rule}`，嵌套 `response.body` 以 Vue reactive Proxy 存入 `chrome.storage` 被序列化清空（与脚本拦截 `Q.some` 同源问题）→ 单条规则切换后 body 变 `{}`。
- **修复**（工作区未提交）：
  - `cacheManager.load` 恢复 `isEnabled.value = result.requestRulesEnabled || false`。
  - `repairInvalidRuleIds` 改为单遍扫描：保留合法唯一 id，仅对非法/重复 id 分配新 id。
  - `ruleManager.update`/`save` 改用 `deepClone(rule)` 剥离 Proxy。
- **验证要点**：stub 面板复现——总开关加载后为 checked；规则 id 保持 1001/1002 不被重分；单条规则 off→on 后 `response.body` 原样保留（`{"name":"k1","items":[1,2,3]}`）；启用状态正确同步到 DNR（仅启用规则安装）。

### 2026-09-28 请求拦截 编辑器响应体类型默认值

- **现象**：新建规则时响应体类型偶发默认为「文本」而非「JSON」。
- **根因**：DNR 编辑器 `responseType` 默认值本身是 `"json"`（`resetForm` 也设 json），但面板关闭抽屉走 `@close="showAddRuleDialog=false"`，只改 `visible`、**不触发编辑器的 `resetForm`**；编辑器只 `watch(() => props.editingRule)`。若上次是「新建模式下切到文本、未保存、用面板 X 关闭」，再点添加时 `editingRule` 仍为 null（null→null 不触发 watch）→ `responseType` 残留为「文本」。
- **修复**：`DeclarativeNetRuleEditor.vue` 增加 `watch(() => props.visible)`——抽屉打开且非编辑（`!props.editingRule`）时 `resetForm()`，确保新建规则响应体类型默认 JSON。编辑模式（editingRule 非空）不受影响。
- **验证要点**：新建添加默认勾选 JSON；编辑文本 body 规则显示「文本」正常；关闭后再次新建应回到 JSON。

### 2026-09-28 请求记录「拦截」快捷建规则响应体类型错误选为文本

- **现象**：请求记录点「拦截」按钮（路由到请求拦截/DNR 编辑器），请求响应体是 JSON 数据，但抽屉响应体类型默认选中「文本」。
- **根因**：`quickAddRule` 把真实响应体 `JSON.stringify` 成字符串传入 `ruleData.response.body`；DNR 编辑器 `editingRule` watch 的 `typeof body === "string"` 分支一律判为「文本」，未识别字符串内容是否为合法 JSON。副带问题：保存时 text 分支会把该 JSON 字符串再 `JSON.stringify`，导致 `data:` 重定向 URL 双重编码、mock 返回字符串而非对象。
- **修复**：`DeclarativeNetRuleEditor.vue` 的 string 分支先 `JSON.parse` 探测——合法 JSON → `responseType="json"` 并 pretty-print；非 JSON → `"text"`。
- **验证要点**：JSON 字符串 body → 默认 JSON；纯文本 body → 默认「文本」；空/对象 body → JSON。

### 2026-09-28 DNR modifyHeaders 规则因 header 值为对象被拒

- **现象**：`[DNR] 跳过非法规则 1000: ... action.responseHeaders[0].value: Invalid type: expected string, found object`。
- **根因**：负责 header 修改的附加规则（id = ruleId+100000/+200000）把 `response.headers`/`requestHeaders` 的值原样透传到 `modifyHeaders.value`；当值是非字符串（对象/数字/布尔）时 DNR 校验 `value` 必须为 string → 整条规则被 `updateDynamicRules` 原子拒绝。
- **修复**：面板 `DeclarativeNetInterceptor.vue` 的 `convert` 与后台 `public/background.js` 的 `convertDnrRule` 均对 header 值强转：字符串原样，否则 `JSON.stringify(v) ?? ""`。
- **验证要点**：stub 确认对象 header 值被序列化为字符串（`X-Custom` → `"{\"nested\":true,...}"`），modifyHeaders 规则可安装。
