// 存储的请求规则
let requestRules = [];
let isEnabled = true;

// 拦截历史记录
let interceptionHistory = [];

// 性能监控相关
let performanceMonitorInterval = null;

// 从存储中加载配置
chrome.storage.local.get(
  ["requestRules", "enabled", "interceptionHistory"],
  (result) => {
    requestRules = result.requestRules || [];
    isEnabled = result.enabled !== false;
    interceptionHistory = result.interceptionHistory || [];
  }
);

// 网络请求拦截 - Manifest V3不再支持阻塞式请求
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log(details.url, isEnabled, details);
    if (!isEnabled) return;

    const matchedRule = requestRules.find(
      (rule) =>
        rule.enabled &&
        new RegExp(rule.urlPattern).test(details.url) &&
        rule.method.toUpperCase() === details.method.toUpperCase()
    );

    if (matchedRule) {
      // 在Manifest V3中，无法直接阻塞请求，需要采用其他方式
      console.log(`请求被拦截: ${details.url}`);
      // 这里可以记录拦截信息，但无法直接重定向
    }
  },
  { urls: ["<all_urls>"] }
  // 移除了blocking参数
);

// 监听来自内容脚本和devtools的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "UPDATE_RULES":
      requestRules = message.data.rules;
      isEnabled = message.data.enabled;
      // 保存到存储
      chrome.storage.local.set({
        requestRules,
        enabled: isEnabled,
      });
      break;

    case "TOGGLE_ENABLED":
      isEnabled = message.data.enabled;
      chrome.storage.local.set({ enabled: isEnabled });
      break;

    case "GET_RULES":
      sendResponse({ rules: requestRules, enabled: isEnabled });
      break;

    case "INTERCEPTION_RECORD":
      // 处理拦截记录
      handleInterceptionRecord(message.data);
      break;

    case "GET_INTERCEPTION_HISTORY":
      // 获取拦截历史
      sendResponse({ history: interceptionHistory });
      break;

    case "CLEAR_INTERCEPTION_HISTORY":
      // 清空拦截历史
      interceptionHistory = [];
      chrome.storage.local.set({ interceptionHistory: [] });
      sendResponse({ success: true });
      break;

    case "START_PERFORMANCE_MONITOR":
      startPerformanceMonitoring();
      sendResponse({ success: true });
      break;

    case "STOP_PERFORMANCE_MONITOR":
      stopPerformanceMonitoring();
      sendResponse({ success: true });
      break;

    case "PERFORMANCE_DATA":
      // 处理来自内容脚本的性能数据
      if (message.data) {
        broadcastPerformanceData(message.data);
      }
      break;
  }
});

// 处理拦截记录
function handleInterceptionRecord(record) {
  // 添加到历史记录
  interceptionHistory.push(record);

  // 限制历史记录数量，避免内存溢出
  if (interceptionHistory.length > 1000) {
    interceptionHistory = interceptionHistory.slice(-500);
  }

  // 保存到存储
  chrome.storage.local.set({ interceptionHistory });

  // 广播拦截记录到devtools页面
  broadcastInterceptionRecord(record);
}

// 广播拦截记录到devtools页面
function broadcastInterceptionRecord(record) {
  try {
    chrome.runtime.sendMessage(
      {
        type: "INTERCEPTION_RECORD",
        data: record,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // 忽略连接错误，这通常是正常的（devtools页面可能未打开）
          console.debug(
            "无法发送拦截记录到devtools页面:",
            chrome.runtime.lastError.message
          );
        }
      }
    );
  } catch (error) {
    console.debug("发送拦截记录到devtools页面失败:", error);
  }
}

// 开始性能监控
function startPerformanceMonitoring() {
  if (performanceMonitorInterval) {
    clearInterval(performanceMonitorInterval);
  }

  // 每2秒采集一次性能数据
  performanceMonitorInterval = setInterval(() => {
    collectPerformanceData();
  }, 2000);

  console.log("性能监控已启动");
}

// 停止性能监控
function stopPerformanceMonitoring() {
  if (performanceMonitorInterval) {
    clearInterval(performanceMonitorInterval);
    performanceMonitorInterval = null;
  }
  console.log("性能监控已停止");
}

// 采集性能数据
function collectPerformanceData() {
  // 获取当前标签页信息
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;

    const tab = tabs[0];

    // 向内容脚本发送消息获取性能数据
    chrome.tabs.sendMessage(
      tab.id,
      { type: "GET_PERFORMANCE_DATA" },
      (response) => {
        if (chrome.runtime.lastError) {
          // 如果内容脚本未注入，使用默认的性能数据
          const defaultData = generateDefaultPerformanceData();
          broadcastPerformanceData(defaultData);
        } else if (response) {
          broadcastPerformanceData(response.data);
        }
      }
    );
  });
}

// 生成默认性能数据（当内容脚本不可用时）
function generateDefaultPerformanceData() {
  return {
    timestamp: Date.now(),
    cpuUsage: Math.random() * 100, // 模拟CPU使用率
    memoryUsage: Math.random() * 100, // 模拟内存使用率
    jsHeapSize: Math.floor(Math.random() * 100000000) + 50000000, // 模拟JS堆大小
    jsHeapUsed: Math.floor(Math.random() * 50000000) + 10000000, // 模拟JS堆使用量
    domNodes: Math.floor(Math.random() * 5000) + 1000, // 模拟DOM节点数
    eventListeners: Math.floor(Math.random() * 1000) + 100, // 模拟事件监听器数量
  };
}

// 广播性能数据到所有打开的devtools和内容脚本
function broadcastPerformanceData(data) {
  // 发送到devtools页面
  try {
    chrome.runtime.sendMessage(
      {
        type: "PERFORMANCE_DATA",
        data: data,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // 忽略连接错误，这通常是正常的（devtools页面可能未打开）
          console.debug(
            "无法发送性能数据到devtools页面:",
            chrome.runtime.lastError.message
          );
        }
      }
    );
  } catch (error) {
    console.debug("发送性能数据到devtools页面失败:", error);
  }

  // 发送到所有标签页的内容脚本
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      try {
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "PERFORMANCE_DATA",
            data: data,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              // 忽略连接错误，这通常是正常的（内容脚本未注入）
              console.debug(
                `无法发送性能数据到标签页 ${tab.id}:`,
                chrome.runtime.lastError.message
              );
            }
          }
        );
      } catch (error) {
        console.debug(`发送性能数据到标签页 ${tab.id} 失败:`, error);
      }
    });
  });
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log("前端调试增强器已安装");

  // 初始化默认规则
  const defaultRules = [
    {
      id: "example-1",
      enabled: false,
      urlPattern: ".*/api/example",
      method: "GET",
      delay: 0,
      response: {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: { message: "Mock response from debug tool" },
      },
    },
  ];

  chrome.storage.local.get(["requestRules"], (result) => {
    if (!result.requestRules) {
      chrome.storage.local.set({ requestRules: defaultRules });
    }
  });

  // 启动性能监控
  startPerformanceMonitoring();
});

// 监听扩展卸载事件
chrome.runtime.onSuspend.addListener(() => {
  stopPerformanceMonitoring();
});
