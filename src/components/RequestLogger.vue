<template>
  <div class="request-logger">
    <!-- 控制区域 -->
    <div class="control-section">
      <div class="control-header">
        <h3>
          网络请求记录
          <t-switch
            v-model="isRecording"
            :label="['记录中', '已停止']"
            size="small"
            @change="toggleRecording"
          />
          &nbsp;
          <t-switch
            v-model="showUrlParams"
            :label="['显示参数', '隐藏参数']"
            size="small"
          />
        </h3>
        <div class="control-actions">
          <t-button size="small" @click="clearLogs" theme="default">
            清空记录
          </t-button>
          <t-button size="small" @click="exportLogs" theme="default">
            导出记录
          </t-button>
        </div>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="request-list" ref="requestList">
      <!-- 列标题 -->
      <div class="table-header">
        <div class="col-status">状态</div>
        <div class="col-method">方法</div>
        <div class="col-type">类型</div>
        <div class="col-url">URL</div>
        <div class="col-duration">时间</div>
        <div class="col-size">大小</div>
      </div>

      <div
        v-for="log in reversedLogs"
        :key="log.id"
        class="request-item"
        :class="getRequestItemClass(log)"
        @click="toggleRequestDetails(log)"
      >
        <div class="request-row">
          <div class="col-status">
            <span class="status-badge" :class="getStatusClass(log.status)">
              {{ log.status }}
            </span>
          </div>
          <div class="col-method">
            <span class="method-badge">{{ log.method }}</span>
          </div>
          <div class="col-type">
            <span class="type-badge">{{ log.resourceType }}</span>
          </div>
          <div class="col-url" :title="log.url">
            {{ formatUrl(log.url) }}
          </div>
          <div class="col-duration">{{ log.duration }}ms</div>
          <div class="col-size">{{ getResponseSize(log) }}</div>
          <t-icon
            :name="log.expanded ? 'chevron-down' : 'chevron-right'"
            size="16"
            class="expand-icon"
          />
        </div>

        <!-- 请求详情 -->
        <div v-if="log.expanded" class="request-details">
          <div class="detail-tabs">
            <div class="tab active">Headers</div>
            <div class="tab">Preview</div>
            <div class="tab">Response</div>
            <div class="tab">Timing</div>
          </div>

          <div class="detail-content">
            <div class="tab-panel active">
              <div class="section">
                <div class="section-title">General</div>
                <div class="section-content">
                  <div class="property">
                    <span class="property-name">Request URL:</span>
                    <span class="property-value">{{ log.url }}</span>
                  </div>
                  <div class="property">
                    <span class="property-name">Request Method:</span>
                    <span class="property-value">{{ log.method }}</span>
                  </div>
                  <div class="property">
                    <span class="property-name">Status Code:</span>
                    <span class="property-value">{{ log.status }}</span>
                  </div>
                  <div class="property">
                    <span class="property-name">Remote Address:</span>
                    <span class="property-value">127.0.0.1:8080</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Request Headers</div>
                <div class="section-content">
                  <pre class="headers-content">{{
                    formatHeaders(log.requestHeaders)
                  }}</pre>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Response Headers</div>
                <div class="section-content">
                  <pre class="headers-content">{{
                    formatHeaders(log.responseHeaders)
                  }}</pre>
                </div>
              </div>
            </div>

            <div class="tab-panel">
              <div v-if="log.responseBody" class="preview-content">
                <pre>{{ formatBody(log.responseBody) }}</pre>
              </div>
              <div v-else class="no-content">No preview available</div>
            </div>

            <div class="tab-panel">
              <div v-if="log.responseBody" class="response-content">
                <pre>{{ formatBody(log.responseBody) }}</pre>
              </div>
              <div v-else class="no-content">No response available</div>
            </div>

            <div class="tab-panel">
              <div class="timing-content">
                <div class="property">
                  <span class="property-name">Duration:</span>
                  <span class="property-value">{{ log.duration }}ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="requestLogs.length === 0" class="empty-state">
        <t-icon name="file-search" size="48" />
        <p class="empty-text">暂无请求记录</p>
        <p class="empty-desc">
          {{
            isRecording ? "等待网络请求..." : "请开启记录功能开始记录网络请求"
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { formatTime } from "../utils/common";
import { RequestLog } from "../types";

interface Emits {
  (e: "clear-logs"): void;
  (e: "update-logs", logs: RequestLog[]): void;
}

const emit = defineEmits<Emits>();

const isRecording = ref(false);
const showUrlParams = ref(true);
const requestLogs = ref<RequestLog[]>([]);
const requestList = ref<HTMLElement>();

// 计算属性
const reversedLogs = computed(() => {
  return [...requestLogs.value].reverse();
});

// 网络请求监听器
let requestFinishedListener: ((request: any) => void) | null = null;

// 启动网络请求记录
const startRecording = () => {
  if (!chrome.devtools || !chrome.devtools.network) {
    console.error("DevTools API不可用");
    return;
  }

  console.log("开始网络请求记录");

  if (requestFinishedListener) {
    chrome.devtools.network.onRequestFinished.removeListener(
      requestFinishedListener
    );
  }

  requestFinishedListener = (request) => {
    handleRequestFinished(request);
  };

  chrome.devtools.network.onRequestFinished.addListener(
    requestFinishedListener
  );
};

// 停止网络请求记录
const stopRecording = () => {
  console.log("停止网络请求记录");

  if (requestFinishedListener && chrome.devtools?.network) {
    chrome.devtools.network.onRequestFinished.removeListener(
      requestFinishedListener
    );
    requestFinishedListener = null;
  }
};

// 处理网络请求完成事件
const handleRequestFinished = (request: any) => {
  if (!isRecording.value) return;

  const resourceType = request._resourceType || request.type || "unknown";
  // 仅保留fetch和xhr请求
  if (!["fetch", "xhr"].includes(resourceType)) {
    return;
  }

  const log: RequestLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    url: request.request.url,
    method: request.request.method,
    status: request.response.status,
    duration: request.time?.toFixed(2),
    requestHeaders: request.request.headers || {},
    responseHeaders: request.response.headers || {},
    requestBody: request.request.postData,
    responseBody: null,
    expanded: false,
    resourceType,
  };

  // 尝试获取响应体内容
  if (request.getContent) {
    request.getContent((content: string) => {
      log.responseBody = content;
      saveRequestLog(log);
    });
  } else {
    saveRequestLog(log);
  }
};

// 保存请求记录
const saveRequestLog = (log: RequestLog) => {
  requestLogs.value.push(log);

  // 限制记录数量，避免内存溢出
  if (requestLogs.value.length > 1000) {
    requestLogs.value = requestLogs.value.slice(-500);
  }

  // 通知父组件
  emit("update-logs", requestLogs.value);
};

// 切换记录状态
const toggleRecording = (enabled: boolean) => {
  isRecording.value = enabled;

  if (enabled) {
    startRecording();
  } else {
    stopRecording();
  }
};

// 清空记录
const clearLogs = () => {
  requestLogs.value = [];
  emit("clear-logs");
  emit("update-logs", requestLogs.value);
};

// 导出记录
const exportLogs = () => {
  const data = {
    requestLogs: requestLogs.value,
    exportTime: new Date().toISOString(),
    totalCount: requestLogs.value.length,
    isRecording: isRecording.value,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `network-requests-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// 获取请求项样式类
const getRequestItemClass = (log: RequestLog) => {
  const classes = [];
  if (log.status >= 200 && log.status < 400) {
    classes.push("success");
  } else if (log.status >= 400) {
    classes.push("error");
  }
  if (log.expanded) {
    classes.push("expanded");
  }
  return classes.join(" ");
};

// 获取状态样式类
const getStatusClass = (status: number) => {
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

// 切换请求详情
const toggleRequestDetails = (log: RequestLog) => {
  log.expanded = !log.expanded;
};

// 格式化headers
const formatHeaders = (headers: Record<string, string>) => {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};

// 格式化body
const formatBody = (body: any) => {
  if (typeof body === "string") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, 2);
};

// 格式化URL显示，只保留最后一路路径及参数
const formatUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 获取最后一路路径
    const pathParts = pathname.split("/").filter((part) => part.trim() !== "");
    const lastPath =
      pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";

    // 获取查询参数
    const searchParams = urlObj.searchParams.toString();

    // 根据showUrlParams决定是否显示参数
    if (showUrlParams.value && searchParams) {
      return `/${lastPath}?${searchParams}`;
    } else {
      return `/${lastPath}`;
    }
  } catch (error) {
    // 如果URL解析失败，返回原始URL或简化版本
    const urlParts = url.split("/");
    const lastPart = urlParts[urlParts.length - 1] || "";

    if (showUrlParams.value && url.includes("?")) {
      const baseUrl = url.split("?")[0];
      const queryString = url.split("?")[1];
      const baseParts = baseUrl.split("/");
      const lastBasePart = baseParts[baseParts.length - 1] || "";
      return `/${lastBasePart}?${queryString}`;
    } else {
      return `/${lastPart}`;
    }
  }
};

// 获取响应大小
const getResponseSize = (log: RequestLog) => {
  if (!log.responseBody) return "-";

  if (typeof log.responseBody === "string") {
    const size = new Blob([log.responseBody]).size;
    if (size < 1024) {
      return `${size}B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)}KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    }
  }
  return "-";
};

onMounted(() => {
  console.log("RequestLogger组件已挂载");
});

onUnmounted(() => {
  stopRecording();
});
</script>

<style lang="less" scoped>
.request-logger {
  height: 100%;
  display: flex;
  flex-direction: column;

  .control-section {
    background: #fff;
    padding: 8px;
    border-bottom: 1px solid #e8e8e8;

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
      }

      .control-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }

    .stats-info {
      display: flex;
      gap: 24px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .stat-label {
          font-size: 12px;
          color: #666;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 500;

          &.success {
            color: #52c41a;
          }

          &.error {
            color: #ff4d4f;
          }
        }
      }
    }
  }

  .request-list {
    flex: 1;
    overflow: auto;
    background: #fff;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-size: 12px;

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
      .col-type {
        width: 80px;
      }
      .col-url {
        flex: 1;
      }
      .col-duration {
        width: 80px;
        text-align: right;
      }
      .col-size {
        width: 80px;
        text-align: right;
      }
    }

    .request-item {
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover {
        background-color: #f8f9fa;
      }

      &.success {
        background-color: #f6ffed;
      }

      &.error {
        background-color: #fff2f0;
      }

      &.expanded {
        background-color: #e6f7ff;
      }

      .request-row {
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
        .col-type {
          width: 80px;
        }
        .col-url {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .col-duration {
          width: 80px;
          text-align: right;
          color: #666;
        }
        .col-size {
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

        .type-badge {
          color: #666;
          font-size: 11px;
          background: #f3f2f1;
          padding: 1px 6px;
          border-radius: 3px;
        }

        .expand-icon {
          margin-left: 8px;
          color: #666;
          opacity: 0.6;
        }
      }

      .request-details {
        border-top: 1px solid #e1e1e1;
        background: #f8f9fa;

        .detail-tabs {
          display: flex;
          border-bottom: 1px solid #e1e1e1;
          background: #fff;

          .tab {
            padding: 8px 16px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
            border-bottom: 2px solid transparent;

            &.active {
              color: #0078d4;
              border-bottom-color: #0078d4;
              font-weight: 600;
            }

            &:hover {
              color: #0078d4;
              background: #f3f2f1;
            }
          }
        }

        .detail-content {
          padding: 16px;
          background: #fff;

          .tab-panel {
            display: none;

            &.active {
              display: block;
            }

            .section {
              margin-bottom: 20px;

              .section-title {
                font-size: 13px;
                font-weight: 600;
                color: #323130;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #f3f2f1;
              }

              .section-content {
                .property {
                  display: flex;
                  margin-bottom: 4px;
                  font-size: 12px;

                  .property-name {
                    width: 140px;
                    color: #605e5c;
                    font-weight: 500;
                  }

                  .property-value {
                    flex: 1;
                    color: #323130;
                    word-break: break-all;
                  }
                }
              }
            }

            .headers-content,
            .preview-content pre,
            .response-content pre {
              background: #f8f9fa;
              border: 1px solid #e1e1e1;
              border-radius: 4px;
              padding: 12px;
              font-size: 11px;
              font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono",
                Consolas, "Courier New", monospace;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 300px;
              overflow: auto;
              margin: 0;
            }

            .no-content {
              text-align: center;
              padding: 40px 20px;
              color: #a19f9d;
              font-size: 12px;
            }

            .timing-content {
              .property {
                display: flex;
                margin-bottom: 8px;
                font-size: 12px;

                .property-name {
                  width: 120px;
                  color: #605e5c;
                  font-weight: 500;
                }

                .property-value {
                  color: #323130;
                }
              }
            }
          }
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;

      .empty-text {
        margin: 16px 0 8px 0;
        font-size: 14px;
      }

      .empty-desc {
        margin: 0;
        font-size: 12px;
      }
    }
  }
}
</style>
