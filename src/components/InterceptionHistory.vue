<template>
  <t-drawer
    :visible="visible"
    :footer="null"
    @close="$emit('close')"
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
        </div>

        <!-- 拦截记录项 -->
        <div
          v-for="record in interceptionHistory"
          :key="record.id"
          class="history-item"
          :class="getHistoryItemClass(record)"
          @click="toggleDetails(record)"
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
              <span class="status-code-badge">{{ record.responseStatus }}</span>
            </div>
            <div class="col-time">{{ formatTime(record.timestamp) }}</div>
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
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import { Message } from "tdesign-vue-next";
import type { InterceptionRecord } from "@/types";
import { getStatusClass, formatTime } from "@/utils/common";

interface Props {
  visible: boolean;
  autoScroll: boolean;
}

interface Emits {
  (e: "close"): void;
  (e: "update:autoScroll", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const historyList = ref<HTMLElement>();

const interceptionHistory = ref<InterceptionRecord[]>([]);

// 方法
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

const truncateUrl = (url: string) => {
  if (url.length > 80) {
    return url.substring(0, 40) + "..." + url.substring(url.length - 40);
  }
  return url;
};

const toggleDetails = (record: InterceptionRecord) => {
  record.expanded = !record.expanded;
};

const clearHistory = () => {
  Message.confirm({
    content: "确定要清空所有拦截历史记录吗？",
    onConfirm: () => {
      interceptionHistory.value = [];
    },
  });
};

// 监听历史记录变化，实现自动滚动
watch(
  [() => interceptionHistory, () => props.autoScroll],
  ([interceptionHistory, shouldScroll]) => {
    if (shouldScroll && interceptionHistory.value.length > 0) {
      nextTick(() => {
        historyList.value?.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  },
  { deep: true }
);

function handleInterceptionRecord(record: any) {
  // 添加到历史记录
  interceptionHistory.value.push(record);

  // 限制历史记录数量，避免内存溢出
  if (interceptionHistory.value.length > 1000) {
    interceptionHistory.value = interceptionHistory.value.slice(-500);
  }
}

// 组件挂载时
onMounted(() => {
  // 监听declarativeNetRequest规则匹配事件（用于记录拦截历史）
  chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((details) => {
    // 记录所有匹配的规则，不区分来源
    const record = {
      id: details.rule.ruleId,
      timestamp: Date.now(),
      url: details.request.url,
      method: details.request.method,
      ruleId: details.rule.ruleId,
    };

    // 记录拦截历史
    handleInterceptionRecord(record);
    console.log(
      `请求被declarativeNetRequest拦截: ${details.request.url}；规则ID: ${details.rule.ruleId}`
    );
  });
});
</script>

<style lang="less" scoped>
.history-drawer {
  .drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;

    .drawer-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
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
