<template>
  <div class="request-interceptor">
    <!-- 规则管理 -->
    <div class="rules-section">
      <div class="section-header">
        <h3>拦截规则</h3>
        <div class="header-actions">
          <t-button size="small" @click="importRules">导入规则</t-button>
          <t-button size="small" @click="exportRules">导出规则</t-button>
          <t-button
            theme="primary"
            size="small"
            @click="showAddRuleDialog = true"
          >
            添加规则
          </t-button>
        </div>
      </div>

      <div class="rules-list">
        <div
          v-for="rule in rules"
          :key="rule.id"
          class="rule-item"
          :class="{ disabled: !rule.enabled }"
        >
          <div class="rule-info">
            <div class="rule-header">
              <t-switch
                v-model="rule.enabled"
                size="small"
                @change="updateRule(rule)"
              />
              <span class="rule-method">{{ rule.method }}</span>
              <span class="rule-url">{{ rule.urlPattern }}</span>
              <span v-if="rule.delay > 0" class="rule-delay"
                >延迟: {{ rule.delay }}ms</span
              >
            </div>
            <div class="rule-response">
              响应: {{ rule.response.status }} -
              {{ truncate(rule.response.body) }}
            </div>
          </div>
          <div class="rule-actions">
            <t-button size="small" @click="editRule(rule)">编辑</t-button>
            <t-button size="small" theme="danger" @click="deleteRule(rule.id)"
              >删除</t-button
            >
          </div>
        </div>

        <div v-if="rules.length === 0" class="empty-state">暂无拦截规则</div>
      </div>
    </div>

    <!-- 添加/编辑规则对话框 -->
    <!-- v-model:visible="true" -->
    <!-- v-if="showAddRuleDialog" -->
    <t-dialog
      :visible="showAddRuleDialog"
      :header="editingRule ? '编辑规则' : '添加规则'"
      @close="showAddRuleDialog = false"
      width="700px"
    >
      <t-form :model="newRule" label-width="120px">
        <t-form-item label="URL模式" required>
          <t-input
            v-model="newRule.urlPattern"
            placeholder="例如: .*/api/users.*"
            :status="urlPatternStatus"
          />
          <div class="form-tip">
            支持正则表达式，如: ^https://api\.example\.com/.*
          </div>
        </t-form-item>

        <t-form-item label="请求方法">
          <t-select v-model="newRule.method">
            <t-option label="GET" value="GET" />
            <t-option label="POST" value="POST" />
            <t-option label="PUT" value="PUT" />
            <t-option label="DELETE" value="DELETE" />
            <t-option label="PATCH" value="PATCH" />
            <t-option label="OPTIONS" value="OPTIONS" />
            <t-option label="HEAD" value="HEAD" />
          </t-select>
        </t-form-item>

        <t-form-item label="响应延迟">
          <t-input-number
            v-model="newRule.delay"
            :min="0"
            :max="10000"
            placeholder="延迟时间(毫秒)"
          />
          <div class="form-tip">模拟网络延迟，0表示立即响应</div>
        </t-form-item>

        <t-form-item label="响应状态码">
          <t-input-number
            v-model="newRule.response.status"
            :min="100"
            :max="599"
          />
        </t-form-item>

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
          />
          <div class="form-tip">每行一个响应头，格式: Key: Value</div>
        </t-form-item>

        <t-form-item label="响应体">
          <t-input
            v-model="responseBodyText"
            type="textarea"
            :rows="6"
            :placeholder="
              responseType === 'json' ? 'JSON格式的响应体' : '文本响应体'
            "
          />
        </t-form-item>
      </t-form>

      <template #footer>
        <t-button @click="showAddRuleDialog = false">取消</t-button>
        <t-button theme="primary" @click="saveRule">保存</t-button>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { DialogProps, ButtonProps } from "tdesign-vue-next";
import { RequestRule } from "../types";

interface Props {
  rules: RequestRule[];
}

interface Emits {
  (e: "update-rules", rules: RequestRule[]): void;
  (e: "add-rule", rule: RequestRule): void;
  (e: "delete-rule", ruleId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式数据
const showAddRuleDialog = ref(false);
const editingRule = ref<RequestRule | null>(null);
const headersText = ref("");
const responseBodyText = ref("");
const responseType = ref<"json" | "text">("json");

// 新规则模板
const newRule = ref<RequestRule>({
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

// URL模式验证状态
const urlPatternStatus = computed(() => {
  if (!newRule.value.urlPattern) return "";
  try {
    new RegExp(newRule.value.urlPattern);
    return "success";
  } catch {
    return "error";
  }
});

// 过滤器：截断长文本
const truncate = (value: any) => {
  if (typeof value === "string") {
    const length = value.length;
    return length > 50 ? value.substring(0, 50) + "..." : value;
  }
  const str = JSON.stringify(value);
  const length = str.length;
  return length > 50 ? str.substring(0, 50) + "..." : str;
};

// 监听headers文本变化
watch(headersText, (newText) => {
  const headers: Record<string, string> = {};
  newText.split("\n").forEach((line) => {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  });
  newRule.value.response.headers = headers;
});

// 监听响应体类型变化
watch(responseType, (newType) => {
  if (newType === "json") {
    try {
      newRule.value.response.body = JSON.parse(responseBodyText.value || "{}");
    } catch {
      newRule.value.response.body = {};
    }
  } else {
    newRule.value.response.body = responseBodyText.value;
  }
});

// 监听响应体文本变化
watch(responseBodyText, (newText) => {
  if (responseType.value === "json") {
    try {
      newRule.value.response.body = JSON.parse(newText || "{}");
    } catch {
      // 保持原值，JSON格式错误时显示错误状态
    }
  } else {
    newRule.value.response.body = newText;
  }
});

// 更新规则
const updateRule = (rule: RequestRule) => {
  emit("update-rules", [...props.rules]);
};

// 删除规则
const deleteRule = (ruleId: string) => {
  emit("delete-rule", ruleId);
};

// 编辑规则
const editRule = (rule: RequestRule) => {
  console.log("editRule", rule);
  editingRule.value = rule;
  newRule.value = JSON.parse(JSON.stringify(rule));
  headersText.value = Object.entries(rule.response.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  // 设置响应体类型和文本
  if (typeof rule.response.body === "string") {
    responseType.value = "text";
    responseBodyText.value = rule.response.body;
  } else {
    responseType.value = "json";
    responseBodyText.value = JSON.stringify(rule.response.body, null, 2);
  }

  showAddRuleDialog.value = true;
};

// 保存规则
const saveRule = () => {
  if (!newRule.value.urlPattern) {
    alert("请输入URL模式");
    return;
  }

  // 验证URL模式
  try {
    new RegExp(newRule.value.urlPattern);
  } catch (error) {
    alert("URL模式格式错误，请输入有效的正则表达式");
    return;
  }

  // 生成唯一ID
  if (!newRule.value.id) {
    newRule.value.id = `rule_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }

  if (editingRule.value) {
    // 更新现有规则
    const index = props.rules.findIndex((r) => r.id === editingRule.value!.id);
    if (index !== -1) {
      const updatedRules = [...props.rules];
      updatedRules[index] = { ...newRule.value };
      emit("update-rules", updatedRules);
    }
  } else {
    // 添加新规则
    emit("add-rule", { ...newRule.value });
  }

  // 重置表单
  resetForm();
  showAddRuleDialog.value = false;
};

// 重置表单
const resetForm = () => {
  newRule.value = {
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
  };
  headersText.value = "";
  responseBodyText.value = "";
  responseType.value = "json";
  editingRule.value = null;
};

// 导出规则
const exportRules = () => {
  const data = {
    rules: props.rules,
    exportTime: new Date().toISOString(),
    version: "1.0",
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `request-rules-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// 导入规则
const importRules = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.rules && Array.isArray(data.rules)) {
            // 验证导入的规则格式
            const validRules = data.rules.filter(
              (rule: any) =>
                rule.id && rule.urlPattern && rule.method && rule.response
            );

            if (validRules.length > 0) {
              const updatedRules = [...props.rules, ...validRules];
              emit("update-rules", updatedRules);
              alert(`成功导入 ${validRules.length} 条规则`);
            } else {
              alert("导入的文件中没有有效的规则");
            }
          } else {
            alert("文件格式不正确");
          }
        } catch (error) {
          alert("文件解析失败");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};
</script>

<style lang="less" scoped>
.request-interceptor {
  height: 100%;

  .rules-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
        font-size: 14px;
        color: #333;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .rules-list {
      .rule-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border: 1px solid #e8e8e8;
        border-radius: 4px;
        margin-bottom: 8px;
        background: #fafafa;

        &.disabled {
          opacity: 0.6;
          background: #f0f0f0;
        }

        .rule-info {
          flex: 1;

          .rule-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;

            .rule-method {
              padding: 2px 6px;
              background: #1890ff;
              color: white;
              border-radius: 2px;
              font-size: 12px;
            }

            .rule-url {
              font-family: monospace;
              font-size: 12px;
              color: #666;
            }

            .rule-delay {
              font-size: 12px;
              color: #999;
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 2px;
            }
          }

          .rule-response {
            font-size: 12px;
            color: #999;
          }
        }

        .rule-actions {
          display: flex;
          gap: 8px;
        }
      }

      .empty-state {
        text-align: center;
        padding: 40px 0;
        color: #999;
        font-size: 14px;
      }
    }
  }
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
