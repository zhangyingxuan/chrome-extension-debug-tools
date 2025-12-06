<template>
  <div class="request-logger">
    <!-- 控制区域 -->
    <div class="control-section">
      <div class="control-header">
        <h3 class="control-actions">
          网络请求记录
          <t-switch
            v-model="isRecording"
            :label="['记录中', '已停止']"
            size="small"
            @change="toggleRecording"
          />
          <t-switch
            v-model="showUrlParams"
            :label="['显示参数', '隐藏参数']"
            size="small"
          />
          <t-tooltip content="清空记录">
            <ClearIcon @click="clearLogs" size="16" />
          </t-tooltip>
          <t-input
            v-model="filterKeyword"
            placeholder="输入URL关键词过滤"
            size="small"
            style="width: 200px; margin-right: 8px"
            clearable
          />
        </h3>
        <div class="control-actions">
          <t-tooltip content="导出记录">
            <FileExportIcon @click="exportLogs" size="16" />
          </t-tooltip>
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
        <div class="col-actions">操作</div>
      </div>

      <div
        v-for="log in reversedLogs"
        :key="log.id"
        class="request-item"
        :class="getRequestItemClass(log)"
      >
        <div class="request-row" @click="toggleRequestDetails(log)">
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
          <div class="col-actions">
            <t-button
              size="small"
              theme="primary"
              variant="text"
              @click.stop="quickAddRule(log)"
              title="添加拦截规则（declarativeNetRequest拦截）"
            >
              拦截
            </t-button>
            <t-button
              size="small"
              theme="success"
              variant="text"
              @click.stop="scriptIntercept(log)"
              title="添加脚本拦截（XMLHttpRequest、Fetch拦截）"
            >
              脚本拦截
            </t-button>
          </div>
          <ChevronDownIcon v-if="log.expanded" size="16" class="expand-icon" />
          <ChevronRightIcon v-else size="16" class="expand-icon" />
        </div>

        <!-- 请求详情 -->
        <div v-if="log.expanded" class="request-details">
          <div class="detail-tabs">
            <div
              class="tab"
              :class="{ active: getActiveTab(log) === 'headers' }"
              @click="switchTab(log, 'headers')"
            >
              Headers
            </div>
            <div
              class="tab"
              :class="{ active: getActiveTab(log) === 'response' }"
              @click="switchTab(log, 'response')"
            >
              Response
            </div>
            <div
              class="tab"
              :class="{ active: getActiveTab(log) === 'timing' }"
              @click="switchTab(log, 'timing')"
            >
              Timing
            </div>
          </div>

          <div class="detail-content">
            <!-- Headers Tab -->
            <div
              class="tab-panel"
              :class="{ active: getActiveTab(log) === 'headers' }"
            >
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
                    <span class="property-name">Resource Type:</span>
                    <span class="property-value">{{ log.resourceType }}</span>
                  </div>
                  <div class="property">
                    <span class="property-name">Duration:</span>
                    <span class="property-value">{{ log.duration }}ms</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Request Headers</div>
                <div class="section-content">
                  <pre class="headers-content">{{ log.requestHeaders }}</pre>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Response Headers</div>
                <div class="section-content">
                  <pre class="headers-content">{{ log.responseHeaders }}</pre>
                </div>
              </div>
            </div>

            <!-- Response Tab -->
            <div
              class="tab-panel"
              :class="{ active: getActiveTab(log) === 'response' }"
            >
              <div v-if="log.responseBody" class="response-content">
                <div class="content-type-indicator">
                  Content-Type:
                  {{ getContentType(log.responseBody, log.responseHeaders) }}
                </div>
                <pre>{{ formatBody(log.responseBody) }}</pre>
              </div>
              <div v-else class="no-content">No response available</div>
            </div>

            <!-- Timing Tab -->
            <div
              class="tab-panel"
              :class="{ active: getActiveTab(log) === 'timing' }"
            >
              <div class="timing-content">
                <div class="property">
                  <span class="property-name">Duration:</span>
                  <span class="property-value">{{ log.duration }}ms</span>
                </div>
                <div class="property">
                  <span class="property-name">Timestamp:</span>
                  <span class="property-value">{{
                    new Date(log.timestamp).toLocaleString()
                  }}</span>
                </div>
                <div class="property">
                  <span class="property-name">Response Size:</span>
                  <span class="property-value">{{ getResponseSize(log) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="requestLogs.length === 0" class="empty-state">
        <FileSearchIcon size="48" />
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
import {
  FileSearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClearIcon,
  FileExportIcon,
} from "tdesign-icons-vue-next";
import { ref, computed, onUnmounted } from "vue";
import { generateId, getStatusClass } from "@/utils/common";
import { RequestLog } from "@/types";

interface Emits {
  (e: "clear-logs"): void;
  (e: "update-logs", logs: RequestLog[]): void;
  (e: "open-rule-editor", ruleData: any): void;
}

const emit = defineEmits<Emits>();

const isRecording = ref(false);
const showUrlParams = ref(true);
const filterKeyword = ref("");
const requestLogs = ref<RequestLog[]>([]);
const requestList = ref<HTMLElement>();

// 为每个请求设置独立的tab状态
const getActiveTab = (log: RequestLog): string => {
  return log.activeTab || "headers";
};

// 计算属性
const reversedLogs = computed(() => {
  let logs = [...requestLogs.value];

  // 应用URL过滤
  if (filterKeyword.value.trim()) {
    const keyword = filterKeyword.value.trim().toLowerCase();
    logs = logs.filter((log) => log.url.toLowerCase().includes(keyword));
  }

  return logs.reverse();
});

// 网络请求监听器
let requestFinishedListener: ((request: any) => void) | null = null;

// 启动网络请求记录
const startRecording = () => {
  if (!chrome.devtools || !chrome.devtools.network) {
    console.error("DevTools API不可用");
    return;
  }

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
  if (requestFinishedListener && chrome.devtools?.network) {
    chrome.devtools.network.onRequestFinished.removeListener(
      requestFinishedListener
    );
    requestFinishedListener = null;
  }
};

// 处理网络请求完成事件
const handleRequestFinished = (request: any) => {
  console.log("handleRequestFinished===", request);
  if (!isRecording.value) return;

  const resourceType = request._resourceType || request.type || "unknown";
  // 仅保留fetch和xhr请求
  if (!["fetch", "xhr"].includes(resourceType)) {
    return;
  }

  const log: RequestLog = {
    id: generateId("request_log"),
    timestamp: Date.now(),
    url: request.request.url,
    method: request.request.method,
    status: request.response.status,
    duration: request.time?.toFixed(2),
    requestHeaders: request.request.headers || {},
    responseHeaders: request.response.headers || {},
    requestBody: (() => {
      const postDataText =
        request.request.postData?.text || request.request.postData;
      if (typeof postDataText === "string") {
        try {
          return JSON.parse(postDataText);
        } catch (error) {
          // 如果解析失败，保持原样
          return postDataText;
        }
      }
      return postDataText;
    })(),
    responseBody: null,
    expanded: false,
    resourceType,
    activeTab: "headers", // 初始化tab状态
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

// 切换请求详情
const toggleRequestDetails = (log: RequestLog) => {
  log.expanded = !log.expanded;
};

// 切换tab
const switchTab = (log: RequestLog, tabName: string) => {
  log.activeTab = tabName;
};

// 格式化body数据，支持JSON、数组等格式
const formatBody = (body: any): string => {
  if (!body) return "No content";

  try {
    // 如果是字符串，尝试解析为JSON
    if (typeof body === "string") {
      // 检查是否是JSON字符串
      const trimmedBody = body.trim();
      if (
        (trimmedBody.startsWith("{") && trimmedBody.endsWith("}")) ||
        (trimmedBody.startsWith("[") && trimmedBody.endsWith("]"))
      ) {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      }
      // 如果不是JSON，检查是否是HTML
      if (body.includes("<html") || body.includes("<!DOCTYPE")) {
        return body; // 保持HTML原样
      }
      // 普通文本
      return body;
    }

    // 如果是对象或数组，直接格式化
    if (typeof body === "object") {
      return JSON.stringify(body, null, 2);
    }

    // 其他类型转换为字符串
    return String(body);
  } catch (error) {
    console.warn("格式化body失败:", error);
    return typeof body === "string" ? body : String(body);
  }
};

// 判断内容类型
const getContentType = (
  body: any,
  headers: Record<string, string> = {}
): string => {
  if (!body) return "text";

  const contentType = headers["content-type"] || headers["Content-Type"] || "";

  if (contentType.includes("application/json")) {
    return "json";
  } else if (contentType.includes("text/html")) {
    return "html";
  } else if (contentType.includes("text/plain")) {
    return "text";
  } else if (
    contentType.includes("application/xml") ||
    contentType.includes("text/xml")
  ) {
    return "xml";
  }

  // 根据内容自动判断
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return "json";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return "json";
    if (body.includes("<html") || body.includes("<!DOCTYPE")) return "html";
    if (body.includes("<?xml") || body.includes("<xml")) return "xml";
  }

  return "text";
};

// 格式化URL显示，只保留最后一路路径及参数
const formatUrl = (url: string) => {
  const urlObj = new URL(url);
  let lastTwoParts = extractUrlPattern(url);

  // 获取查询参数
  const searchParams = urlObj.searchParams.toString();

  // 根据showUrlParams决定是否显示参数
  if (showUrlParams.value && searchParams) {
    return `${lastTwoParts}?${searchParams}`;
  } else {
    return `${lastTwoParts}`;
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

// 快速添加拦截规则
const quickAddRule = (log: RequestLog) => {
  // 提取URL后两个/中的内容作为urlPattern
  const urlPattern = extractUrlPattern(log.url);

  // 格式化响应体数据
  let formattedResponseBody = log.responseBody || "{}";
  if (typeof formattedResponseBody === "string") {
    try {
      // 如果是JSON字符串，先解析再格式化
      const parsedBody = JSON.parse(formattedResponseBody);
      formattedResponseBody = JSON.stringify(parsedBody, null, 2);
    } catch (error) {
      // 如果不是JSON，保持原样
      console.warn("响应体不是JSON格式，保持原样:", formattedResponseBody);
    }
  } else if (typeof formattedResponseBody === "object") {
    // 如果是对象，直接格式化
    formattedResponseBody = JSON.stringify(formattedResponseBody, null, 2);
  }

  // 准备规则数据
  const ruleData = {
    method: log.method,
    urlPattern: urlPattern,
    filterType: "urlFilter",
    response: {
      status: log.status,
      headers: log.responseHeaders || {},
      body: formattedResponseBody,
    },
    interceptorType: "request-interceptor", // 路由到请求拦截器
  };

  // 直接打开规则编辑器弹窗
  emit("open-rule-editor", ruleData);
};

// 脚本拦截（使用JavaScript处理）
const scriptIntercept = (log: RequestLog) => {
  // 提取URL模式
  const urlPattern = extractUrlPattern(log.url);

  console.log("scriptIntercept===:", log);

  // 准备规则数据 - 使用JavaScript脚本处理
  const ruleData = {
    method: log.method,
    urlPattern: urlPattern,
    filterType: "urlFilter",
    requestHeaders: log.requestHeaders,
    requestBody: log.requestBody,
    response: {
      status: log.status,
      headers: log.responseHeaders || {},
      body: log.responseBody,
      bodyType: "json",
    },
    interceptorType: "script-interceptor", // 路由到脚本拦截器
  };

  // 打开脚本规则编辑器
  emit("open-rule-editor", ruleData);
};

// 提取URL后两个/中的内容作为urlPattern
const extractUrlPattern = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 分割路径部分
    const pathParts = pathname.split("/").filter((part) => part.trim() !== "");

    // 获取最后两个路径部分
    if (pathParts.length >= 2) {
      const lastTwoParts = pathParts.slice(-2);
      return `/${lastTwoParts.join("/")}`;
    } else if (pathParts.length === 1) {
      return `/${pathParts[0]}`;
    } else {
      // 如果没有路径部分，使用完整路径
      return pathname;
    }
  } catch (error) {
    console.warn("URL解析失败，使用备用方法:", url, error);

    // 如果URL解析失败，使用更健壮的路径提取
    // 移除协议和域名部分，提取路径
    const protocolIndex = url.indexOf("//");
    let pathStartIndex = 0;

    if (protocolIndex !== -1) {
      pathStartIndex = url.indexOf("/", protocolIndex + 2);
      if (pathStartIndex === -1) {
        pathStartIndex = url.length;
      }
    }

    const pathPart = url.substring(pathStartIndex);
    const pathParts = pathPart.split("/").filter((part) => part.trim() !== "");

    if (pathParts.length >= 2) {
      const lastTwoParts = pathParts.slice(-2);
      return `*/${lastTwoParts.join("/")}*`;
    } else if (pathParts.length === 1) {
      return `*/${pathParts[0]}*`;
    } else {
      // 如果无法提取路径，使用完整URL的路径部分
      return `*${pathPart}*`;
    }
  }
};
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
        width: 60px;
      }
      .col-url {
        flex: 1;
      }
      .col-duration {
        width: 80px;
      }
      .col-size {
        width: 80px;
      }
      .col-actions {
        width: 120px;
        text-align: center;

        .t-button {
          margin: 0 2px;
          padding: 2px 6px;
          font-size: 11px;
          min-height: 20px;
          line-height: 1;
        }
      }
    }

    .request-item {
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.1s;

      &.success {
        background-color: #f6ffed;
      }

      &.error {
        background-color: #fff2f0;
      }

      &.expanded {
        background-color: #fff;
      }

      &:hover {
        background-color: #f8f9fa;
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
          width: 60px;
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
        .col-actions {
          width: 120px;
          text-align: center;

          .t-button {
            margin: 0 2px;
            padding: 2px 6px;
            font-size: 11px;
            min-height: 20px;
            line-height: 1;
          }
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
            transition: all 0.2s;

            &.active {
              color: #0078d4;
              border-bottom-color: #0078d4;
              font-weight: 600;
              background: #f8f9fa;
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

            .content-type-indicator {
              background: #e6f7ff;
              border: 1px solid #91d5ff;
              border-radius: 4px;
              padding: 8px 12px;
              margin-bottom: 12px;
              font-size: 12px;
              color: #0050b3;
              font-weight: 500;
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
                    flex-shrink: 0;
                  }

                  .property-value {
                    flex: 1;
                    color: #323130;
                    word-break: break-all;
                    font-family: "SF Mono", Monaco, "Cascadia Code",
                      "Roboto Mono", Consolas, "Courier New", monospace;
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
              max-height: 400px;
              overflow: auto;
              margin: 0;
              line-height: 1.4;
            }

            // JSON语法高亮样式
            .preview-content pre,
            .response-content pre {
              color: #24292e;

              // JSON键名
              .json-key {
                color: #d73a49;
              }
              // JSON字符串值
              .json-string {
                color: #032f62;
              }
              // JSON数字
              .json-number {
                color: #005cc5;
              }
              // JSON布尔值
              .json-boolean {
                color: #e36209;
              }
              // JSON null
              .json-null {
                color: #6a737d;
              }
            }

            .no-content {
              text-align: center;
              padding: 40px 20px;
              color: #a19f9d;
              font-size: 12px;
              background: #f8f9fa;
              border-radius: 4px;
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

/* 响应式适配 */
@media (max-width: 768px) {
  .request-logger {
    .request-list {
      .table-header {
        padding: 4px 6px;
        font-size: 11px;

        .col-duration,
        .col-size {
          width: 60px;
        }
      }

      .request-item .request-row {
        padding: 3px 6px;
        font-size: 11px;
      }
    }
  }
}
</style>
