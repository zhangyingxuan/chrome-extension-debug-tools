<template>
  <div class="debug-tool">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <h3>前端调试增强器</h3>
      <div class="toolbar-controls">
        <t-switch
          v-model="isEnabled"
          :label="['启用', '禁用']"
          @change="toggleEnabled"
        />
        <t-button theme="primary" @click="exportData">导出数据</t-button>
        <t-button
          :theme="isMonitoring ? 'danger' : 'primary'"
          @click="togglePerformanceMonitoring"
        >
          {{ isMonitoring ? "停止监控" : "开始监控" }}
        </t-button>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-header">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'network' }"
        @click="activeTab = 'network'"
      >
        网络请求拦截
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'performance' }"
        @click="activeTab = 'performance'"
      >
        性能监控
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 网络调试面板 -->
      <div class="panel" v-show="activeTab === 'network'">
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
      <div class="panel" v-show="activeTab === 'performance'">
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
const isMonitoring = ref(false);
const activeTab = ref<"network" | "performance">("network");
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
    // 添加新的性能数据
    performanceData.value.push(message.data);

    // 只保留最近100条数据，避免内存溢出
    if (performanceData.value.length > 100) {
      performanceData.value = performanceData.value.slice(-100);
    }

    // 更新进程信息（模拟数据）
    updateProcessInfo(message.data);
  }
};

// 更新进程信息
const updateProcessInfo = (performanceData: PerformanceData) => {
  // 模拟进程信息数据
  processInfo.value = [
    {
      pid: 1,
      name: "主进程",
      cpu: performanceData.cpuUsage * 0.8,
      memory: performanceData.jsHeapUsed,
      type: "main",
    },
    {
      pid: 2,
      name: "渲染进程",
      cpu: performanceData.cpuUsage * 0.2,
      memory: performanceData.jsHeapUsed * 0.5,
      type: "renderer",
    },
    {
      pid: 3,
      name: "网络进程",
      cpu: Math.random() * 10,
      memory: Math.random() * 1000000,
      type: "worker",
    },
  ];
};

// 组件挂载时
onMounted(() => {
  // 添加消息监听器
  chrome.runtime.onMessage.addListener(messageListener);

  // 从存储中加载规则
  loadRules();

  // 自动启动性能监控
  startPerformanceMonitoring();
});

// 组件卸载时
onUnmounted(() => {
  chrome.runtime.onMessage.removeListener(messageListener);
  stopPerformanceMonitoring();
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
  chrome.runtime.sendMessage(
    { type: "START_PERFORMANCE_MONITOR" } as ChromeMessage,
    (response) => {
      if (response && response.success) {
        isMonitoring.value = true;
        console.log("性能监控已启动");
      }
    }
  );
};

// 停止性能监控
const stopPerformanceMonitoring = () => {
  chrome.runtime.sendMessage(
    { type: "STOP_PERFORMANCE_MONITOR" } as ChromeMessage,
    (response) => {
      if (response && response.success) {
        isMonitoring.value = false;
        console.log("性能监控已停止");
      }
    }
  );
};

// 切换性能监控状态
const togglePerformanceMonitoring = () => {
  if (isMonitoring.value) {
    stopPerformanceMonitoring();
  } else {
    startPerformanceMonitoring();
  }
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
    padding: 8px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .toolbar-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  }

  .tab-header {
    display: flex;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;

    .tab-item {
      padding: 12px 24px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;
      font-size: 14px;
      color: #666;

      &:hover {
        color: #1890ff;
      }

      &.active {
        color: #1890ff;
        border-bottom-color: #1890ff;
        font-weight: 500;
      }
    }
  }

  .main-content {
    flex: 1;
    padding: 0;
    overflow: auto;

    .panel {
      background: #fff;
      height: 100%;
      overflow: hidden;

      .panel-content {
        padding: 16px;
        height: calc(100vh - 160px);
        overflow: auto;
      }
    }
  }
}
</style>
