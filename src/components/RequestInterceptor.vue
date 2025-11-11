<template>
  <div class="request-interceptor">
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 规则管理区域 -->
      <div class="rules-section">
        <div class="section-header">
          <h3>
            拦截规则
            <!-- 启用/禁用开关 -->
            <t-switch
              v-model="isEnabled"
              :label="['启用', '禁用']"
              size="small"
              @change="toggleEnabled"
            />
          </h3>
          <div class="header-actions">
            <t-button size="small" theme="primary" @click="addRule()">
              添加规则
            </t-button>
            <t-button size="small" @click="importRules">导入规则</t-button>
            <t-button size="small" @click="exportData">导出数据</t-button>
            <t-popconfirm
              :content="`确定要清理所有 ${props.rules.length} 条规则吗？此操作不可撤销。`"
              @confirm="clearAllRules"
            >
              <t-button size="small" theme="warning"> 清理所有规则 </t-button>
            </t-popconfirm>
            <t-button
              size="small"
              theme="default"
              @click="showHistoryDrawer = true"
              class="history-toggle-btn"
            >
              查看拦截历史
            </t-button>
          </div>
        </div>

        <!-- 规则列表 -->
        <div class="rules-list">
          <!-- 空状态提示 -->
          <div v-if="props.rules.length === 0" class="empty-state">
            <div class="empty-content">
              <t-icon name="file-search" size="48" />
              <p class="empty-text">暂无拦截规则</p>
              <p class="empty-desc">请添加第一条拦截规则开始使用</p>
            </div>
          </div>

          <!-- 表格布局 -->
          <div v-else class="rules-table">
            <!-- 表格标题 -->
            <div class="table-header">
              <div class="col-status">状态</div>
              <div class="col-method">方法</div>
              <div class="col-url">URL模式</div>
              <div class="col-response">响应状态</div>
              <div class="col-delay">延迟</div>
              <div class="col-actions">操作</div>
            </div>

            <!-- 规则项 -->
            <div
              v-for="rule in props.rules"
              :key="rule.id"
              class="rule-row"
              :class="{
                disabled: !rule.enabled,
                expanded: rule.expanded,
              }"
            >
              <div class="table-row" @click="toggleRuleDetails(rule)">
                <div class="col-status">
                  <t-switch
                    v-model="rule.enabled"
                    size="small"
                    @click.stop="updateRule(rule)"
                  />
                </div>
                <div class="col-method">
                  <span class="method-badge">{{ rule.method }}</span>
                </div>
                <div class="col-url" :title="rule.urlPattern">
                  {{ truncateUrl(rule.urlPattern) }}
                </div>
                <div class="col-response">
                  <span
                    class="status-badge"
                    :class="getResponseStatusClass(rule.response.status)"
                  >
                    {{ rule.response.status }}
                  </span>
                </div>
                <div class="col-delay">
                  <span v-if="rule.delay > 0" class="delay-badge">
                    {{ rule.delay }}ms
                  </span>
                  <span v-else class="no-delay">-</span>
                </div>
                <div class="col-actions">
                  <div class="action-buttons" @click.stop>
                    <t-button size="small" @click="editRule(rule)"
                      >编辑</t-button
                    >
                    <t-popconfirm
                      content="确定要删除这条拦截规则吗？"
                      @confirm="deleteRule(rule.id)"
                    >
                      <t-button size="small" theme="danger">删除</t-button>
                    </t-popconfirm>
                  </div>
                </div>
                <t-icon
                  :name="rule.expanded ? 'chevron-down' : 'chevron-right'"
                  size="16"
                  class="expand-icon"
                />
              </div>

              <!-- 规则详情 -->
              <div v-if="rule.expanded" class="rule-details">
                <div class="detail-section">
                  <div class="detail-title">规则详情</div>
                  <div class="detail-content">
                    <div class="detail-row">
                      <span class="detail-label">规则ID:</span>
                      <span class="detail-value">{{ rule.id }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">URL模式:</span>
                      <span class="detail-value">{{ rule.urlPattern }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">请求方法:</span>
                      <span class="detail-value">{{ rule.method }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">响应状态:</span>
                      <span class="detail-value">{{
                        rule.response.status
                      }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">延迟时间:</span>
                      <span class="detail-value">{{ rule.delay || 0 }}ms</span>
                    </div>
                  </div>
                </div>

                <div class="detail-section">
                  <div class="detail-title">响应内容</div>
                  <div class="detail-content">
                    <pre class="response-body">{{
                      formatResponseBody(rule.response.body)
                    }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 拦截历史抽屉 -->
    <t-drawer
      :visible="showHistoryDrawer"
      header="拦截历史"
      :footer="null"
      @close="showHistoryDrawer = false"
      size="70%"
      placement="right"
      class="history-drawer"
    >
      <div class="drawer-content">
        <div class="drawer-header-actions">
          <t-button size="small" @click="clearHistory">清空历史</t-button>
          <t-switch
            v-model="autoScroll"
            size="small"
            :label="['自动滚动', '固定']"
          />
        </div>

        <div class="history-list" ref="historyList">
          <!-- 表格标题 -->
          <div class="table-header">
            <div class="col-status">状态</div>
            <div class="col-method">方法</div>
            <div class="col-url">URL</div>
            <div class="col-status-code">状态码</div>
            <div class="col-time">时间</div>
            <div class="col-delay">延迟</div>
          </div>

          <!-- 拦截记录项 -->
          <div
            v-for="record in computedData?.reversedInterceptionHistory"
            :key="record.id"
            class="history-item"
            :class="getHistoryItemClass(record)"
            @click="toggleHistoryDetails(record)"
          >
            <div class="table-row">
              <div class="col-status">
                <span
                  class="status-badge"
                  :class="getStatusClass(record.responseStatus)"
                >
                  {{ record.responseStatus }}
                </span>
              </div>
              <div class="col-method">
                <span class="method-badge">{{ record.method }}</span>
              </div>
              <div class="col-url" :title="record.url">
                {{ truncateUrl(record.url) }}
              </div>
              <div class="col-status-code">
                <span class="status-code-badge">{{
                  record.responseStatus
                }}</span>
              </div>
              <div class="col-time">{{ formatTime(record.timestamp) }}</div>
              <div class="col-delay">{{ record.delay }}ms</div>
              <t-icon
                :name="record.expanded ? 'chevron-down' : 'chevron-right'"
                size="16"
                class="expand-icon"
              />
            </div>

            <!-- 详情面板 -->
            <div v-if="record.expanded" class="history-details">
              <div class="detail-section">
                <div class="detail-title">拦截详情</div>
                <div class="detail-content">
                  <div class="detail-row">
                    <span class="detail-label">规则ID:</span>
                    <span class="detail-value">{{
                      record.ruleId || "未知"
                    }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">匹配规则:</span>
                    <span class="detail-value">{{
                      record.matchedRule || "无匹配"
                    }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">完整URL:</span>
                    <span class="detail-value">{{ record.url }}</span>
                  </div>
                  <div v-if="record.error" class="detail-row">
                    <span class="detail-label">错误信息:</span>
                    <span class="detail-value error-text">{{
                      record.error
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="interceptionHistory.length === 0" class="empty-state">
            暂无拦截记录
          </div>
        </div>
      </div>
    </t-drawer>

    <!-- 规则编辑器抽屉 -->
    <RuleEditor
      :visible="showAddRuleDialog"
      :editing-rule="editingRule"
      @save="saveRule"
      @close="showAddRuleDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  watch,
  nextTick,
  reactive,
  onMounted,
  onUnmounted,
  toRefs,
  ref,
} from "vue";
import { RequestRule, InterceptionRecord } from "../types";
import {
  formatTime,
  generateId,
  validateUrlPattern,
  errorHandler,
} from "../utils/common";
import RuleEditor from "./RuleEditor.vue";

interface Props {
  rules: RequestRule[];
}

interface Emits {
  (e: "update-rules", rules: RequestRule[]): void;
  (e: "add-rule", rule: RequestRule): void;
  (e: "delete-rule", ruleId: string): void;
  (e: "toggle-enabled", enabled: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式数据
const reactiveData = reactive({
  isEnabled: true,
  showAddRuleDialog: false,
  editingRule: null as RequestRule | null,
  autoScroll: true,
  historyList: null as HTMLElement | null,
  showHistoryDrawer: false,
  interceptionHistory: [] as InterceptionRecord[],
});

// 解构响应式数据以便使用
const {
  isEnabled,
  showAddRuleDialog,
  editingRule,
  autoScroll,
  historyList,
  showHistoryDrawer,
  interceptionHistory,
} = toRefs(reactiveData);

// 计算属性
const computedData = computed(() => {
  const reversedHistory = [...interceptionHistory.value].reverse();
  const hasRules = props.rules.length > 0;

  return {
    reversedInterceptionHistory: reversedHistory,
    hasRules,
    isEmptyState: !hasRules,
  };
});

// 截断长文本
const truncateBody = (body: any) => {
  if (typeof body === "string") {
    const length = body.length;
    return length > 50 ? body.substring(0, 50) + "..." : body;
  }
  const str = JSON.stringify(body);
  const length = str.length;
  return length > 50 ? str.substring(0, 50) + "..." : str;
};

// 截断URL显示
const truncateUrl = (url: string) => {
  if (url.length > 80) {
    return url.substring(0, 40) + "..." + url.substring(url.length - 40);
  }
  return url;
};

// 格式化响应体
const formatResponseBody = (body: any) => {
  if (typeof body === "string") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, 2);
};

// 获取响应状态样式类
const getResponseStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) {
    return "status-success";
  } else if (status >= 300 && status < 400) {
    return "status-redirect";
  } else if (status >= 400 && status < 500) {
    return "status-client-error";
  } else if (status >= 500) {
    return "status-server-error";
  }
  return "status-unknown";
};

// 规则管理函数
const ruleManager = {
  // 打开规则编辑器
  openEditor: (rule: RequestRule | null = null) => {
    editingRule.value = rule;
    showAddRuleDialog.value = true;
  },

  // 更新规则
  update: (rule: RequestRule) => {
    emit("update-rules", [...props.rules]);
    nextTick(() => console.log("规则更新完成，触发重新渲染"));
  },

  // 删除规则
  delete: (ruleId: string) => {
    emit("delete-rule", ruleId);
  },

  // 保存规则
  save: (rule: RequestRule) => {
    if (!validateUrlPattern(rule.urlPattern)) {
      errorHandler.alert("URL模式格式错误，请输入有效的正则表达式");
      return;
    }

    if (editingRule.value) {
      // 更新现有规则
      const index = props.rules.findIndex(
        (r) => r.id === editingRule.value!.id
      );
      if (index !== -1) {
        const updatedRules = [...props.rules];
        updatedRules[index] = { ...rule };
        emit("update-rules", updatedRules);
      }
    } else {
      // 添加新规则
      const newRule: RequestRule = {
        ...rule,
        id: rule.id || generateId("rule"),
      };
      emit("add-rule", newRule);
    }

    showAddRuleDialog.value = false;
    editingRule.value = null;
  },
};

// 导出规则管理函数
const {
  openEditor: addRule,
  update: updateRule,
  delete: deleteRule,
  save: saveRule,
} = ruleManager;
const editRule = (rule: RequestRule) => ruleManager.openEditor(rule);

// 切换启用状态
const toggleEnabled = (enabled: boolean) => {
  isEnabled.value = enabled;
  emit("toggle-enabled", enabled);
};

// 加载拦截历史记录
const loadInterceptionHistory = () => {
  chrome.runtime.sendMessage(
    { type: "GET_INTERCEPTION_HISTORY" },
    (response) => {
      if (response && response.history) {
        interceptionHistory.value = response.history.map((record: any) => ({
          ...record,
          expanded: false, // 为每个历史记录添加expanded属性
        }));
      }
    }
  );
};

// 切换规则详情显示
const toggleRuleDetails = (rule: RequestRule) => {
  rule.expanded = !rule.expanded;
};

// 切换拦截历史详情显示
const toggleHistoryDetails = (record: InterceptionRecord) => {
  record.expanded = !record.expanded;
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
            const validRules = data.rules.filter(
              (rule: any) =>
                rule.id && rule.urlPattern && rule.method && rule.response
            );

            if (validRules.length > 0) {
              const updatedRules = [...props.rules, ...validRules];
              emit("update-rules", updatedRules);
              alert(`成功导入 ${validRules.length} 条规则`);
            } else {
              errorHandler.alert("导入的文件中没有有效的规则");
            }
          } else {
            errorHandler.alert("文件格式不正确");
          }
        } catch (error) {
          errorHandler.alert("文件解析失败");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

// 导出数据
const exportData = () => {
  const data = {
    requestRules: props.rules,
    interceptionHistory: interceptionHistory.value,
    enabled: isEnabled.value,
    exportTime: new Date().toISOString(),
    version: "1.0",
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `debug-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// 清理所有规则
const clearAllRules = () => {
  if (props.rules.length === 0) {
    alert("当前没有规则可清理");
    return;
  }

  // 清空规则数组
  emit("update-rules", []);

  // 通知background.js更新declarativeNetRequest规则
  chrome.runtime.sendMessage({
    type: "UPDATE_RULES",
    data: {
      rules: [],
      enabled: isEnabled.value,
    },
  });

  alert(`已成功清理所有 ${props.rules.length} 条规则`);
  console.log("所有规则已清理");
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

// 获取状态码样式类
const getStatusClass = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) {
    return "status-success";
  } else if (statusCode >= 300 && statusCode < 400) {
    return "status-redirect";
  } else if (statusCode >= 400 && statusCode < 500) {
    return "status-client-error";
  } else if (statusCode >= 500) {
    return "status-server-error";
  }
  return "status-unknown";
};

// 监听拦截历史变化，实现自动滚动到最新记录
watch(
  [interceptionHistory, autoScroll],
  ([history, shouldScroll]) => {
    if (shouldScroll) {
      nextTick(() =>
        historyList.value?.scrollTo({ top: 0, behavior: "smooth" })
      );
    }
  },
  { deep: true }
);

// 处理运行时消息
function handleRuntimeMessage(message: any, sender: any, sendResponse: any) {
  if (message.type === "INTERCEPTION_RECORD") {
    const record = {
      ...message.data,
      expanded: false, // 添加expanded属性
    };
    interceptionHistory.value.push(record);

    // 限制历史记录数量
    if (interceptionHistory.value.length > 1000) {
      interceptionHistory.value = interceptionHistory.value.slice(-500);
    }

    return true;
  }
}

// 组件挂载时
onMounted(() => {
  loadInterceptionHistory();
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  // 统一日志输出和状态检查
  console.log(`组件挂载完成 - 规则: ${props.rules.length}`);

  // 延迟检查渲染状态
  setTimeout(() => {
    console.log(`渲染状态检查 - 规则: ${props.rules.length}`);
  }, 100);
});

// 监听规则变化，统一处理重新渲染
watch(
  () => props.rules,
  (newRules) => {
    console.log(`数据更新 - 规则: ${newRules.length}`);
    nextTick(() => console.log("界面重新渲染完成"));
  },
  { deep: true, immediate: true }
);

// 组件卸载时
onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
});
</script>

<style lang="less" scoped>
.request-interceptor {
  height: 100%;
  position: relative;

  .main-content {
    height: 100%;
    display: flex;
    flex-direction: column;

    @media (max-width: 768px) {
      padding: 8px;
    }
  }

  .rules-section {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    @media (max-width: 768px) {
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;

      @media (max-width: 768px) {
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;

        @media (max-width: 768px) {
          font-size: 14px;
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;

        @media (max-width: 768px) {
          justify-content: space-between;
        }

        .t-switch {
          margin-right: 8px;

          :deep(.t-switch__label) {
            font-size: 12px;
            color: #666;
          }

          :deep(.t-switch__node) {
            background-color: #1890ff;
          }

          &:deep(.t-switch.is-checked .t-switch__node) {
            background-color: #52c41a;
          }
        }

        .history-toggle-btn {
          background: #1890ff;
          color: white;
          border: none;

          &:hover {
            background: #40a9ff;
          }
        }

        .t-button[theme="warning"] {
          background: #faad14;
          color: white;
          border: none;

          &:hover {
            background: #ffc53d;
          }
        }
      }
    }

    .rules-list {
      flex: 1;
      overflow-y: auto;

      .empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;

        .empty-content {
          text-align: center;
          color: #999;

          .t-icon {
            color: #d9d9d9;
            margin-bottom: 16px;
          }

          .empty-text {
            font-size: 16px;
            font-weight: 500;
            margin: 0 0 8px 0;
            color: #666;
          }

          .empty-desc {
            font-size: 14px;
            margin: 0 0 16px 0;
            color: #999;
          }
        }
      }

      .rules-table {
        background: #fff;
        border: 1px solid #e8e8e8;
        border-radius: 6px;
        overflow: hidden;

        .table-header {
          display: flex;
          align-items: center;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e1e1;
          padding: 8px 12px;
          font-weight: 600;
          color: #666;
          font-size: 12px;

          .col-status {
            width: 60px;
            text-align: center;
          }
          .col-method {
            width: 80px;
          }
          .col-url {
            flex: 1;
          }
          .col-response {
            width: 100px;
            text-align: center;
          }
          .col-delay {
            width: 80px;
            text-align: center;
          }
          .col-actions {
            width: 120px;
            text-align: center;
          }
        }

        .rule-row {
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          &.disabled {
            opacity: 0.6;
            background: #fafafa;
          }

          &.expanded {
            background: #f6f8fa;
          }

          .table-row {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.1s;

            &:hover {
              background-color: #f5f5f5;
            }

            .col-status {
              width: 60px;
              text-align: center;
            }

            .col-method {
              width: 80px;

              .method-badge {
                background: #1890ff;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 600;
              }
            }

            .col-url {
              flex: 1;
              font-family: monospace;
              font-size: 12px;
              color: #333;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .col-response {
              width: 100px;
              text-align: center;

              .status-badge {
                font-size: 11px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 2px;

                &.status-success {
                  color: #107c10;
                  background: #dff6dd;
                }

                &.status-redirect {
                  color: #d83b01;
                  background: #ffd8cc;
                }

                &.status-client-error,
                &.status-server-error {
                  color: #d13438;
                  background: #fde7e9;
                }

                &.status-unknown {
                  color: #666;
                  background: #f3f2f1;
                }
              }
            }

            .col-delay {
              width: 80px;
              text-align: center;
              font-size: 12px;

              .delay-badge {
                color: #fa8c16;
                background: #fff7e6;
                padding: 2px 6px;
                border-radius: 3px;
                border: 1px solid #ffd591;
              }

              .no-delay {
                color: #999;
              }
            }

            .col-actions {
              width: 120px;
              text-align: center;

              .action-buttons {
                display: flex;
                gap: 6px;
                justify-content: center;
              }
            }

            .expand-icon {
              margin-left: 8px;
              color: #666;
              opacity: 0.6;
            }
          }

          .rule-details {
            background: #fff;
            border-top: 1px solid #e8e8e8;
            padding: 16px;

            .detail-section {
              margin-bottom: 20px;

              &:last-child {
                margin-bottom: 0;
              }

              .detail-title {
                font-size: 13px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #f0f0f0;
              }

              .detail-content {
                .detail-row {
                  display: flex;
                  margin-bottom: 6px;
                  font-size: 12px;

                  .detail-label {
                    width: 100px;
                    color: #666;
                    font-weight: 500;
                  }

                  .detail-value {
                    flex: 1;
                    color: #333;
                    word-break: break-all;
                  }
                }

                .response-body {
                  background: #f8f9fa;
                  border: 1px solid #e1e1e1;
                  border-radius: 4px;
                  padding: 12px;
                  font-size: 11px;
                  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono",
                    Consolas, "Courier New", monospace;
                  white-space: pre-wrap;
                  word-break: break-all;
                  max-height: 200px;
                  overflow: auto;
                  margin: 0;
                }
              }
            }
          }
        }
      }
    }
  }
}

.history-drawer {
  .drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;

    .drawer-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #e8e8e8;
      margin-bottom: 16px;

      @media (max-width: 768px) {
        padding: 12px 0;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
    }

    .history-list {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
      font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
        "Courier New", monospace;
      font-size: 12px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }

      .table-header {
        display: flex;
        align-items: center;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e1e1;
        padding: 6px 8px;
        font-weight: 600;
        color: #666;
        position: sticky;
        top: 0;
        z-index: 10;

        .col-status {
          width: 60px;
        }
        .col-method {
          width: 60px;
        }
        .col-url {
          flex: 1;
        }
        .col-status-code {
          width: 80px;
          text-align: center;
        }
        .col-time {
          width: 100px;
          text-align: right;
        }
        .col-delay {
          width: 80px;
          text-align: right;
        }
      }

      .history-item {
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background-color 0.1s;

        &:hover {
          background-color: #f8f9fa;
        }

        &:last-child {
          border-bottom: none;
        }

        &.success {
          background-color: #f6ffed;
        }

        &.warning {
          background-color: #fff7e6;
        }

        &.error {
          background-color: #fff2f0;
        }

        &.expanded {
          background-color: #e6f7ff;
        }

        .table-row {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          min-height: 24px;

          .col-status {
            width: 60px;
          }
          .col-method {
            width: 60px;
          }
          .col-url {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .col-status-code {
            width: 80px;
            text-align: center;
            color: #666;
          }
          .col-time {
            width: 100px;
            text-align: right;
            color: #666;
          }
          .col-delay {
            width: 80px;
            text-align: right;
            color: #666;
          }

          .status-badge {
            font-size: 11px;
            font-weight: 600;
            padding: 1px 4px;
            border-radius: 2px;

            &.status-success {
              color: #107c10;
              background: #dff6dd;
            }

            &.status-redirect {
              color: #d83b01;
              background: #ffd8cc;
            }

            &.status-client-error,
            &.status-server-error {
              color: #d13438;
              background: #fde7e9;
            }

            &.status-unknown {
              color: #666;
              background: #f3f2f1;
            }
          }

          .method-badge {
            background: #0078d4;
            color: white;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
          }

          .status-code-badge {
            font-size: 11px;
            font-weight: 500;
            color: #666;
          }

          .expand-icon {
            margin-left: 8px;
            color: #666;
            opacity: 0.6;
          }
        }

        .history-details {
          border-top: 1px solid #e1e1e1;
          background: #f8f9fa;
          padding: 16px;

          .detail-section {
            margin-bottom: 16px;

            &:last-child {
              margin-bottom: 0;
            }

            .detail-title {
              font-size: 13px;
              font-weight: 600;
              color: #323130;
              margin-bottom: 8px;
              padding-bottom: 4px;
              border-bottom: 1px solid #f3f2f1;
            }

            .detail-content {
              .detail-row {
                display: flex;
                margin-bottom: 6px;
                font-size: 12px;

                .detail-label {
                  width: 120px;
                  color: #605e5c;
                  font-weight: 500;
                }

                .detail-value {
                  flex: 1;
                  color: #323130;
                  word-break: break-all;

                  &.error-text {
                    color: #d13438;
                    font-weight: 500;
                  }
                }
              }
            }
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 40px;
        color: #999;
        font-size: 14px;
      }
    }
  }
}
</style>
