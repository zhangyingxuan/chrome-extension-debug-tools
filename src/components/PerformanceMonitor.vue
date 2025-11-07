<template>
  <div class="performance-monitor">
    <!-- 性能指标概览 -->
    <div class="metrics-overview">
      <div class="metric-card">
        <div class="metric-value">{{ currentCPU.toFixed(2) }}%</div>
        <div class="metric-label">当前CPU</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{{ currentMemory.toFixed(2) }}%</div>
        <div class="metric-label">内存使用率</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{{ currentDomNodes }}</div>
        <div class="metric-label">DOM节点</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{{ currentEventListeners }}</div>
        <div class="metric-label">事件监听器</div>
      </div>
    </div>

    <!-- 实时性能图表 -->
    <div class="charts-section">
      <div class="chart-container">
        <h4>CPU使用率</h4>
        <div ref="cpuChart" class="chart"></div>
      </div>

      <div class="chart-container">
        <h4>内存使用率</h4>
        <div ref="memoryChart" class="chart"></div>
      </div>

      <div class="chart-container">
        <h4>DOM节点数</h4>
        <div ref="domChart" class="chart"></div>
      </div>

      <div class="chart-container">
        <h4>事件监听器</h4>
        <div ref="eventChart" class="chart"></div>
      </div>
    </div>
    <!-- 进程/线程信息 -->
    <div class="process-section">
      <h4>进程信息</h4>
      <div class="process-list">
        <div
          v-for="process in props.processInfo"
          :key="process.pid"
          class="process-item"
        >
          <div class="process-name">{{ process.name }}</div>
          <div class="process-stats">
            <span class="cpu">CPU: {{ process.cpu.toFixed(1) }}%</span>
            <span class="memory">内存: {{ formatMemory(process.memory) }}</span>
            <span class="type">{{ process.type }}</span>
          </div>
        </div>

        <div v-if="props.processInfo.length === 0" class="empty-state">
          暂无进程信息
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
import { PerformanceData, ProcessInfo } from "../types";

interface Props {
  performanceData: PerformanceData[];
  processInfo: ProcessInfo[];
}

const props = defineProps<Props>();

// 图表引用
const cpuChart = ref<HTMLElement>();
const memoryChart = ref<HTMLElement>();
const domChart = ref<HTMLElement>();
const eventChart = ref<HTMLElement>();

// ECharts实例
let cpuChartInstance: echarts.ECharts | null = null;
let memoryChartInstance: echarts.ECharts | null = null;
let domChartInstance: echarts.ECharts | null = null;
let eventChartInstance: echarts.ECharts | null = null;

// 当前性能指标
const currentCPU = ref(0);
const currentMemory = ref(0);
const currentDomNodes = ref(0);
const currentEventListeners = ref(0);

// 格式化内存大小
const formatMemory = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// 初始化图表
const initCharts = () => {
  if (
    !cpuChart.value ||
    !memoryChart.value ||
    !domChart.value ||
    !eventChart.value
  )
    return;

  // CPU使用率图表
  cpuChartInstance = echarts.init(cpuChart.value);
  cpuChartInstance.setOption({
    title: { text: "", show: false },
    tooltip: { trigger: "axis" },
    xAxis: { type: "time" },
    yAxis: { type: "value", min: 0, max: 100 },
    series: [
      {
        name: "CPU使用率",
        type: "line",
        smooth: true,
        data: [],
      },
    ],
  });

  // 内存使用率图表
  memoryChartInstance = echarts.init(memoryChart.value);
  memoryChartInstance.setOption({
    title: { text: "", show: false },
    tooltip: { trigger: "axis" },
    xAxis: { type: "time" },
    yAxis: { type: "value", min: 0, max: 100 },
    series: [
      {
        name: "内存使用率",
        type: "line",
        smooth: true,
        data: [],
      },
    ],
  });

  // DOM节点数图表
  domChartInstance = echarts.init(domChart.value);
  domChartInstance.setOption({
    title: { text: "", show: false },
    tooltip: { trigger: "axis" },
    xAxis: { type: "time" },
    yAxis: { type: "value" },
    series: [
      {
        name: "DOM节点数",
        type: "line",
        smooth: true,
        data: [],
      },
    ],
  });

  // 事件监听器图表
  eventChartInstance = echarts.init(eventChart.value);
  eventChartInstance.setOption({
    title: { text: "", show: false },
    tooltip: { trigger: "axis" },
    xAxis: { type: "time" },
    yAxis: { type: "value" },
    series: [
      {
        name: "事件监听器",
        type: "line",
        smooth: true,
        data: [],
      },
    ],
  });
};

// 更新图表数据
const updateCharts = () => {
  if (!props.performanceData.length) return;

  const data = props.performanceData;
  const latestData = data[data.length - 1];

  // 更新当前指标
  currentCPU.value = latestData.cpuUsage;
  currentMemory.value = latestData.memoryUsage;
  currentDomNodes.value = latestData.domNodes;
  currentEventListeners.value = latestData.eventListeners;

  // 更新图表数据
  const cpuData = data.map((d) => [d.timestamp, d.cpuUsage]);
  const memoryData = data.map((d) => [d.timestamp, d.memoryUsage]);
  const domData = data.map((d) => [d.timestamp, d.domNodes]);
  const eventData = data.map((d) => [d.timestamp, d.eventListeners]);

  cpuChartInstance?.setOption({
    series: [{ data: cpuData }],
  });

  memoryChartInstance?.setOption({
    series: [{ data: memoryData }],
  });

  domChartInstance?.setOption({
    series: [{ data: domData }],
  });

  eventChartInstance?.setOption({
    series: [{ data: eventData }],
  });
};

// 监听性能数据变化
watch(
  () => props.performanceData,
  () => {
    updateCharts();
  },
  { deep: true }
);

// 组件挂载时
onMounted(() => {
  nextTick(() => {
    initCharts();
    updateCharts();
  });

  // 窗口大小变化时重绘图表
  window.addEventListener("resize", handleResize);
});

// 组件卸载时
onUnmounted(() => {
  cpuChartInstance?.dispose();
  memoryChartInstance?.dispose();
  domChartInstance?.dispose();
  eventChartInstance?.dispose();
  window.removeEventListener("resize", handleResize);
});

// 处理窗口大小变化
const handleResize = () => {
  cpuChartInstance?.resize();
  memoryChartInstance?.resize();
  domChartInstance?.resize();
  eventChartInstance?.resize();
};
</script>

<style lang="less" scoped>
.performance-monitor {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .charts-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    flex: 1;

    .chart-container {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }

      .chart {
        height: 160px;
        width: 100%;
      }
    }
  }

  .metrics-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;

    .metric-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      .metric-value {
        font-size: 18px;
        font-weight: bold;
        color: #1890ff;
      }

      .metric-label {
        font-size: 12px;
        color: #666;
        margin-top: 6px;
      }
    }
  }

  .process-section {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .process-list {
      .process-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .process-name {
          font-weight: 500;
          font-size: 13px;
          color: #333;
        }

        .process-stats {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #666;

          .cpu {
            color: #f56c6c;
            font-weight: 500;
          }
          .memory {
            color: #409eff;
            font-weight: 500;
          }
          .type {
            background: #e8f4ff;
            color: #409eff;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 18px;
        color: #999;
        font-size: 12px;
      }
    }
  }
}
</style>
