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
        网络拦截
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
            @toggle-enabled="toggleEnabled"
          />
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
import { RequestRule, ChromeMessage, RequestLog } from "./types";
import RequestInterceptor from "./components/RequestInterceptor.vue";
import RequestLogger from "./components/RequestLogger.vue";

// 响应式数据
const activeTab = ref("request-log");
const requestRules = ref<RequestRule[]>([]);
const requestLogs = ref<RequestLog[]>([]);

// 组件挂载时
onMounted(() => {
  // 从存储中加载规则
  // loadRules();
});

// 加载规则
const loadRules = () => {
  try {
    chrome.runtime.sendMessage(
      { type: "GET_RULES" } as ChromeMessage,
      (response) => {
        if (response && response.rules) {
          console.log("成功加载规则，数量:", response.rules.length);
          requestRules.value = response.rules;
        } else {
          console.log("未获取到规则数据，初始化空数组");
          requestRules.value = [];
        }
      }
    );
  } catch (error) {
    console.error("无法加载规则:", error);
    requestRules.value = [];
  }
};

// 更新规则
const updateRules = (rules: RequestRule[]) => {
  requestRules.value = rules;
  try {
    chrome.runtime.sendMessage({
      type: "UPDATE_RULES",
      data: { rules },
    } as ChromeMessage);
  } catch (error) {
    console.debug("无法更新规则:", error);
  }
};

// 添加规则
const addRule = (rule: RequestRule) => {
  const newRules = [...requestRules.value, rule];
  updateRules(newRules);
};

// 删除规则
const deleteRule = (ruleId: string) => {
  const newRules = requestRules.value?.filter((rule) => rule.id !== ruleId);
  updateRules(newRules);
};

// 切换启用状态
const toggleEnabled = (enabled: boolean) => {
  try {
    chrome.runtime.sendMessage({
      type: "TOGGLE_ENABLED",
      data: { enabled },
    } as ChromeMessage);
  } catch (error) {
    console.debug("无法切换启用状态:", error);
  }
};
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
