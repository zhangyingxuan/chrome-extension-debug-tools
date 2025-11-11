<template>
  <div class="request-logger">
    <!-- 控制区域 -->
    <div class="control-section">
      <div class="control-header">
        <h3>网络请求记录</h3>
        <div class="control-actions">
          <t-switch
            v-model="isRecording"
            :label="['记录中', '已停止']"
            size="small"
            @change="toggleRecording"
          />
          <t-button size="small" @click="clearLogs" theme="default">
            清空记录
          </t-button>
          <t-button size="small" @click="exportLogs" theme="default">
            导出记录
          </t-button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-info">
        <div class="stat-item">
          <span class="stat-label">总请求数:</span>
          <span class="stat-value">{{ requestLogs.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">成功请求:</span>
          <span class="stat-value success">{{ successCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">失败请求:</span>
          <span class="stat-value error">{{ errorCount }}</span>
        </div>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="request-list" ref="requestList">
      <div
        v-for="log in reversedLogs"
        :key="log.id"
        class="request-item"
        :class="getRequestItemClass(log)"
        @click="toggleRequestDetails(log)"
      >
        <div class="request-header">
          <div class="request-method">{{ log.method }}</div>
          <div class="request-status" :class="getStatusClass(log.status)">
            {{ log.status }}
          </div>
          <div class="request-time">{{ formatTime(log.timestamp) }}</div>
          <div class="request-duration">{{ log.duration }}ms</div>
          <t-icon
            :name="log.expanded ? 'chevron-down' : 'chevron-right'"
            size="16"
            class="expand-icon"
          />
        </div>

        <div class="request-url">{{ log.url }}</div>

        <!-- 请求详情 -->
        <div v-if="log.expanded" class="request-details">
          <div class="detail-section">
            <h4>请求头</h4>
            <pre class="headers-content">{{
              formatHeaders(log.requestHeaders)
            }}</pre>
          </div>

          <div class="detail-section">
            <h4>响应头</h4>
            <pre class="headers-content">{{
              formatHeaders(log.responseHeaders)
            }}</pre>
          </div>

          <div v-if="log.requestBody" class="detail-section">
            <h4>请求体</h4>
            <pre class="body-content">{{ formatBody(log.requestBody) }}</pre>
          </div>

          <div v-if="log.responseBody" class="detail-section">
            <h4>响应体</h4>
            <pre class="body-content">{{ formatBody(log.responseBody) }}</pre>
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
const requestLogs = ref<RequestLog[]>([]);
const requestList = ref<HTMLElement>();

// 计算属性
const reversedLogs = computed(() => {
  return [...requestLogs.value].reverse();
});

const successCount = computed(() => {
  return requestLogs.value?.filter(
    (log) => log.status >= 200 && log.status < 400
  ).length;
});

const errorCount = computed(() => {
  return requestLogs.value?.filter((log) => log.status >= 400).length;
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

  console.log("捕获到网络请求:", request.request.url);

  const log: RequestLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    url: request.request.url,
    method: request.request.method,
    status: request.response.status,
    duration: request.time,
    requestHeaders: request.request.headers || {},
    responseHeaders: request.response.headers || {},
    requestBody: request.request.postData,
    responseBody: null,
    expanded: false,
  };

  // 尝试获取响应体内容
  if (request.getContent) {
    request.getContent((content: string, encoding: string) => {
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

  // 保存到本地存储
  saveLogsToStorage();

  // 通知父组件
  emit("update-logs", requestLogs.value);
};

// 保存记录到本地存储
const saveLogsToStorage = () => {
  try {
    chrome.storage.local.set({
      requestLogs: requestLogs.value,
    });
  } catch (error) {
    console.error("保存请求记录到存储失败:", error);
  }
};

// 从本地存储加载记录
const loadLogsFromStorage = async () => {
  try {
    const result = await chrome.storage.local.get(["requestLogs"]);
    if (result.requestLogs) {
      requestLogs.value = result.requestLogs;
      emit("update-logs", requestLogs.value);
    }
  } catch (error) {
    console.error("从存储加载请求记录失败:", error);
  }
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
  saveLogsToStorage();
  emit("clear-logs");
  emit("update-logs", requestLogs.value);
};

// 导出记录
const exportLogs = () => {
  const data = {
    requestLogs: requestLogs.value,
    exportTime: new Date().toISOString(),
    totalCount: requestLogs.value.length,
    successCount: successCount.value,
    errorCount: errorCount.value,
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

onMounted(() => {
  console.log("RequestLogger组件已挂载");
  loadLogsFromStorage();
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
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
      }

      .control-actions {
        display: flex;
        gap: 12px;
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
    padding: 16px;

    .request-item {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: #1890ff;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
      }

      &.success {
        border-left: 3px solid #52c41a;
      }

      &.error {
        border-left: 3px solid #ff4d4f;
      }

      &.expanded {
        border-color: #1890ff;
      }

      .request-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;

        .request-method {
          background: #1890ff;
          color: #fff;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 500;
        }

        .request-status {
          font-size: 12px;
          font-weight: 500;

          &.status-success {
            color: #52c41a;
          }

          &.status-redirect {
            color: #faad14;
          }

          &.status-client-error,
          &.status-server-error {
            color: #ff4d4f;
          }

          &.status-unknown {
            color: #666;
          }
        }

        .request-time {
          font-size: 12px;
          color: #666;
        }

        .request-duration {
          font-size: 12px;
          color: #666;
        }

        .expand-icon {
          margin-left: auto;
          color: #666;
        }
      }

      .request-url {
        padding: 0 12px 12px 12px;
        font-size: 13px;
        color: #333;
        word-break: break-all;
      }

      .request-details {
        border-top: 1px solid #f0f0f0;
        padding: 12px;

        .detail-section {
          margin-bottom: 16px;

          h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #333;
            font-weight: 500;
          }

          .headers-content,
          .body-content {
            background: #f5f5f5;
            padding: 8px;
            border-radius: 3px;
            font-size: 12px;
            font-family: "Courier New", monospace;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 200px;
            overflow: auto;
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
