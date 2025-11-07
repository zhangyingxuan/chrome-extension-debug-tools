<template>
  <div class="request-interceptor">
    <!-- 左右分栏布局 -->
    <div class="interceptor-layout">
      <!-- 左侧：规则管理 -->
      <div class="rules-panel">
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
                <t-button
                  size="small"
                  theme="danger"
                  @click="deleteRule(rule.id)"
                  >删除</t-button
                >
              </div>
            </div>

            <div v-if="rules.length === 0" class="empty-state">
              暂无拦截规则
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：拦截历史 -->
      <div class="history-panel">
        <div class="history-section">
          <div class="section-header">
            <h3>拦截历史</h3>
            <div class="header-actions">
              <t-button size="small" @click="clearHistory">清空历史</t-button>
              <t-switch
                v-model="autoScroll"
                size="small"
                :label="['自动滚动', '固定']"
              />
            </div>
          </div>

          <div class="history-list" ref="historyList">
            <div
              v-for="record in interceptionHistory"
              :key="record.id"
              class="history-item"
              :class="getHistoryItemClass(record)"
            >
              <div class="history-header">
                <span class="history-method">{{ record.method }}</span>
                <span class="history-url">{{ record.url }}</span>
                <span class="history-time">{{
                  formatTime(record.timestamp)
                }}</span>
              </div>
              <div class="history-details">
                <div class="history-rule">
                  匹配规则: {{ record.matchedRule || "无匹配" }}
                </div>
                <div class="history-status">
                  状态码: {{ record.responseStatus }}
                  <span v-if="record.delay > 0" class="history-delay">
                    (延迟: {{ record.delay }}ms)
                  </span>
                </div>
                <div v-if="record.error" class="history-error">
                  错误: {{ record.error }}
                </div>
              </div>
            </div>

            <div v-if="interceptionHistory.length === 0" class="empty-state">
              暂无拦截记录
            </div>
          </div>
        </div>
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
import {
  ref,
  reactive,
  computed,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import { DialogProps, ButtonProps } from "tdesign-vue-next";
import { RequestRule, InterceptionRecord } from "../types";

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
const autoScroll = ref(true);
const historyList = ref<HTMLElement>();

// 拦截历史记录
const interceptionHistory = ref<InterceptionRecord[]>([]);

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

// 组件挂载时
onMounted(() => {
  // 加载拦截历史记录
  loadInterceptionHistory();

  // 监听拦截记录消息
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
});

// 组件卸载时
onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
});

// 处理运行时消息
function handleRuntimeMessage(message: any, sender: any, sendResponse: any) {
  if (message.type === "INTERCEPTION_RECORD") {
    // 添加新的拦截记录
    interceptionHistory.value.push(message.data);

    // 限制历史记录数量
    if (interceptionHistory.value.length > 1000) {
      interceptionHistory.value = interceptionHistory.value.slice(-500);
    }

    return true;
  }
}

// 加载拦截历史记录
const loadInterceptionHistory = () => {
  chrome.runtime.sendMessage(
    { type: "GET_INTERCEPTION_HISTORY" },
    (response) => {
      if (response && response.history) {
        interceptionHistory.value = response.history;
      }
    }
  );
};

// 清空拦截历史
const clearHistory = () => {
  if (confirm("确定要清空所有拦截历史记录吗？")) {
    chrome.runtime.sendMessage(
      { type: "CLEAR_INTERCEPTION_HISTORY" },
      (response) => {
        if (response && response.success) {
          interceptionHistory.value = [];
        }
      }
    );
  }
};

// 监听拦截历史变化，实现自动滚动
watch(
  interceptionHistory,
  () => {
    if (autoScroll.value) {
      nextTick(() => {
        const list = historyList.value;
        if (list) {
          list.scrollTop = list.scrollHeight;
        }
      });
    }
  },
  { deep: true }
);

// 格式化时间
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 获取历史记录项样式类
const getHistoryItemClass = (record: InterceptionRecord) => {
  const classes = [];
  if (record.error) {
    classes.push("error");
  } else if (record.responseStatus >= 400) {
    classes.push("warning");
  } else {
    classes.push("success");
  }
  return classes;
};

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

  .interceptor-layout {
    display: flex;
    height: 100%;
    gap: 16px;

    .rules-panel {
      flex: 1;
      min-width: 0;
    }

    .history-panel {
      flex: 1;
      min-width: 0;
    }
  }

  .rules-section,
  .history-section {
    height: 100%;
    display: flex;
    flex-direction: column;

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
        align-items: center;
      }
    }

    .rules-list,
    .history-list {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      background: #fff;
    }
  }

  .rules-list {
    .rule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      &.disabled {
        opacity: 0.6;
        background: #fafafa;
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
            font-weight: 500;
          }

          .rule-url {
            font-family: monospace;
            font-size: 12px;
            color: #666;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

  .history-list {
    .history-item {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.2s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: #f8f9fa;
      }

      &.success {
        border-left: 3px solid #52c41a;
      }

      &.warning {
        border-left: 3px solid #faad14;
      }

      &.error {
        border-left: 3px solid #f5222d;
      }

      .history-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;

        .history-method {
          padding: 2px 6px;
          background: #1890ff;
          color: white;
          border-radius: 2px;
          font-size: 11px;
          font-weight: 500;
        }

        .history-url {
          font-family: monospace;
          font-size: 12px;
          color: #333;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-time {
          font-size: 11px;
          color: #999;
        }
      }

      .history-details {
        font-size: 12px;
        color: #666;

        .history-rule {
          margin-bottom: 2px;
        }

        .history-status {
          margin-bottom: 2px;

          .history-delay {
            color: #999;
          }
        }

        .history-error {
          color: #f5222d;
          font-weight: 500;
        }
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

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
