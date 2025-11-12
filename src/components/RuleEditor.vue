<template>
  <t-drawer
    :visible="visible"
    :header="editingRule ? '编辑规则' : '添加规则'"
    @close="$emit('close')"
    @confirm="saveRule"
    size="70%"
    placement="right"
    class="rule-editor-drawer"
  >
    <div class="drawer-content">
      <t-form :model="rule" label-width="120px">
        <t-form-item label="URL模式" required>
          <t-input
            v-model="rule.urlPattern"
            placeholder="例如: .*/api/users.*"
            :status="urlPatternStatus"
            tips="支持正则表达式，如: ^https://api\.example\.com/.*，不能包含中文等非ASCII字符"
          />
          <div v-if="urlPatternStatus === 'error'" class="validation-message">
            <span
              v-if="rule.urlPattern && /[^\x00-\x7F]/.test(rule.urlPattern)"
              class="error-text"
            >
              ✗ URL模式不能包含中文等非ASCII字符
            </span>
            <span v-else-if="rule.urlPattern" class="error-text">
              ✗ URL模式格式错误，请输入有效的正则表达式
            </span>
          </div>
          <div v-if="urlPatternStatus === 'success'" class="validation-message">
            <span class="success-text">✓ URL模式格式正确</span>
          </div>
          <div v-if="validationErrors.urlPattern" class="validation-error">
            <span class="error-text">✗ {{ validationErrors.urlPattern }}</span>
          </div>
        </t-form-item>
        <t-row :gutter="[24, 24]" style="padding: 12px 0">
          <t-col :span="6">
            <t-form-item label="请求方法" name="method">
              <t-select v-model="rule.method">
                <t-option label="GET" value="GET" />
                <t-option label="POST" value="POST" />
                <t-option label="PUT" value="PUT" />
                <t-option label="DELETE" value="DELETE" />
                <t-option label="PATCH" value="PATCH" />
                <t-option label="OPTIONS" value="OPTIONS" />
                <t-option label="HEAD" value="HEAD" />
              </t-select>
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="响应延迟">
              <t-input-number
                v-model="rule.delay"
                :min="0"
                :max="10000"
                placeholder="延迟时间(毫秒)"
                tips="0表示立即响应"
              />
            </t-form-item>
          </t-col>
        </t-row>
        <t-form-item label="响应体类型">
          <t-radio-group v-model="responseType">
            <t-radio value="json">JSON</t-radio>
            <t-radio value="text">文本</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="响应头">
          <t-input
            v-model="headersText"
            type="textarea"
            :rows="3"
            placeholder="Content-Type: application/json"
            tips="每行一个响应头，格式: Key: Value"
          />
        </t-form-item>
        <t-form-item label="响应体">
          <div class="response-body-container">
            <div v-if="responseType === 'json'" class="json-editor-actions">
              <t-button
                size="small"
                @click="formatJson"
                :disabled="!responseBodyText"
              >
                格式化JSON
              </t-button>
              <t-button
                size="small"
                @click="validateJson"
                :disabled="!responseBodyText"
              >
                验证JSON
              </t-button>
              <t-button
                size="small"
                @click="togglePreview"
                :disabled="!responseBodyText"
              >
                {{ showPreview ? "隐藏预览" : "显示预览" }}
              </t-button>
            </div>
            <textarea
              v-model="responseBodyText"
              class="response-textarea"
              :rows="showPreview ? 4 : 8"
              :placeholder="
                responseType === 'json' ? 'JSON格式的响应体' : '文本响应体'
              "
              @blur="onResponseBodyBlur"
              @keydown.ctrl.enter="formatJson"
              @keydown.ctrl.shift.enter="validateJson"
            />
            <div
              v-if="responseType === 'json' && responseBodyText && showPreview"
              class="json-preview"
            >
              <div class="preview-header">JSON预览</div>
              <pre class="preview-content">{{
                formatJsonForPreview(responseBodyText)
              }}</pre>
            </div>
            <div
              v-if="responseType === 'json' && responseBodyText"
              class="json-status"
            >
              <span
                v-if="responseBodyStatus === 'success'"
                class="status-success"
                >✓ JSON格式正确</span
              >
              <span v-if="responseBodyStatus === 'error'" class="status-error"
                >✗ JSON格式错误</span
              >
              <span class="status-tip">
                （快捷键：Ctrl+Enter 格式化，Ctrl+Shift+Enter 验证）
              </span>
            </div>
            <div v-if="validationErrors.responseBody" class="validation-error">
              <span class="error-text"
                >✗ {{ validationErrors.responseBody }}</span
              >
            </div>
          </div>
        </t-form-item>
      </t-form>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { RequestRule } from "../types";

interface Props {
  visible: boolean;
  editingRule?: RequestRule | null;
}

interface Emits {
  (e: "save", rule: RequestRule): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式数据
const rule = ref<RequestRule>({
  id: "",
  enabled: true,
  urlPattern: "",
  method: "GET",
  delay: 0,
  response: {
    status: 200,
    headers: {},
    body: {},
  },
});

const headersText = ref("");
const responseBodyText = ref("");
const responseType = ref<"json" | "text">("json");
const showPreview = ref(false);
const responseBodyStatus = ref("");

// 表单校验错误信息
const validationErrors = ref({
  urlPattern: "",
  responseBody: "",
});

// URL模式验证状态
const urlPatternStatus = computed(() => {
  if (!rule.value.urlPattern) return "";

  // 检查是否包含非ASCII字符
  const hasNonAscii = /[^\x00-\x7F]/.test(rule.value.urlPattern);
  if (hasNonAscii) {
    return "error";
  }

  try {
    new RegExp(rule.value.urlPattern);
    return "success";
  } catch {
    return "error";
  }
});

// 监听编辑规则变化
watch(
  () => props.editingRule,
  (newRule) => {
    if (newRule) {
      rule.value = JSON.parse(JSON.stringify(newRule));
      headersText.value = Object.entries(newRule.response.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      if (typeof newRule.response.body === "string") {
        responseType.value = "text";
        responseBodyText.value = newRule.response.body;
        responseBodyStatus.value = "";
      } else {
        responseType.value = "json";
        responseBodyText.value = JSON.stringify(newRule.response.body, null, 2);
        responseBodyStatus.value = "success";
      }
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// 监听headers文本变化
watch(headersText, (newText) => {
  const headers: Record<string, string> = {};
  newText.split("\n").forEach((line) => {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  });
  rule.value.response.headers = headers;
});

// 监听响应体类型变化
watch(responseType, (newType) => {
  if (newType === "json") {
    try {
      rule.value.response.body = JSON.parse(responseBodyText.value || "{}");
      responseBodyStatus.value = "success";
    } catch {
      rule.value.response.body = {};
      responseBodyStatus.value = "error";
    }
  } else {
    rule.value.response.body = responseBodyText.value;
    responseBodyStatus.value = "";
  }
});

// 监听响应体文本变化
watch(responseBodyText, (newText) => {
  if (responseType.value === "json") {
    try {
      rule.value.response.body = JSON.parse(newText || "{}");
      responseBodyStatus.value = "success";
    } catch {
      responseBodyStatus.value = "error";
    }
  } else {
    rule.value.response.body = newText;
    responseBodyStatus.value = "";
  }
});

// 格式化JSON
const formatJson = () => {
  if (!responseBodyText.value) return;
  try {
    const parsed = JSON.parse(responseBodyText.value);
    responseBodyText.value = JSON.stringify(parsed, null, 2);
    responseBodyStatus.value = "success";
  } catch (error) {
    responseBodyStatus.value = "error";
  }
};

// 验证JSON
const validateJson = () => {
  if (!responseBodyText.value) return;
  try {
    JSON.parse(responseBodyText.value);
    responseBodyStatus.value = "success";
  } catch (error) {
    responseBodyStatus.value = "error";
  }
};

// 切换预览
const togglePreview = () => {
  showPreview.value = !showPreview.value;
};

// 响应体失去焦点时验证
const onResponseBodyBlur = () => {
  if (responseType.value === "json" && responseBodyText.value) {
    validateJson();
  }
};

// 格式化JSON预览
const formatJsonForPreview = (jsonText: string) => {
  try {
    const parsed = JSON.parse(jsonText);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonText;
  }
};

// 保存规则
const saveRule = () => {
  // 清空之前的错误信息
  validationErrors.value = {
    urlPattern: "",
    responseBody: "",
  };

  let hasError = false;

  // 检查URL模式是否为空
  if (!rule.value.urlPattern || !rule.value.urlPattern.trim()) {
    validationErrors.value.urlPattern = "URL模式不能为空，请输入有效的URL模式";
    hasError = true;
  }

  // 验证URL模式是否包含非ASCII字符
  const hasNonAscii = /[^\x00-\x7F]/.test(rule.value.urlPattern);
  if (hasNonAscii) {
    validationErrors.value.urlPattern =
      "URL模式不能包含中文等非ASCII字符，请使用英文或ASCII字符";
    hasError = true;
  }

  // 验证URL模式
  try {
    new RegExp(rule.value.urlPattern);
  } catch (error) {
    validationErrors.value.urlPattern =
      "URL模式格式错误，请输入有效的正则表达式";
    hasError = true;
  }

  // 验证JSON格式（如果是JSON类型）
  if (responseType.value === "json" && responseBodyText.value) {
    try {
      JSON.parse(responseBodyText.value);
    } catch (error) {
      validationErrors.value.responseBody = "JSON格式错误，请检查响应体格式";
      hasError = true;
    }
  }

  // 如果有错误，不继续保存
  if (hasError) {
    return;
  }

  // 生成唯一ID
  if (!rule.value.id) {
    rule.value.id = `rule_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }

  console.log("保存规则:", {
    id: rule.value.id,
    urlPattern: rule.value.urlPattern,
    method: rule.value.method,
    enabled: rule.value.enabled,
  });

  emit("save", { ...rule.value });
  resetForm();
};

// 重置表单
const resetForm = () => {
  rule.value = {
    id: "",
    enabled: true,
    urlPattern: "",
    method: "GET",
    delay: 0,
    response: {
      status: 200,
      headers: {},
      body: {},
    },
    expanded: false,
  };

  headersText.value = "";
  responseBodyText.value = "";
  responseType.value = "json";
  showPreview.value = false;
  responseBodyStatus.value = "";

  // 清空校验错误信息
  validationErrors.value = {
    urlPattern: "",
    responseBody: "",
  };
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
}

.response-body-container {
  .json-editor-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .response-textarea {
    width: 100%;
    min-height: 120px;
    max-height: 300px;
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }

    &:hover {
      border-color: #40a9ff;
    }
  }

  .json-preview {
    margin-top: 8px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: #fafafa;

    .preview-header {
      padding: 6px 12px;
      background: #f0f0f0;
      border-bottom: 1px solid #e8e8e8;
      font-size: 12px;
      font-weight: 500;
      color: #666;
    }

    .preview-content {
      margin: 0;
      padding: 12px;
      max-height: 200px;
      overflow: auto;
      font-family: "Courier New", monospace;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }

  .json-status {
    margin-top: 4px;
    font-size: 12px;

    .status-success {
      color: #52c41a;
    }

    .status-error {
      color: #f5222d;
    }

    .status-tip {
      color: #999;
      margin-left: 8px;
    }
  }

  .validation-message {
    margin-top: 4px;
    font-size: 12px;

    .success-text {
      color: #52c41a;
    }

    .error-text {
      color: #f5222d;
    }
  }

  .validation-error {
    margin-top: 4px;
    font-size: 12px;

    .error-text {
      color: #f5222d;
      font-weight: 500;
    }
  }
}
</style>
