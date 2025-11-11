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
            <t-button size="small" @click="importRules">导入规则</t-button>
            <t-button size="small" @click="exportData">导出数据</t-button>
            <t-popconfirm
              :content="`确定要清理所有 ${props.rules.length} 条规则吗？此操作不可撤销。`"
              @confirm="clearAllRules"
            >
              <t-button size="small" theme="warning"> 清理所有规则 </t-button>
            </t-popconfirm>
            <t-button size="small" @click="addGroup" theme="default">
              添加分组
            </t-button>
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

        <!-- 分组列表 -->
        <div class="groups-list">
          <!-- 空状态提示 -->
          <div
            v-if="
              computedData?.isEmptyState || computedData?.hasRulesWithoutGroups
            "
            class="empty-state"
          >
            <div class="empty-content">
              <t-icon
                :name="
                  computedData?.isEmptyState ? 'file-search' : 'folder-open'
                "
                size="48"
              />
              <p class="empty-text">
                {{
                  computedData?.isEmptyState
                    ? "暂无拦截规则"
                    : `发现 ${props.rules.length} 条未分组规则`
                }}
              </p>
              <p class="empty-desc">
                {{
                  computedData?.isEmptyState
                    ? '点击"添加分组"按钮创建第一个分组和规则'
                    : "建议为规则创建分组以便更好管理"
                }}
              </p>
              <t-button size="small" @click="addGroup" theme="primary">
                {{ computedData?.isEmptyState ? "添加分组" : "创建分组" }}
              </t-button>
            </div>
          </div>

          <!-- 自定义分组 -->
          <GroupItem
            v-for="group in computedData?.sortedGroups"
            :key="group.id"
            :group="group"
            :rules="getGroupRules(group.id)"
            @update="updateGroup"
            @toggle-expand="toggleGroupExpand"
            @edit="editGroup"
            @delete="deleteGroup"
            @rule-update="updateRule"
            @rule-edit="editRule"
            @rule-delete="deleteRule"
          />
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
          <div
            v-for="record in computedData?.reversedInterceptionHistory"
            :key="record.id"
            class="history-item"
            :class="getHistoryItemClass(record)"
          >
            <div class="history-header">
              <span class="history-method">{{ record.method }}</span>
              <span
                class="history-status-code"
                :class="getStatusClass(record.responseStatus)"
              >
                {{ record.responseStatus }}
              </span>
              <span class="history-time">{{
                formatTime(record.timestamp)
              }}</span>
            </div>
            <div class="history-url">{{ record.url }}</div>
            <div class="history-details">
              <div class="history-rule">
                <span class="history-label">规则ID:</span>
                <span class="history-value">{{ record.ruleId || "未知" }}</span>
              </div>
              <div class="history-rule">
                <span class="history-label">匹配规则:</span>
                <span class="history-value">{{
                  record.matchedRule || "无匹配"
                }}</span>
              </div>
              <div class="history-delay-info">
                <span class="history-label">延迟:</span>
                <span class="history-value">{{ record.delay }}ms</span>
              </div>
              <div v-if="record.error" class="history-error">
                <span class="history-label">错误:</span>
                <span class="history-value">{{ record.error }}</span>
              </div>
            </div>
          </div>

          <div v-if="interceptionHistory.length === 0" class="empty-state">
            暂无拦截记录
          </div>
        </div>
      </div>
    </t-drawer>

    <!-- 规则编辑器 -->
    <RuleEditor
      :visible="showAddRuleDialog"
      :editing-rule="editingRule"
      :group-id="currentGroupId"
      @save="saveRule"
      @close="showAddRuleDialog = false"
    />

    <!-- 分组管理器 -->
    <GroupManager
      :visible="showAddGroupDialog"
      :editing-group="editingGroup"
      @save="saveGroup"
      @close="showAddGroupDialog = false"
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
} from "vue";
import { RequestRule, InterceptionRecord, RuleGroup } from "../types";
import {
  formatTime,
  generateId,
  validateUrlPattern,
  storage,
  errorHandler,
} from "../utils/common";
import GroupItem from "./GroupItem.vue";
import RuleEditor from "./RuleEditor.vue";
import GroupManager from "./GroupManager.vue";

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
  groups: [] as RuleGroup[],
  showAddGroupDialog: false,
  editingGroup: null as RuleGroup | null,
  currentGroupId: null as string | null,
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
  groups,
  showAddGroupDialog,
  editingGroup,
  currentGroupId,
  interceptionHistory,
} = toRefs(reactiveData);

// 计算属性
const computedData = computed(() => {
  const reversedHistory = [...interceptionHistory.value].reverse();
  const sortedGroupsList = [...groups.value].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
  const hasRules = props.rules.length > 0;
  const hasGroups = groups.value.length > 0;

  return {
    reversedInterceptionHistory: reversedHistory,
    sortedGroups: sortedGroupsList,
    hasRules,
    hasGroups,
    isEmptyState: !hasGroups && !hasRules,
    hasRulesWithoutGroups: hasRules && !hasGroups,
  };
});

// 获取分组内的规则（带缓存优化）
const getGroupRules = (() => {
  const cache = new Map();
  let lastRulesHash = "";

  return (groupId: string) => {
    // 检查规则是否发生变化
    const currentHash = JSON.stringify(props.rules);
    if (currentHash !== lastRulesHash) {
      cache.clear();
      lastRulesHash = currentHash;
    }

    // 从缓存获取或计算
    if (!cache.has(groupId)) {
      cache.set(
        groupId,
        props.rules.filter((rule) => rule.groupId === groupId)
      );
    }

    return cache.get(groupId);
  };
})();

// 切换分组展开状态
const toggleGroupExpand = (group: RuleGroup) => {
  group.expanded = !group.expanded;
  updateGroup(group);
};

// 分组管理函数
const groupManager = {
  // 打开分组编辑器
  openEditor: (group: RuleGroup | null = null) => {
    editingGroup.value = group;
    showAddGroupDialog.value = true;
  },

  // 更新分组
  update: (group: RuleGroup) => {
    groups.value = groups.value.map((g) =>
      g.id === group.id ? { ...group } : g
    );
    saveGroups();
  },

  // 删除分组
  delete: (groupId: string) => {
    // 删除分组内的所有规则
    const updatedRules = props.rules.filter((rule) => rule.groupId !== groupId);
    emit("update-rules", updatedRules);

    // 删除分组
    groups.value = groups.value?.filter((group) => group.id !== groupId);
    saveGroups();
  },

  // 保存分组
  save: (group: RuleGroup) => {
    console.log("开始保存分组:", group);

    if (editingGroup.value) {
      // 更新现有分组
      console.log("更新现有分组:", editingGroup.value.id);
      groups.value = groups.value.map((g) =>
        g.id === editingGroup.value!.id ? { ...group } : g
      );
    } else {
      // 添加新分组
      const newGroup: RuleGroup = {
        ...group,
        order: groups.value.length,
      };
      console.log("添加新分组:", newGroup);
      groups.value.push(newGroup);
    }

    console.log("保存后的分组列表:", groups.value);
    saveGroups();
    showAddGroupDialog.value = false;
    editingGroup.value = null;
    console.log("分组保存完成");
  },
};

// 导出分组管理函数
const {
  openEditor: addGroup,
  update: updateGroup,
  delete: deleteGroup,
  save: saveGroup,
} = groupManager;
const editGroup = (group: RuleGroup) => groupManager.openEditor(group);

// 保存分组到存储
const saveGroups = () => {
  console.log("保存分组到存储:", groups.value);

  // 通过background.js保存分组数据
  chrome.runtime.sendMessage(
    {
      type: "UPDATE_GROUPS",
      data: {
        groups: groups.value,
      },
    },
    (response) => {
      if (response && response.success) {
        console.log("分组数据保存成功");
      } else {
        console.error("保存分组数据失败");
      }
    }
  );
};

// 加载分组
const loadGroups = async () => {
  try {
    console.log("开始加载分组数据...");

    // 通过background.js获取分组数据
    chrome.runtime.sendMessage({ type: "GET_GROUPS" }, (response) => {
      if (response && response.groups) {
        console.log("从background.js获取的分组数据:", response.groups);
        groups.value = response.groups;
        console.log(`分组数据加载完成 - 数量: ${groups.value.length}`);
        nextTick(() => console.log("分组数据渲染完成"));
      } else {
        console.log("未找到分组数据，使用空数组");
        groups.value = [];
      }
    });
  } catch (error) {
    errorHandler.log(error, "加载分组");
    console.error("加载分组数据失败:", error);
    groups.value = [];
  }
};

// 规则管理函数
const ruleManager = {
  // 打开规则编辑器
  openEditor: (rule: RequestRule | null = null, groupId?: string) => {
    editingRule.value = rule;
    currentGroupId.value = groupId || null;
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
    currentGroupId.value = null;
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

// 导出数据
const exportData = () => {
  const data = {
    requestRules: props.rules,
    ruleGroups: groups.value,
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
    interceptionHistory.value.push(message.data);

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
  loadGroups();
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  // 统一日志输出和状态检查
  console.log(
    `组件挂载完成 - 规则: ${props.rules.length}, 开始加载分组数据...`
  );

  // 延迟检查渲染状态
  setTimeout(() => {
    console.log(
      `渲染状态检查 - 规则: ${props.rules.length}, 分组: ${groups.value.length}`
    );
  }, 100);
});

// 监听规则和分组变化，统一处理重新渲染
watch(
  [() => props.rules, groups],
  ([newRules, newGroups]) => {
    console.log(
      `数据更新 - 规则: ${newRules.length}, 分组: ${newGroups.length}`
    );
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

    .groups-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;

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
    }

    .history-item {
      padding: 12px;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      margin-bottom: 8px;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #d9d9d9;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &:last-child {
        margin-bottom: 0;
      }

      &.success {
        border-left: 4px solid #52c41a;
      }

      &.warning {
        border-left: 4px solid #faad14;
      }

      &.error {
        border-left: 4px solid #f5222d;
      }

      .history-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;

        .history-method {
          padding: 2px 8px;
          background: #1890ff;
          color: white;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 500;
        }

        .history-status-code {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 500;

          &.status-success {
            background: #f6ffed;
            color: #52c41a;
            border: 1px solid #b7eb8f;
          }

          &.status-redirect {
            background: #fff7e6;
            color: #fa8c16;
            border: 1px solid #ffd591;
          }

          &.status-client-error {
            background: #fff2f0;
            color: #ff4d4f;
            border: 1px solid #ffccc7;
          }

          &.status-server-error {
            background: #fff2f0;
            color: #ff4d4f;
            border: 1px solid #ffccc7;
          }

          &.status-unknown {
            background: #fafafa;
            color: #666;
            border: 1px solid #d9d9d9;
          }
        }

        .history-time {
          font-size: 12px;
          color: #999;
          margin-left: auto;
        }
      }

      .history-url {
        font-family: monospace;
        font-size: 13px;
        color: #333;
        margin: 8px 0;
        word-break: break-all;
        line-height: 1.4;
      }

      .history-details {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 12px;
        font-size: 12px;
        color: #666;

        .history-label {
          font-weight: 500;
          color: #333;
          text-align: right;
        }

        .history-value {
          word-break: break-word;
        }

        .history-error {
          grid-column: 1 / -1;
          margin-top: 6px;

          .history-value {
            color: #f5222d;
            font-weight: 500;
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
</style>
