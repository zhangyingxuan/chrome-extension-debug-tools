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
        <t-popconfirm
          :content="$t('clearHistoryConfirm')"
          @confirm="clearHistory"
        >
          <t-tooltip :content="$t('clearHistory')">
            <DeleteIcon size="16" title="" />
          </t-tooltip>
        </t-popconfirm>
        <t-switch
          v-model="autoScroll"
          size="small"
          :label="[$t('autoScroll'), $t('fixed')]"
        />
      </div>

      <div class="history-list" ref="historyList">
        <!-- 表格标题 -->
        <div class="table-header">
          <div class="col-requestId">{{ $t("colRequestId") }}</div>
          <div class="col-method">{{ $t("colMethod") }}</div>
          <div class="col-url">{{ $t("colUrl") }}</div>
          <div class="col-time">{{ $t("colTime") }}</div>
        </div>

        <!-- 拦截记录项 -->
        <div
          v-for="record in interceptionHistory"
          :key="record.id"
          class="history-item"
          @click="toggleDetails(record)"
        >
          <div class="table-row">
            <div class="col-requestId">
              {{ record.requestId }}
            </div>
            <div class="col-method">
              <span class="method-badge">{{ record.method }}</span>
            </div>
            <div class="col-url" :title="record.url">
              {{ truncateUrl(record.url) }}
            </div>
            <div class="col-time">{{ formatTime(record.timestamp) }}</div>
          </div>

          <!-- 详情面板 -->
          <div v-if="record.expanded" class="history-details">
            <div class="detail-section">
              <div class="detail-title">{{ $t("interceptionDetails") }}</div>
              <div class="detail-content">
                <div class="detail-row">
                  <span class="detail-label">{{ $t("ruleId") }}:</span>
                  <span class="detail-value">{{
                    record.ruleId || $t("unknown")
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t("ruleType") }}:</span>
                  <span class="detail-value">{{
                    record.rulesetId || $t("unknown")
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t("matchedRule") }}:</span>
                  <span class="detail-value">{{
                    record.matchedRule || $t("noMatch")
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t("fullUrl") }}:</span>
                  <span class="detail-value">{{ record.url }}</span>
                </div>
                <div v-if="record.error" class="detail-row">
                  <span class="detail-label">{{ $t("errorMessage") }}:</span>
                  <span class="detail-value error-text">{{
                    record.error
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="interceptionHistory.length === 0" class="empty-state">
          {{ $t("noInterceptionHistory") }}
        </div>
      </div>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import { t } from "@/utils/i18n";
import type { InterceptionRecord } from "@/types";
import { formatTime } from "@/utils/common";
import { DeleteIcon } from "tdesign-icons-vue-next";

interface Props {
  visible: boolean;
}

interface Emits {
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const historyList = ref<HTMLElement>();

const interceptionHistory = ref<InterceptionRecord[]>([]);
const autoScroll = ref(true);

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
  interceptionHistory.value = [];
};

// 监听历史记录变化，实现自动滚动
watch(
  [() => interceptionHistory, () => autoScroll],
  ([interceptionHistory, shouldScroll]: [any, any]) => {
    if (shouldScroll && interceptionHistory.value.length > 0) {
      nextTick(() => {
        historyList.value?.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  },
  { deep: true }
);

function handleInterceptionRecord(record: InterceptionRecord) {
  // 添加到历史记录（头插）
  interceptionHistory.value.unshift(record);

  // 限制历史记录数量，避免内存溢出
  if (interceptionHistory.value.length > 1000) {
    interceptionHistory.value = interceptionHistory.value.slice(0, 500);
  }
}

// 组件挂载时
onMounted(() => {
  // 监听declarativeNetRequest规则匹配事件（用于记录拦截历史）
  chrome.declarativeNetRequest?.onRuleMatchedDebug?.addListener((details) => {
    // 记录所有匹配的规则，不区分来源
    const record = {
      id: details.rule.ruleId,
      requestId: details.request.requestId,
      url: details.request.url,
      method: details.request.method,
      ruleId: details.rule.ruleId,
      rulesetId: details.rule.rulesetId,
      timestamp: Date.now(),
      expanded: false,
    };

    // 记录拦截历史
    handleInterceptionRecord(record);
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
        gap: 12px;
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

        .col-requestId {
          width: 60px;
        }
        .col-method {
          width: 60px;
        }
        .col-url {
          flex: 1;
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

        &.expanded {
          background-color: #e6f7ff;
        }

        .table-row {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          min-height: 24px;

          .col-requestId {
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
          }

          .method-badge {
            background: #0078d4;
            color: white;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
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
