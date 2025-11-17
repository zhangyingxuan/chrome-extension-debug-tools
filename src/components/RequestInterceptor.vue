<template>
  <div class="request-interceptor">
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 规则管理区域 -->
      <div class="rules-section">
        <div class="section-header">
          <h3 class="header-actions">
            网络请求拦截规则
            <!-- 启用/禁用开关 -->
            <t-switch
              v-model="isEnabled"
              :label="['启用', '禁用']"
              size="small"
              @change="toggleEnabled"
            />
            <!-- URL过滤输入框 -->
            <div class="filter-section">
              <t-input
                v-model="filterKeyword"
                placeholder="输入URL关键词过滤规则"
                size="small"
                style="width: 200px"
                clearable
              >
                <template #suffix>
                  <t-icon name="search" />
                </template>
              </t-input>
            </div>
          </h3>
          <div class="header-actions">
            <t-button size="small" theme="primary" @click="ruleManager.add()">
              添加规则
            </t-button>
            <t-button
              v-if="isSupportHistory"
              size="small"
              theme="default"
              @click="showHistoryDrawer = true"
              class="history-toggle-btn"
            >
              查看拦截历史
            </t-button>
            <t-popconfirm
              content="确定要清理所有规则吗？此操作不可恢复。"
              @confirm="ruleManager.clearAll()"
            >
              <t-button size="small" theme="danger"> 清理所有规则 </t-button>
            </t-popconfirm>
          </div>
        </div>

        <!-- 规则列表 -->
        <div class="rules-list">
          <!-- 空状态提示 -->
          <div v-if="filteredRules?.length === 0" class="empty-state">
            <div class="empty-content">
              <t-icon name="file-search" size="48" />
              <p class="empty-text">
                {{ filterKeyword ? "未找到匹配的规则" : "暂无拦截规则" }}
              </p>
              <p class="empty-desc">
                {{
                  filterKeyword
                    ? "请尝试其他关键词"
                    : "请添加第一条拦截规则开始使用"
                }}
              </p>
            </div>
          </div>

          <!-- 表格布局 -->
          <div v-else class="rules-table">
            <!-- 表格标题 -->
            <div class="table-header">
              <div class="col-status">状态</div>
              <div class="col-method">方法</div>
              <div class="col-url">URL模式</div>
              <div class="col-actions">操作</div>
            </div>

            <!-- 规则项 -->
            <div
              v-for="rule in filteredRules"
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
                    @click.stop="ruleManager.update(rule)"
                  />
                </div>
                <div class="col-method">
                  <span class="method-badge">{{ rule.method }}</span>
                </div>
                <div class="col-url" :title="rule.urlPattern">
                  {{ rule.urlPattern }}
                </div>
                <div class="col-actions">
                  <div class="action-buttons" @click.stop>
                    <t-button size="small" @click="ruleManager.edit(rule)"
                      >编辑</t-button
                    >
                    <t-popconfirm
                      content="确定要删除这条拦截规则吗？"
                      @confirm="ruleManager.delete(rule)"
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
                      <span class="detail-value">
                        [{{ rule.ruleId }}]{{ rule.id }}
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">URL模式:</span>
                      <span class="detail-value">{{ rule.urlPattern }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">请求方法:</span>
                      <span class="detail-value">{{ rule.method }}</span>
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
    <InterceptionHistory
      :visible="showHistoryDrawer"
      @close="showHistoryDrawer = false"
    />

    <!-- 规则编辑器抽屉 -->
    <RuleEditor
      :visible="showAddRuleDialog"
      :editing-rule="editingRule"
      @save="ruleManager.save"
      @close="showAddRuleDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin } from "tdesign-vue-next";
import { reactive, toRefs, ref, onMounted, toRaw, computed } from "vue";
import { RequestRule } from "@/types";
import RuleEditor from "./RuleEditor.vue";
import InterceptionHistory from "./InterceptionHistory.vue";
import { generateId } from "@/utils/common";

const ourRuleIdPrefix = 1000;

// 响应式数据
const reactiveData = reactive({
  isEnabled: true,
  showAddRuleDialog: false,
  editingRule: null as RequestRule | null,
  showHistoryDrawer: false,
  filterKeyword: "",
});

// 解构响应式数据以便使用
const {
  isEnabled,
  showAddRuleDialog,
  editingRule,
  showHistoryDrawer,
  filterKeyword,
} = toRefs(reactiveData);

// 当前管理的规则
const requestRules = ref<RequestRule[]>([]);
const isSupportHistory = ref(
  !!chrome.declarativeNetRequest?.onRuleMatchedDebug
);

// 过滤后的规则列表
const filteredRules = computed(() => {
  if (!filterKeyword.value.trim()) {
    return requestRules.value;
  }
  const keyword = filterKeyword.value.toLowerCase();
  return requestRules.value.filter((rule: any) =>
    rule.urlPattern.toLowerCase().includes(keyword)
  );
});

// 组件挂载时加载规则
onMounted(() => {
  loadRules();
});

// 缓存管理函数
const cacheManager = {
  // 保存规则到缓存
  save: async () => {
    try {
      await chrome.storage.local.set({
        requestRules: toRaw(requestRules.value),
        requestRulesEnabled: isEnabled.value,
        rulesLastModified: Date.now(),
      });
    } catch (error) {
      console.error("保存规则到缓存失败:", error);
    }
  },

  // 从缓存加载规则
  load: async () => {
    try {
      const result = await chrome.storage.local.get([
        "requestRules",
        "rulesLastModified",
        "requestRulesEnabled",
      ]);
      if (result.requestRules) {
        requestRules.value = result.requestRules;
        return true;
      }
    } catch (error) {
      console.error("从缓存加载规则失败:", error);
    }
    return false;
  },

  // 清除缓存
  clear: async () => {
    try {
      await chrome.storage.local.remove([
        "requestRules",
        "rulesLastModified",
        "requestRulesEnabled",
      ]);
    } catch (error) {
      console.error("清除缓存失败:", error);
    }
  },
};

// 加载规则
const loadRules = async () => {
  const cached = await cacheManager.load();
  if (!cached) {
    try {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();

      const ourRules = rules.map((rule) => {
        const urlFilter = rule.condition.urlFilter;
        const regexFilter = rule.condition.regexFilter;
        const method =
          rule.condition.requestMethods?.[0]?.toUpperCase() || "GET";

        let responseBody = {};
        if (rule.action.type === "redirect" && rule.action.redirect?.url) {
          const url = rule.action.redirect.url;
          if (url.startsWith("data:application/json")) {
            try {
              const jsonStr = decodeURIComponent(url.split(",")[1]);
              responseBody = JSON.parse(jsonStr);
            } catch {
              responseBody = { message: "默认响应体" };
            }
          } else if (url.startsWith("data:text/plain")) {
            try {
              responseBody = decodeURIComponent(url.split(",")[1]);
            } catch {
              responseBody = "默认文本响应体";
            }
          }
        }

        return {
          id: generateId("rule"),
          ruleId: rule.id,
          enabled: true,
          urlFilter,
          regexFilter,
          urlPattern: urlFilter || regexFilter,
          method,
          response: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: responseBody,
          },
        } as RequestRule;
      });

      requestRules.value = ourRules;
      await cacheManager.save();
    } catch (error) {
      console.error("获取规则失败:", error);
      requestRules.value = [];
    }
  }
};

// DNR规则转换器
const dnrConverter = {
  // 将规则转换为declarativeNetRequest格式
  convert: (rule: RequestRule, ruleId: number) => {
    const condition = {
      urlFilter: rule.urlPattern,
      regexFilter: rule.urlPattern,
      resourceTypes: ["xmlhttprequest"],
      requestMethods: [rule.method.toLowerCase()],
    };
    if (rule.filterType === "urlFilter") {
      delete condition.regexFilter;
    } else {
      delete condition.urlFilter;
    }

    return {
      id: ruleId,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          url: `data:application/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(rule.response.body)
          )}`,
        },
      },
      condition,
    };
  },

  // 更新declarativeNetRequest规则
  update: async () => {
    try {
      const enabledRules = requestRules.value.filter((rule) => rule.enabled);
      const dnrRules: any = enabledRules.map((rule) =>
        dnrConverter.convert(rule, rule.ruleId)
      );

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: requestRules.value.map((rule) => rule.ruleId) || [],
        addRules: dnrRules,
      });

      await cacheManager.save();
    } catch (error) {
      console.error("更新declarativeNetRequest规则时发生错误:", error);
    }
  },
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

// 规则管理器
const ruleManager = {
  // 添加规则
  add: () => {
    editingRule.value = null;
    showAddRuleDialog.value = true;
  },

  // 编辑规则
  edit: (rule: RequestRule) => {
    editingRule.value = rule;
    showAddRuleDialog.value = true;
  },

  // 删除规则
  delete: async (rule: RequestRule) => {
    try {
      requestRules.value = requestRules.value.filter((r) => r.id !== rule.id);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [rule.ruleId],
      });
      await cacheManager.save();
    } catch (error) {
      console.error("删除规则时发生错误:", error);
    }
  },

  // 更新规则状态
  update: async (rule: RequestRule) => {
    const index = requestRules.value.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      requestRules.value[index] = { ...rule };
      await dnrConverter.update();
    }
  },

  // 保存规则
  save: async (rule: RequestRule) => {
    if (editingRule.value?.id) {
      const index = requestRules.value.findIndex(
        (r) => r.id === editingRule.value!.id
      );
      if (index !== -1) {
        requestRules.value[index] = { ...rule };
      }
    } else {
      requestRules.value.push({
        ...rule,
        id: generateId("rule"),
      });
    }

    await dnrConverter.update();
    showAddRuleDialog.value = false;
    editingRule.value = null;
  },

  // 清理所有规则
  clearAll: async () => {
    try {
      const ruleIds = requestRules.value.map((rule) => rule.ruleId);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
      });
      requestRules.value = [];
      await cacheManager.clear();
      MessagePlugin.success("所有规则已清理完成");
    } catch (error) {
      console.error("清理所有规则时发生错误:", error);
      MessagePlugin.error("清理规则失败，请重试");
    }
  },
};

// 接收快速添加规则数据
const handleQuickAddRule = (ruleData: any) => {
  const maxRuleId =
    requestRules.value.length > 0
      ? Math.max(...requestRules.value.map((r) => r.ruleId)) + 1
      : ourRuleIdPrefix;

  const newRule: RequestRule = {
    ruleId: maxRuleId,
    enabled: true,
    method: ruleData.method || "GET",
    urlPattern: ruleData.urlPattern,
    filterType: ruleData.filterType || "urlFilter",
    response: {
      status: ruleData.response?.status || 200,
      headers: ruleData.response?.headers || {},
      body: ruleData.responseBody || {},
    },
    expanded: false,
  };

  ruleManager.edit(newRule);
};

// 切换启用状态
const toggleEnabled = async (enabled: boolean) => {
  isEnabled.value = enabled;
  requestRules.value.forEach((rule) => {
    rule.enabled = enabled;
  });

  chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#52c41a" : "#f5222d",
  });

  await dnrConverter.update();
};

// 切换规则详情显示
const toggleRuleDetails = (rule: RequestRule) => {
  rule.expanded = !rule.expanded;
};

// 暴露方法给父组件
defineExpose({
  handleQuickAddRule,
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
      padding: 8px;
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

        .filter-section {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 8px;

          @media (max-width: 768px) {
            margin-right: 0;
            width: 100%;
            justify-content: space-between;
          }
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
</style>
