<template>
  <div class="request-interceptor">
    <!-- 规则管理 -->
    <div class="rules-section">
      <div class="section-header">
        <h3>拦截规则</h3>
        <t-button
          theme="primary"
          size="small"
          @click="showAddRuleDialog = true"
        >
          添加规则
        </t-button>
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
    <t-dialog
      v-model="showAddRuleDialog"
      :header="editingRule ? '编辑规则' : '添加规则'"
      width="600px"
    >
      <t-form :model="newRule" label-width="100px">
        <t-form-item label="URL模式">
          <t-input
            v-model="newRule.urlPattern"
            placeholder="例如: .*/api/users.*"
          />
        </t-form-item>
        <t-form-item label="请求方法">
          <t-select v-model="newRule.method">
            <t-option label="GET" value="GET" />
            <t-option label="POST" value="POST" />
            <t-option label="PUT" value="PUT" />
            <t-option label="DELETE" value="DELETE" />
          </t-select>
        </t-form-item>
        <t-form-item label="响应状态码">
          <t-input-number
            v-model="newRule.response.status"
            :min="100"
            :max="599"
          />
        </t-form-item>
        <t-form-item label="响应头">
          <t-input
            v-model="headersText"
            type="textarea"
            :rows="3"
            placeholder="Content-Type: application/json"
          />
        </t-form-item>
        <t-form-item label="响应体">
          <t-input
            v-model="newRule.response.body"
            type="textarea"
            :rows="5"
            placeholder="JSON格式的响应体"
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
import { ref, computed, watch } from "vue";
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

// 新规则模板
const newRule = ref<RequestRule>({
  id: "",
  enabled: true,
  urlPattern: "",
  method: "GET",
  response: {
    status: 200,
    headers: {},
    body: {},
  },
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
  editingRule.value = rule;
  newRule.value = JSON.parse(JSON.stringify(rule));
  headersText.value = Object.entries(rule.response.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  showAddRuleDialog.value = true;
};

// 保存规则
const saveRule = () => {
  if (!newRule.value.urlPattern) {
    alert("请输入URL模式");
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
    response: {
      status: 200,
      headers: {},
      body: {},
    },
  };
  headersText.value = "";
  editingRule.value = null;
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
</style>
