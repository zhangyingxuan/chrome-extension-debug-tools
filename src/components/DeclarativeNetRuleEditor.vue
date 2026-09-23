<template>
  <t-drawer
    :visible="visible"
    :header="editingRule ? '编辑规则' : '添加规则'"
    @close="closeDrawer"
    @confirm="saveRule"
    :size="placement === 'bottom' ? '44%' : '70%'"
    :placement="placement"
    :class="[
      'rule-editor-drawer',
      placement === 'bottom' ? 'dock-bottom' : '',
    ]"
  >
    <div class="drawer-content">
      <t-form
        ref="formRef"
        :data="ruleData"
        :rules="formRules"
        label-width="120px"
      >
        <t-form-item label="拦截规则" name="urlPattern" required class="full-col">
          <t-input
            v-model="ruleData.urlPattern"
            :placeholder="
              ruleData.filterType === 'urlFilter'
                ? '例如: */api/users*'
                : '例如: ^https://api\\.example\\.com/.*'
            "
          >
            <!-- :tips="
              rule.filterType === 'urlFilter'
                ? '支持通配符匹配，如: */api/*，不能包含中文等非ASCII字符'
                : '支持正则表达式，如: ^https://api\\.example\\.com/.*'
            " -->
            <template #prefixIcon>
              <t-select
                v-model="ruleData.filterType"
                class="filter-type-select"
              >
                <t-option key="urlFilter" label="URL匹配" value="urlFilter" />
                <t-option
                  key="regexFilter"
                  label="Reg匹配"
                  value="regexFilter"
                />
              </t-select>
              <t-select v-model="ruleData.method" class="filter-method-select">
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
        <t-form-item label="响应体类型" class="half-col">
          <t-radio-group v-model="responseType">
            <t-radio value="json">JSON</t-radio>
            <t-radio value="text">文本</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="响应状态码" class="half-col">
          <t-input-number
            v-model="ruleData.response.status"
            :min="100"
            :max="599"
            placeholder="200"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item label="响应体" name="responseBody" class="full-col">
          <t-textarea
            v-model="ruleData.responseBody"
            :autosize="{
              minRows: 4,
              maxRows: placement === 'bottom' ? 6 : 12,
            }"
            :placeholder="
              responseType === 'json' ? 'JSON格式的响应体' : '文本响应体'
            "
            @blur="formatJson"
          />
        </t-form-item>
        <t-form-item label="响应头" class="half-col">
          <t-textarea
            v-model="responseHeadersJson"
            placeholder='请输入JSON格式的响应头，如：{"Content-Type": "application/json"}'
            :autosize="placement === 'bottom' ? { minRows: 2, maxRows: 4 } : { minRows: 3, maxRows: 6 }"
            @blur="parseResponseHeaders"
          />
        </t-form-item>
        <t-form-item label="请求头" class="half-col">
          <t-textarea
            v-model="requestHeadersJson"
            placeholder='请输入JSON格式的请求头，如：{"Authorization": "Bearer token"}'
            :autosize="placement === 'bottom' ? { minRows: 2, maxRows: 4 } : { minRows: 3, maxRows: 6 }"
            @blur="parseRequestHeaders"
          />
        </t-form-item>
      </t-form>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { RequestRule } from "@/types";
import { generateId } from "@/utils/common";
interface Props {
  visible: boolean;
  editingRule?: RequestRule | null;
  placement?: "right" | "bottom";
}
interface Emits {
  (e: "save", rule: RequestRule): void;
  (e: "close"): void;
}
const props = withDefaults(defineProps<Props>(), { placement: "right" });
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
          2
        );
      }

      // 加载响应头和请求头
      responseHeadersJson.value = JSON.stringify(
        newRule.response?.headers || {},
        null,
        2
      );
      requestHeadersJson.value = JSON.stringify(
        newRule.requestHeaders || {},
        null,
        2
      );
    } else {
      resetForm();
    }
  },
  { immediate: true }
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
        .replace(/,\s*([}\]])/g, '$1');
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
    } catch { /* keep empty */ }

    let requestHeaders = {};
    try {
      requestHeaders = requestHeadersJson.value.trim()
        ? JSON.parse(requestHeadersJson.value)
        : {};
    } catch { /* keep empty */ }

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
.rule-editor-drawer {
  .drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;

    .t-form {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
  }
  .filter-type-select {
    width: 100px;
  }
  .filter-method-select {
    width: 100px;
  }
  .t-input--prefix {
    padding: 0;
  }

  // 停靠底部（横向宽矮）时表单更紧凑：两列栅格布局，中间行吸收纵向留白
  &.dock-bottom {
    :deep(.t-drawer__body) {
      padding: 10px 16px;
    }

    .drawer-content {
      .t-form {
        padding: 0;
        height: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto 1fr auto;
        gap: 2px 20px;
        overflow: hidden;

        .t-form-item.full-col {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
        }

        .t-form-item.half-col {
          grid-column: span 1;
          display: flex;
          flex-direction: column;
        }

        .t-form-item {
          margin-bottom: 0;

          // 响应体占满 1fr 中间行，textarea 撑高以吸收留白
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

          :deep(.t-form__item) {
            margin-bottom: 0;
          }
        }
      }
    }
  }
}
</style>
