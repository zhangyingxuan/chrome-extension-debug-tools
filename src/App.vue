<template>
  <div class="debug-tool">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <h1>前端调试增强器</h1>
      <div class="toolbar-controls">
        <t-switch
          v-model="isEnabled"
          :label="['启用', '禁用']"
          @change="toggleEnabled"
        />
        <t-button theme="primary" @click="exportData">导出数据</t-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 网络调试面板 -->
      <div class="panel">
        <h2>网络请求拦截</h2>
        <div class="panel-content">
          <RequestInterceptor
            :rules="requestRules"
            @update-rules="updateRules"
            @add-rule="addRule"
            @delete-rule="deleteRule"
          />
        </div>
      </div>

      <!-- 性能监控面板 -->
      <div class="panel">
        <h2>性能监控</h2>
        <div class="panel-content">
          <PerformanceMonitor
            :performance-data="performanceData"
            :process-info="processInfo"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  RequestRule,
  PerformanceData,
  ProcessInfo,
  ChromeMessage,
} from "./types";
import RequestInterceptor from "./components/RequestInterceptor.vue";
import PerformanceMonitor from "./components/PerformanceMonitor.vue";

// 响应式数据
const isEnabled = ref(true);
const requestRules = ref<RequestRule[]>([]);
const performanceData = ref<PerformanceData[]>([]);
const processInfo = ref<ProcessInfo[]>([]);

// 监听来自背景脚本的消息
const messageListener = (
  message: ChromeMessage,
  sender: any,
  sendResponse: any
) => {
  if (message.type === "PERFORMANCE_DATA") {
    performanceData.value.push(message.data);
    // 只保留最近50条数据
    if (performanceData.value.length > 50) {
      performanceData.value = performanceData.value.slice(-50);
    }
  }
};

// 组件挂载时
onMounted(() => {
  // 添加消息监听器
  chrome.runtime.onMessage.addListener(messageListener);

  // 从存储中加载规则
  loadRules();

  // 开始性能监控
  startPerformanceMonitoring();
});

// 组件卸载时
onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(messageListener);
});

// 加载规则
const loadRules = () => {
  chrome.runtime.sendMessage(
    { type: "GET_RULES" } as ChromeMessage,
    (response) => {
      if (response) {
        requestRules.value = response.rules;
        isEnabled.value = response.enabled;
      }
    }
  );
};

// 更新规则
const updateRules = (rules: RequestRule[]) => {
  requestRules.value = rules;
  chrome.runtime.sendMessage({
    type: "UPDATE_RULES",
    data: { rules, enabled: isEnabled.value },
  } as ChromeMessage);
};

// 添加规则
const addRule = (rule: RequestRule) => {
  const newRules = [...requestRules.value, rule];
  updateRules(newRules);
};

// 删除规则
const deleteRule = (ruleId: string) => {
  const newRules = requestRules.value.filter((rule) => rule.id !== ruleId);
  updateRules(newRules);
};

// 切换启用状态
const toggleEnabled = (enabled: boolean) => {
  isEnabled.value = enabled;
  chrome.runtime.sendMessage({
    type: "TOGGLE_ENABLED",
    data: { enabled },
  } as ChromeMessage);
};

// 开始性能监控
const startPerformanceMonitoring = () => {
  // 这里可以添加更复杂的性能监控逻辑
  console.log("开始性能监控");
};

// 导出数据
const exportData = () => {
  const data = {
    requestRules: requestRules.value,
    performanceData: performanceData.value,
    exportTime: new Date().toISOString(),
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
</script>

<style lang="less" scoped>
.debug-tool {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;

  .toolbar {
    background: #fff;
    padding: 16px 24px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h1 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }

    .toolbar-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  }

  .main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 16px;
    overflow: auto;

    .panel {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;

      h2 {
        margin: 0;
        padding: 16px 24px;
        background: #fafafa;
        border-bottom: 1px solid #e8e8e8;
        font-size: 16px;
        color: #333;
      }

      .panel-content {
        padding: 16px;
        height: 400px;
        overflow: auto;
      }
    }
  }
}
</style>
