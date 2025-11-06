// 存储的请求规则
let requestRules = [];
let isEnabled = true;

// 从存储中加载配置
chrome.storage.local.get(["requestRules", "enabled"], (result) => {
  requestRules = result.requestRules || [];
  isEnabled = result.enabled !== false;
});

// 网络请求拦截 - Manifest V3不再支持阻塞式请求
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
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
  }
});

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
});
