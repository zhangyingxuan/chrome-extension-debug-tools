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
        <t-popconfirm content="确定清空历史吗？" @confirm="clearHistory">
          <t-button size="small" theme="danger">清空历史</t-button>
        </t-popconfirm>
        <t-switch
          v-model="autoScroll"
          size="small"
          :label="['自动滚动', '固定']"
        />
      </div>

      <div class="history-list" ref="historyList">
        <!-- 表格标题 -->
        <div class="table-header">
          <div class="col-requestType">请求类型</div>
          <div class="col-method">方法</div>
          <div class="col-filterType">过滤类型</div>
          <div class="col-url">URL</div>
          <div class="col-time">时间</div>
        </div>

        <!-- 拦截记录项 -->
        <div
          v-for="(record, index) in interceptionHistory"
          :key="'record' + index"
          class="history-item"
        >
          <div class="table-row" @click="toggleDetails(record)">
            <div class="col-requestType">
              {{ record.requestType }}
            </div>
            <div class="col-method">
              <span class="method-badge">{{ record.method }}</span>
            </div>
            <div class="col-filterType">
              <span class="filter-type-badge">{{ record.filterType }}</span>
            </div>
            <div class="col-url" :title="record.url">
              {{ truncateUrl(record.url) }}
            </div>
            <div class="col-time">{{ formatTime(record.timestamp) }}</div>
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
                  <span class="detail-label">过滤类型:</span>
                  <span class="detail-value">{{ record.filterType }}</span>
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
                <div v-if="record.status" class="detail-row">
                  <span class="detail-label">状态码:</span>
                  <span class="detail-value">{{ record.status }}</span>
                </div>
                <div v-if="record.error" class="detail-row">
                  <span class="detail-label">错误信息:</span>
                  <span class="detail-value error-text">{{
                    record.error
                  }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="
                record.requestHeaders &&
                Object.keys(record.requestHeaders).length > 0
              "
              class="detail-section"
            >
              <div class="detail-title">请求头</div>
              <div class="detail-content">
                <div class="headers-content">
                  <pre>{{ formatHeaders(record.requestHeaders) }}</pre>
                </div>
              </div>
            </div>

            <div
              v-if="
                record.responseHeaders &&
                Object.keys(record.responseHeaders).length > 0
              "
              class="detail-section"
            >
              <div class="detail-title">响应头</div>
              <div class="detail-content">
                <div class="headers-content">
                  <pre>{{ formatHeaders(record.responseHeaders) }}</pre>
                </div>
              </div>
            </div>

            <div v-if="record.requestBody" class="detail-section">
              <div class="detail-title">请求体</div>
              <div class="detail-content">
                <div class="json-content">
                  <pre>{{ formatBody(record.requestBody) }}</pre>
                </div>
              </div>
            </div>

            <div v-if="record.responseBody" class="detail-section">
              <div class="detail-title">响应体</div>
              <div class="detail-content">
                <div class="json-content">
                  <pre>{{ formatBody(record.responseBody) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="interceptionHistory.length === 0" class="empty-state">
          暂无脚本拦截记录
        </div>
      </div>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import type { ScriptInterceptionRecord } from "@/types";
import { formatTime } from "@/utils/common";

interface Props {
  visible: boolean;
}

interface Emits {
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const historyList = ref<HTMLElement>();

const interceptionHistory = ref<ScriptInterceptionRecord[]>([]);
const autoScroll = ref(true);

const truncateUrl = (url: string) => {
  if (url.length > 80) {
    return url.substring(0, 40) + "..." + url.substring(url.length - 40);
  }
  return url;
};

const toggleDetails = (record: ScriptInterceptionRecord) => {
  record.expanded = !record.expanded;
};

const clearHistory = () => {
  interceptionHistory.value = [];
};

const formatHeaders = (headers: Record<string, string>) => {
  if (!headers || Object.keys(headers).length === 0) {
    return "无数据";
  }
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};

const formatBody = (body: any) => {
  if (!body) {
    return "无数据";
  }

  if (typeof body === "string") {
    // 检查是否是JavaScript函数
    if (
      body.trim().startsWith("function") ||
      body.includes("=>") ||
      body.includes("return")
    ) {
      return body;
    }

    try {
      const parsed = JSON.parse(body);
      if (typeof parsed === "object" && parsed !== null) {
        return JSON.stringify(parsed, null, 2);
      }
      return body;
    } catch {
      return body;
    }
  }

  if (typeof body === "object" && body !== null) {
    return JSON.stringify(body, null, 2);
  }

  return String(body);
};

// 监听历史记录变化，实现自动滚动
watch(
  [() => interceptionHistory, () => autoScroll],
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

// 暴露方法给父组件
defineExpose({
  handleInterceptionRecord,
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

        .col-requestType {
          width: 110px;
        }
        .col-method {
          width: 60px;
        }
        .col-filterType {
          width: 80px;
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

          .col-requestType {
            width: 110px;
          }
          .col-method {
            width: 60px;
          }
          .col-filterType {
            width: 80px;
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

          .method-badge {
            background: #0078d4;
            color: white;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
          }

          .filter-type-badge {
            background: #faad14;
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

              .headers-content,
              .json-content {
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

                pre {
                  margin: 0;
                  padding: 0;
                  background: transparent;
                  border: none;
                  font-family: inherit;
                  font-size: inherit;
                  line-height: 1.4;
                }
              }

              .json-content {
                // JavaScript函数特殊样式
                &:has(pre:contains("function")) {
                  background: #f0f8ff;
                  border-color: #1890ff;
                }

                &:has(pre:contains("=>")) {
                  background: #f0f8ff;
                  border-color: #1890ff;
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
