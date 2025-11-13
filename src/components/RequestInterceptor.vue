<template>
  <div class="request-interceptor">
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 规则管理区域 -->
      <div class="rules-section">
        <div class="section-header">
          <h3>
            网络请求拦截规则
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
            <t-button
              size="small"
              theme="default"
              @click="showHistoryDrawer = true"
              class="history-toggle-btn"
            >
              查看拦截历史
            </t-button>
            <t-popconfirm
              content="确定要清除自定义规则缓存吗？此操作不可恢复。"
              @confirm="clearCache"
            >
              <t-button size="small" theme="default"> 清除缓存 </t-button>
            </t-popconfirm>
          </div>
        </div>

        <!-- 规则列表 -->
        <div class="rules-list">
          <!-- 空状态提示 -->
          <div v-if="requestRules?.length === 0" class="empty-state">
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
              <div class="col-actions">操作</div>
            </div>

            <!-- 规则项 -->
            <div
              v-for="rule in requestRules"
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
                  {{ rule.urlPattern }}
                </div>
                <div class="col-actions">
                  <div class="action-buttons" @click.stop>
                    <t-button size="small" @click="editRule(rule)"
                      >编辑</t-button
                    >
                    <t-popconfirm
                      content="确定要删除这条拦截规则吗？"
                      @confirm="deleteRule(rule)"
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
      :auto-scroll="autoScroll"
      @close="showHistoryDrawer = false"
      @update:auto-scroll="(value) => (autoScroll = value)"
    />

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
import { reactive, toRefs, ref, onMounted } from "vue";
import { RequestRule } from "@/types";
import RuleEditor from "./RuleEditor.vue";
import InterceptionHistory from "./InterceptionHistory.vue";
import { generateId } from "@/utils/common";

const ourRuleIdPrefix = 1000;

interface Emits {
  (e: "update-rules", rules: RequestRule[]): void;
  (e: "add-rule", rule: RequestRule): void;
  (e: "delete-rule", ruleId: string): void;
  (e: "toggle-enabled", enabled: boolean): void;
}

const emit = defineEmits<Emits>();

// 响应式数据
const reactiveData = reactive({
  isEnabled: true,
  showAddRuleDialog: true,
  editingRule: null as RequestRule | null,
  autoScroll: true,
  showHistoryDrawer: false,
});

// 解构响应式数据以便使用
const {
  isEnabled,
  showAddRuleDialog,
  editingRule,
  autoScroll,
  showHistoryDrawer,
} = toRefs(reactiveData);

// 当前管理的规则
const requestRules = ref<RequestRule[]>([]);

// 组件挂载时加载规则
onMounted(() => {
  loadRules();
});

// 保存规则到缓存
const saveRulesToCache = async () => {
  try {
    await chrome.storage.local.set({
      requestRules: requestRules.value,
      requestRulesEnabled: isEnabled.value,
      rulesLastModified: Date.now(),
    });
    console.log("规则已保存到缓存");
  } catch (error) {
    console.error("保存规则到缓存失败:", error);
  }
};

// 从缓存加载规则
const loadRulesFromCache = async () => {
  try {
    const result = await chrome.storage.local.get([
      "requestRules",
      "rulesLastModified",
      "requestRulesEnabled",
    ]);
    if (result.requestRules) {
      requestRules.value = result.requestRules;
      console.log(
        "从缓存加载规则成功，最后修改时间:",
        new Date(result.rulesLastModified).toLocaleString()
      );
      return true;
    }
  } catch (error) {
    console.error("从缓存加载规则失败:", error);
  }
  return false;
};

// 加载规则
const loadRules = async () => {
  // 首先尝试从缓存加载
  const cached = await loadRulesFromCache();

  if (!cached) {
    // 缓存中没有规则，从Chrome API加载
    try {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      console.log("加载规则成功-原始规则:", rules);

      const ourRules = rules.map((rule) => {
        // 从规则中提取信息
        const urlFilter = rule.condition.urlFilter;
        const regexFilter = rule.condition.regexFilter;
        const method =
          rule.condition.requestMethods?.[0]?.toUpperCase() || "GET";

        // 解析响应体
        let responseBody = {};
        if (rule.action.type === "redirect" && rule.action.redirect?.url) {
          const url = rule.action.redirect.url;
          if (url.startsWith("data:application/json")) {
            try {
              const jsonStr = decodeURIComponent(url.split(",")[1]);
              responseBody = JSON.parse(jsonStr);
            } catch (e) {
              console.warn("解析响应体失败:", e);
              responseBody = { message: "默认响应体" };
            }
          } else if (url.startsWith("data:text/plain")) {
            try {
              responseBody = decodeURIComponent(url.split(",")[1]);
            } catch (e) {
              console.warn("解析文本响应体失败:", e);
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
      // 保存到缓存
      await saveRulesToCache();
      console.log("成功加载规则并保存到缓存，规则数量:", ourRules.length);
    } catch (error) {
      console.error("获取规则失败:", error);
      requestRules.value = [];
    }
  }
};

// 将规则转换为declarativeNetRequest格式
const convertToDNRRule = (rule: RequestRule, ruleId: number) => {
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
};

// 更新declarativeNetRequest规则
const updateDNRRules = async () => {
  try {
    const enabledRules = requestRules.value.filter((rule) => rule.enabled);

    const dnrRules: any = enabledRules.map((rule) =>
      convertToDNRRule(rule, rule.ruleId)
    );

    // 先移除旧规则，再添加新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: requestRules.value.map((rule) => rule.ruleId) || [],
      addRules: dnrRules,
    });

    // 更新缓存
    await saveRulesToCache();

    console.log(
      `已成功更新 ${dnrRules.length} 条declarativeNetRequest规则并同步缓存`
    );
  } catch (error) {
    console.error("更新declarativeNetRequest规则时发生错误:", error);
  }
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

// 规则管理函数
const ruleManager = {
  delete: async (rule: RequestRule) => {
    try {
      // 从内存中删除规则
      requestRules.value = requestRules.value.filter((r) => r.id !== rule.id);

      // 从Chrome拦截规则中移除该规则
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [rule.ruleId],
      });

      // 更新缓存
      await saveRulesToCache();

      console.log("规则删除完成，已从Chrome拦截规则中移除并同步缓存");
    } catch (error) {
      console.error("删除规则时发生错误:", error);
    }
  },
  // 打开规则编辑器
  openEditor: (rule: RequestRule | null = null) => {
    editingRule.value = rule;
    showAddRuleDialog.value = true;
  },

  // 更新规则
  update: async (rule: RequestRule) => {
    // 更新内存中的规则
    const index = requestRules.value.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      requestRules.value[index] = { ...rule };
      // 直接更新Chrome拦截规则
      await updateDNRRules();
      console.log("规则更新完成，已同步到Chrome拦截规则和缓存");
    }
  },

  // 保存规则
  save: async (rule: RequestRule) => {
    if (editingRule.value) {
      // 更新现有规则
      const index = requestRules.value.findIndex(
        (r) => r.id === editingRule.value!.id
      );
      if (index !== -1) {
        requestRules.value[index] = { ...rule };
      }
    } else {
      // 添加新规则
      const newRule: RequestRule = {
        ...rule,
        id: rule.id,
      };
      requestRules.value.push(newRule);
    }

    // 直接更新Chrome拦截规则
    await updateDNRRules();

    showAddRuleDialog.value = false;
    editingRule.value = null;
    console.log("规则保存完成，已同步到Chrome拦截规则和缓存");
  },
};

// 导出规则管理函数
const {
  openEditor: addRule,
  update: updateRule,
  save: saveRule,
  delete: deleteRule,
} = ruleManager;
const editRule = (rule: RequestRule) => ruleManager.openEditor(rule);

// 切换启用状态
const toggleEnabled = async (enabled: boolean) => {
  isEnabled.value = enabled;

  requestRules.value.forEach((rule) => {
    rule.enabled = enabled;
  });
  if (enabled) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#52c41a" }); // 绿色
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#f5222d" }); // 红色
  }
  await updateDNRRules();
};

// 切换规则详情显示
const toggleRuleDetails = (rule: RequestRule) => {
  rule.expanded = !rule.expanded;
};

// 清除缓存
const clearCache = async () => {
  try {
    await chrome.storage.local.remove([
      "requestRules",
      "rulesLastModified",
      "requestRulesEnabled",
    ]);
    console.log("缓存已清除");

    // 重新从Chrome API加载规则
    await loadRules();

    // 显示成功提示
    alert("缓存清除成功，已重新加载规则");
  } catch (error) {
    console.error("清除缓存失败:", error);
    alert("清除缓存失败，请重试");
  }
};
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

      .chrome-rules-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        border-radius: 6px;
        margin: 12px 16px;

        .status-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0050b3;
          font-size: 14px;
          font-weight: 500;

          .t-icon {
            color: #1890ff;
          }
        }

        .t-button {
          background: #1890ff;
          color: white;
          border: none;

          &:hover {
            background: #40a9ff;
          }
        }
      }
    }
  }
}
</style>
