<template>
  <div class="debug-tool">
    <!-- 选项卡头部 -->
    <div class="tab-header">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'request-log' }"
        @click="activeTab = 'request-log'"
      >
        请求记录
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'network' }"
        @click="activeTab = 'network'"
      >
        请求拦截
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 网络调试面板 -->
      <div class="panel" v-show="activeTab === 'network'">
        <div class="panel-content">
          <RequestInterceptor />
        </div>
      </div>

      <!-- 网络请求记录面板 -->
      <div class="panel" v-show="activeTab === 'request-log'">
        <div class="panel-content">
          <RequestLogger />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import RequestInterceptor from "./components/RequestInterceptor.vue";
import RequestLogger from "./components/RequestLogger.vue";

// 响应式数据
const activeTab = ref("network");
</script>

<style lang="less" scoped>
.debug-tool {
  height: 100vh;
  display: flex;
  flex-direction: row;
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
    background: #fff;
    border-right: 1px solid #e8e8e8;

    .tab-item {
      writing-mode: vertical-rl;
      padding: 12px 8px;
      cursor: pointer;
      border-right: 2px solid transparent;
      transition: all 0.3s;
      font-size: 14px;
      color: #666;

      &:hover {
        color: #1890ff;
      }

      &.active {
        color: #1890ff;
        border-right: 2px solid #1890ff;
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
        padding: 4px;
        height: 100%;
        overflow: auto;
      }
    }
  }
}
</style>
