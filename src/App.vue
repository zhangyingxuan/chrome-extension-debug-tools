<template>
  <div class="debug-tool">
    <!-- 选项卡头部 -->
    <div class="tab-header">
      <div class="tabs-container">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'request-log' }"
          @click="activeTab = 'request-log'"
        >
          {{ $t("tabRequestLog") }}
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'script-interceptor' }"
          @click="activeTab = 'script-interceptor'"
        >
          {{ $t("tabScriptInterceptor") }}
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'request-interceptor' }"
          @click="activeTab = 'request-interceptor'"
        >
          {{ $t("tabRequestInterceptor") }}
        </div>
      </div>

      <!-- 语言切换 -->
      <div class="language-switch">
        <t-dropdown
          :options="LOCALE_OPTIONS"
          @click="handleLocaleChange"
          trigger="click"
          placement="right-bottom"
        >
          <div class="tab-item language-btn">
            <TranslateIcon size="20" />
          </div>
        </t-dropdown>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 网络请求记录面板 -->
      <div class="panel" v-show="activeTab === 'request-log'">
        <div class="panel-content">
          <RequestLogger @open-rule-editor="handleOpenRuleEditor" />
        </div>
      </div>

      <!-- 脚本拦截面板 -->
      <div class="panel" v-show="activeTab === 'script-interceptor'">
        <div class="panel-content">
          <ScriptInterceptor ref="scriptInterceptorRef" />
        </div>
      </div>
      <!-- 网络调试面板 -->
      <div class="panel" v-show="activeTab === 'request-interceptor'">
        <div class="panel-content">
          <DeclarativeNetInterceptor ref="requestInterceptorRef" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { TranslateIcon } from "tdesign-icons-vue-next";
import DeclarativeNetInterceptor from "./components/DeclarativeNetInterceptor.vue";
import ScriptInterceptor from "./components/ScriptInterceptor.vue";
import RequestLogger from "./components/RequestLogger.vue";
import { LOCALE_OPTIONS, setLocale } from "@/utils/i18n";

// 响应式数据
const activeTab = ref("request-log");
const requestInterceptorRef =
  ref<InstanceType<typeof DeclarativeNetInterceptor>>();
const scriptInterceptorRef = ref<InstanceType<typeof ScriptInterceptor>>();

// 处理语言切换
const handleLocaleChange = (data: any) => {
  setLocale(data.value);
};

// 处理打开规则编辑器事件
const handleOpenRuleEditor = (ruleData: any) => {
  // 根据拦截类型选择标签页
  const interceptorType = ruleData.interceptorType || "request-log";
  activeTab.value = interceptorType;

  // 延迟执行，确保组件已加载
  setTimeout(() => {
    if (
      interceptorType === "request-interceptor" &&
      requestInterceptorRef.value
    ) {
      // 调用RequestInterceptor的方法
      requestInterceptorRef.value.handleQuickAddRule(ruleData);
    } else if (
      interceptorType === "script-interceptor" &&
      scriptInterceptorRef.value
    ) {
      // 调用ScriptInterceptor的方法
      scriptInterceptorRef.value.handleQuickAddRule(ruleData);
    }
  }, 100);
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
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 8px;

    .tabs-container {
      display: flex;
      flex-direction: column;
    }

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

    .language-switch {
      display: flex;
      justify-content: center;

      .language-btn {
        writing-mode: horizontal-tb;
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: none;

        &:hover {
          color: #1890ff;
        }
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
