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
      <t-form
        :model="rule"
        :rules="formRules"
        label-width="120px"
        ref="formRef"
      >
        <t-form-item label="URL模式" name="urlPattern" required>
          <t-input
            v-model="rule.urlPattern"
            placeholder="例如: .*/api/users.*"
            tips="支持正则表达式，如: ^https://api\.example\.com/.*，不能包含中文等非ASCII字符"
          />
        </t-form-item>

        <t-form-item label="匹配模式">
          <t-radio-group v-model="responseType">
            <t-radio value="urlFilter">url</t-radio>
            <t-radio value="regexFilter">regex</t-radio>
          </t-radio-group>
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
            placeholder="Content-Type: application/json"
            tips="每行一个响应头，格式: Key: Value"
          />
        </t-form-item>
        <t-form-item label="响应体" name="responseBody">
          <div class="response-body-container">
            <textarea
              v-model="responseBodyText"
              class="response-textarea"
              :rows="showPreview ? 4 : 8"
              :placeholder="
                responseType === 'json' ? 'JSON格式的响应体' : '文本响应体'
              "
              @keydown.ctrl.enter="formatJson"
            />
          </div>
        </t-form-item>
      </t-form>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
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
const formRef = ref();

// 表单校验规则
const formRules = {
  urlPattern: [
    {
      required: true,
      message: "URL模式不能为空，请输入有效的URL模式",
      trigger: "blur",
    },
    {
      validator: (value: string) => {
        if (!value) return true;
        // 检查是否包含非ASCII字符
        const hasNonAscii = /[^\x00-\x7F]/.test(value);
        if (hasNonAscii) {
          return {
            result: false,
            message: "URL模式不能包含中文等非ASCII字符，请使用英文或ASCII字符",
          };
        }

        // 验证正则表达式格式
        try {
          new RegExp(value);
          return true;
        } catch {
          return {
            result: false,
            message: "URL模式格式错误，请输入有效的正则表达式",
          };
        }
      },
      trigger: "blur",
    },
  ],
  responseBody: [
    {
      validator: () => {
        if (responseType.value === "json" && responseBodyText.value) {
          try {
            console.log(JSON.parse(responseBodyText.value));
            return true;
          } catch {
            return { result: false, message: "JSON格式错误，请检查响应体格式" };
          }
        }
        return true;
      },
      trigger: "blur",
    },
  ],
};

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
      } else {
        responseType.value = "json";
        responseBodyText.value = JSON.stringify(newRule.response.body, null, 2);
      }
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// 格式化JSON
const formatJson = () => {
  if (!responseBodyText.value) return;
  try {
    const parsed = JSON.parse(responseBodyText.value);
    responseBodyText.value = JSON.stringify(parsed, null, 2);
  } catch (error) {}
};

// 保存规则
const saveRule = async () => {
  console.log("保存规则");
  const result = await formRef.value.validate();

  if (typeof result === "boolean" && result === true) {
    // 校验通过，继续保存逻辑
    // 生成唯一ID
    if (!rule.value.id) {
      rule.value.id = `rule_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;
    }

    emit("save", { ...rule.value });
    resetForm();
  }
  // 如果校验失败，TDesign会自动显示错误信息，无需额外处理
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

  // 重置表单校验状态
  if (formRef.value) {
    formRef.value.clearValidate();
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
