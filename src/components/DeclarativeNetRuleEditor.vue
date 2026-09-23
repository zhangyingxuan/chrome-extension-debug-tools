<template>
  <t-drawer
    :visible="visible"
    @close="closeDrawer"
    :size="wide ? '70%' : '560px'"
    :placement="'right'"
    :show-in-attach-elements="false"
    :class="['rule-editor-drawer', wide ? 'dock-bottom' : '']"
  >
    <!-- 右停靠才显示 header；底部停靠紧凑无需 header -->
    <template #header>
      <div class="editor-header">
        <span class="editor-title">{{
          editingRule ? "编辑规则" : "添加规则"
        }}</span>
        <div class="header-actions" v-if="wide">
          <t-button
            variant="text"
            theme="default"
            @click="closeDrawer"
          >
            取消
          </t-button>
          <t-button theme="primary" @click="saveRule">
            保存规则
          </t-button>
        </div>
      </div>
    </template>

    <div class="drawer-content">
      <t-form
        ref="formRef"
        :data="ruleData"
        :rules="formRules"
        label-align="left"
      >
        <!-- 请求匹配 -->
        <section class="card">
          <h4 class="card-title">请求匹配</h4>
          <t-form-item
            label="拦截规则"
            name="urlPattern"
            required
            class="field url-field"
          >
            <t-input
              v-model="ruleData.urlPattern"
              class="url-input"
              :placeholder="
                ruleData.filterType === 'urlFilter'
                  ? '例如: */api/users*'
                  : '例如: ^https://api\\.example\\.com/.*'
              "
            >
              <template #prefixIcon>
                <t-select
                  v-model="ruleData.filterType"
                  class="filter-type-select"
                  size="small"
                >
                  <t-option key="urlFilter" label="URL匹配" value="urlFilter" />
                  <t-option
                    key="regexFilter"
                    label="Reg匹配"
                    value="regexFilter"
                  />
                </t-select>
                <t-select
                  v-model="ruleData.method"
                  class="filter-method-select"
                  size="small"
                >
                  <t-option label="GET" value="GET" />
                  <t-option label="POST" value="POST" />
                  <t-option label="PUT" value="PUT" />
                  <t-option label="DELETE" value="DELETE" />
                  <t-option label="PATCH" value="PATCH" />
                  <t-option label="OPTIONS" value="OPTIONS" />
                  <t-option label="HEAD" value="HEAD" />
                </t-select>
              </template>
            </t-input>
          </t-form-item>
        </section>

        <!-- 响应配置 -->
        <section class="card">
          <h4 class="card-title">响应配置</h4>
          <div class="row-2col">
            <t-form-item label="响应体类型" class="field">
              <t-radio-group v-model="responseType" class="type-radio">
                <t-radio value="json">JSON</t-radio>
                <t-radio value="text">文本</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item label="状态码" class="field">
              <t-input-number
                v-model="ruleData.response.status"
                :min="100"
                :max="599"
                placeholder="200"
                class="status-input"
              />
            </t-form-item>
          </div>
          <t-form-item label="响应体" name="responseBody" class="field grow">
            <t-textarea
              v-model="ruleData.responseBody"
              class="code-textarea body-area"
              :autosize="{
                minRows: wide ? 4 : 9,
                maxRows: wide ? 12 : 40,
              }"
              :placeholder="
                responseType === 'json' ? 'JSON格式的响应体' : '文本响应体'
              "
              @blur="formatJson"
            />
          </t-form-item>
        </section>

        <!-- 请求 / 响应头 -->
        <section class="card">
          <h4 class="card-title">自定义头</h4>
          <div class="row-2col">
            <t-form-item label="响应头" class="field">
              <t-textarea
                v-model="responseHeadersJson"
                class="code-textarea head-area"
                placeholder='如：{"Content-Type":"application/json"}'
                :autosize="{
                  minRows: wide ? 3 : 4,
                  maxRows: wide ? 8 : 10,
                }"
                @blur="parseResponseHeaders"
              />
            </t-form-item>
            <t-form-item label="请求头" class="field">
              <t-textarea
                v-model="requestHeadersJson"
                class="code-textarea head-area"
                placeholder='如：{"Authorization":"Bearer token"}'
                :autosize="{
                  minRows: wide ? 3 : 4,
                  maxRows: wide ? 8 : 10,
                }"
                @blur="parseRequestHeaders"
              />
            </t-form-item>
          </div>
        </section>
      </t-form>
    </div>

    <template #footer>
      <div class="editor-footer">
        <t-button variant="text" theme="default" @click="closeDrawer">
          取消
        </t-button>
        <t-button theme="primary" @click="saveRule"> 保存规则 </t-button>
      </div>
    </template>
  </t-drawer>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { RequestRule } from "@/types";
import { generateId } from "@/utils/common";
interface Props {
  visible: boolean;
  editingRule?: RequestRule | null;
  wide?: boolean;
}
interface Emits {
  (e: "save", rule: RequestRule): void;
  (e: "close"): void;
}
const props = withDefaults(defineProps<Props>(), { wide: false });
const emit = defineEmits<Emits>();

const defaultRule = {
  id: "",
  ruleId: -1,
  enabled: true,
  method: "GET",
  urlPattern: "",
  filterType: "urlFilter",
  responseBody: "",
  response: {
    status: 200,
    headers: {},
    body: {},
  },
  expanded: false,
};
// 响应式数据
const ruleData = reactive<RequestRule>(JSON.parse(JSON.stringify(defaultRule)));

const responseType = ref<"json" | "text">("json");
const responseHeadersJson = ref("{}");
const requestHeadersJson = ref("{}");
const formRef = ref();

// 表单校验规则
const formRules = {
  urlPattern: [
    {
      required: true,
      message: "响应体不能为空",
      trigger: "blur",
    },
    {
      validator: (value: string) => {
        if (!value) return true;

        if (ruleData.filterType === "urlFilter") {
          // URL匹配模式：简单的URL模式匹配，支持通配符
          // 检查是否包含非ASCII字符
          const hasNonAscii = /[^\x00-\x7F]/.test(value);
          if (hasNonAscii) {
            return {
              result: false,
              message:
                "URL模式不能包含中文等非ASCII字符，请使用英文或ASCII字符",
            };
          }

          // URL模式校验通过
          return true;
        } else {
          // 正则表达式模式：严格的正则表达式校验
          try {
            new RegExp(value);
            return true;
          } catch {
            return {
              result: false,
              message: "正则表达式格式错误，请输入有效的正则表达式",
            };
          }
        }
      },
      trigger: "blur",
    },
  ],
  responseBody: [
    {
      required: true,
      message: "响应体不能为空，请输入有效的响应体内容",
      trigger: "blur",
    },
    {
      validator: (value: string) => {
        if (responseType.value === "json" && value) {
          try {
            // 使用修复后的JSON进行验证
            const fixedJson = fixJsonFormat(value);
            JSON.parse(fixedJson);
            return true;
          } catch (e) {
            console.error("JSON格式错误", e);
            return { result: false, message: "JSON格式错误，请检查响应体格式" };
          }
        }
        return true;
      },
      trigger: "blur",
    },
  ],
};

// 重置表单
const resetForm = () => {
  Object.assign(ruleData, defaultRule);
  responseType.value = "json";
  responseHeadersJson.value = "{}";
  requestHeadersJson.value = "{}";

  // 重置表单校验状态
  if (formRef.value) {
    formRef.value.clearValidate();
  }
};

const closeDrawer = () => {
  resetForm();
  emit("close");
};
// 监听编辑规则变化
watch(
  () => props.editingRule,
  (newRule) => {
    if (newRule) {
      Object.assign(ruleData, JSON.parse(JSON.stringify(newRule)));

      // 设置过滤类型（如果规则中有filterType则使用，否则默认使用urlFilter）
      if (newRule.filterType) {
        ruleData.filterType = newRule.filterType;
      } else {
        ruleData.filterType = "urlFilter";
      }

      // 处理响应体数据
      if (typeof newRule.response.body === "string") {
        responseType.value = "text";
        ruleData.responseBody = newRule.response.body;
      } else if (
        newRule.response.body &&
        typeof newRule.response.body === "object" &&
        Object.keys(newRule.response.body).length > 0
      ) {
        responseType.value = "json";
        ruleData.responseBody = JSON.stringify(newRule.response.body, null, 2);
      } else {
        // 处理空对象或其他情况
        responseType.value = "json";
        ruleData.responseBody = JSON.stringify(
          { message: "默认响应体" },
          null,
          2,
        );
      }

      // 加载响应头和请求头
      responseHeadersJson.value = JSON.stringify(
        newRule.response?.headers || {},
        null,
        2,
      );
      requestHeadersJson.value = JSON.stringify(
        newRule.requestHeaders || {},
        null,
        2,
      );
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

// 修复JSON格式，自动为key添加双引号
const fixJsonFormat = (jsonString: string): string => {
  if (!jsonString.trim()) return jsonString;

  try {
    // 先尝试直接解析，如果成功则直接返回
    JSON.parse(jsonString);
    return jsonString;
  } catch (error) {
    // 纯文本修复：去尾逗号、无引号key、单引号字符串，再重新 parse。
    // 禁止 new Function/eval：扩展页 MV3 CSP 下会抛 EvalError，且触发
    // Chrome Web Store「动态代码」政策审查。
    try {
      const repaired = jsonString
        .replace(/'([^']*)'/g, (_m, inner: string) => JSON.stringify(inner))
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.stringify(JSON.parse(repaired), null, 2);
    } catch {
      // 修复失败，返回原始字符串
      console.warn("JSON格式修复失败:", error);
      return jsonString;
    }
  }
};

// 格式化JSON
const formatJson = () => {
  // 如果是json格式，则格式化
  if (responseType.value !== "json" || !ruleData.responseBody) return;
  try {
    // 先修复格式，再解析和格式化
    const fixedJson = fixJsonFormat(ruleData.responseBody);
    const parsed = JSON.parse(fixedJson);
    ruleData.responseBody = JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.warn("JSON格式化失败:", error);
  }
};

const parseResponseHeaders = () => {
  try {
    if (responseHeadersJson.value.trim()) {
      JSON.parse(responseHeadersJson.value);
    }
  } catch {
    console.warn("响应头JSON格式错误");
  }
};

const parseRequestHeaders = () => {
  try {
    if (requestHeadersJson.value.trim()) {
      JSON.parse(requestHeadersJson.value);
    }
  } catch {
    console.warn("请求头JSON格式错误");
  }
};

// 保存规则
const saveRule = async () => {
  try {
    // 执行表单校验
    const validateResult = await formRef.value.validate();
    if (validateResult !== true) {
      return;
    }

    // 校验通过，继续保存逻辑
    // 生成唯一ID
    if (!ruleData.id) {
      ruleData.id = generateId("rule");
    }

    // 处理响应体数据
    let responseBody;
    if (responseType.value === "json" && ruleData.responseBody) {
      // 使用修复后的JSON进行解析
      const fixedJson = fixJsonFormat(ruleData.responseBody);
      responseBody = JSON.parse(fixedJson);
    } else {
      responseBody = ruleData.responseBody;
    }

    // 保存过滤类型信息
    let responseHeaders = {};
    try {
      responseHeaders = responseHeadersJson.value.trim()
        ? JSON.parse(responseHeadersJson.value)
        : {};
    } catch {
      /* keep empty */
    }

    let requestHeaders = {};
    try {
      requestHeaders = requestHeadersJson.value.trim()
        ? JSON.parse(requestHeadersJson.value)
        : {};
    } catch {
      /* keep empty */
    }

    const ruleToSave = {
      ...ruleData,
      requestHeaders,
      response: {
        ...ruleData.response,
        body: responseBody,
        headers: responseHeaders,
      },
      enableResponseHeaders: Object.keys(responseHeaders).length > 0,
      enableRequestHeaders: Object.keys(requestHeaders).length > 0,
      enableStatusCode: true,
    };

    emit("save", ruleToSave);
    resetForm();
  } catch (error) {
    console.warn("表单校验失败:", error);
  }
};
</script>

<style lang="less" scoped>
@primary: #2f6fed;
@bg: #f5f6f8;
@surface: #ffffff;
@border: #e4e7ec;
@text: #1f2633;
@subtext: #5b6472;
@mono: "SFMono-Regular", "JetBrains Mono", Consolas, "Liberation Mono", Menlo,
  monospace;

.rule-editor-drawer {
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;

    .editor-title {
      font-size: 13px;
      font-weight: 600;
      color: @text;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;

      :deep(.t-button) {
        height: 26px;
        padding: 0 10px;
        font-size: 12px;
        border-radius: 6px;
      }
    }
  }

  .drawer-content {
    display: flex;
    flex-direction: column;
    min-height: 0;

    .t-form {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      min-height: 0;

      // 白色分区卡
      .card {
        background: @surface;
        border: 1px solid @border;
        border-radius: 8px;
        padding: 14px;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);

        .card-title {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 600;
          color: @text;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          gap: 6px;
          &::before {
            content: "";
            width: 3px;
            height: 12px;
            border-radius: 2px;
            background: @primary;
          }
        }

        .row-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        :deep(.t-form__label) {
          font-size: 11.5px;
          color: @subtext;
          font-weight: 500;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        :deep(.t-form__item) {
          margin-bottom: 10px;
          &:last-child {
            margin-bottom: 0;
          }
        }

        .grow {
          margin-bottom: 0;
          :deep(.t-form__controls) {
            .t-form__controls-content {
              display: block;
            }
          }
        }
      }
    }

    // 等宽代码输入
    .url-input {
      :deep(input) {
        font-family: @mono;
        font-size: 12px;
      }
    }
    .code-textarea {
      :deep(textarea) {
        font-family: @mono;
        font-size: 12px;
        line-height: 1.55;
        background: #fbfcfe;
      }
    }

    .filter-type-select {
      width: 88px;
    }
    .filter-method-select {
      width: 80px;
    }
    .type-radio {
      display: flex;
    }
    .status-input {
      width: 100%;
    }
    .t-input--prefix {
      padding: 0;
    }
  }

  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;

    :deep(.t-button) {
      border-radius: 6px;
    }
  }

  // 底部停靠：抽屉更高(72%)、砍掉 header、全宽多栏、footer 压缩
  &.dock-bottom {
    .drawer-content {
      .t-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto minmax(min-content, 1fr);
        gap: 4px 8px;
        overflow-x: hidden;
        overflow-y: auto;
        min-height: 0;

        // 请求匹配占整行，响应配置与自定义头两列并排
        .card {
          padding: 6px 8px;
          box-shadow: none;

          &:nth-child(1) {
            grid-column: 1 / -1;
          }
          &:nth-child(2) {
            grid-column: span 1;
          }
          &:nth-child(3) {
            grid-column: span 1;
            display: flex;
            flex-direction: column;
            .row-2col {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            :deep(.t-form__controls) {
              flex: 1;
              display: flex;
              .t-form__controls-content {
                flex: 1;
                display: flex;
                .t-textarea {
                  flex: 1;
                }
              }
            }
          }

          .card-title {
            margin-bottom: 2px;
            font-size: 10.5px;
          }
          :deep(.t-form__label) {
            margin-bottom: 1px;
            font-size: 10.5px;
          }
          :deep(.t-form__item) {
            margin-bottom: 2px;
          }
        }
      }
    }

    .editor-footer {
      :deep(.t-button) {
        height: 30px;
        padding: 0 12px;
        font-size: 12px;
      }
    }
  }
}
</style>

<style lang="less">
/* 非 scoped：TDesign Drawer 通过 Teleport 渲染到 body，
   root 节点无 data-v 属性，scoped /deep/ 无法命中。 */
.rule-editor-drawer {
  .t-drawer__header {
    padding: 12px 16px;
    min-height: 0;
    border-bottom: 1px solid #e4e7ec;
  }
  .t-drawer__body {
    padding: 14px 16px;
    background: #f5f6f8;
  }
  .t-drawer__footer {
    padding: 8px 16px;
    border-top: 1px solid #e4e7ec;
    background: #ffffff;
  }

  &.dock-bottom {
    .t-drawer__header {
      padding: 6px 12px;
    }
    .t-drawer__body {
      padding: 8px 12px;
    }
    .t-drawer__footer {
      display: none;
    }
  }
}
</style>
