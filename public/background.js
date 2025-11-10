// 存储的请求规则
let requestRules = [];
let isEnabled = true;

// 拦截历史记录
let interceptionHistory = [];

// 从存储中加载配置
chrome.storage.local.get(
  ["requestRules", "enabled", "interceptionHistory"],
  (result) => {
    requestRules = result.requestRules || [];
    isEnabled = result.enabled !== false;
    interceptionHistory = result.interceptionHistory || [];
  }
);

// 监听declarativeNetRequest规则匹配事件（用于记录拦截历史）
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((details) => {
  // 只记录我们自己的动态规则（ID从1000开始）
  if (details.rule.ruleId >= 1000) {
    const ruleIndex = details.rule.ruleId - 1000;
    const matchedRule = requestRules[ruleIndex];

    if (matchedRule && matchedRule.enabled) {
      const record = {
        timestamp: Date.now(),
        url: details.request.url,
        method: details.request.method,
        ruleId: matchedRule.id,
        ruleName: matchedRule.name || `规则${matchedRule.id}`,
        response: matchedRule.response,
        tabId: details.request.tabId,
      };

      // 记录拦截历史
      handleInterceptionRecord(record);
      console.log(
        `请求被declarativeNetRequest拦截: ${
          details.request.url
        }；${JSON.stringify(details)}`
      );
    }
  }
});

// 将规则转换为declarativeNetRequest格式
function convertToDNRRule(rule, ruleId) {
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: `data:application/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(rule.response.body)
        )}`,
      },
    },
    condition: {
      urlFilter: rule.urlPattern,
      resourceTypes: ["xmlhttprequest"],
      requestMethods: [rule.method.toLowerCase()],
    },
  };
}

// 更新declarativeNetRequest规则
async function updateDNRRules() {
  if (!isEnabled) {
    // 如果禁用，移除所有动态规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: requestRules.map((rule, index) => index + 1000),
    });
    return;
  }

  const enabledRules = requestRules.filter((rule) => rule.enabled);
  const dnrRules = enabledRules.map((rule, index) =>
    convertToDNRRule(rule, index + 1000)
  );

  // 先移除旧规则，再添加新规则
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: requestRules.map((rule, index) => index + 1000),
    addRules: dnrRules,
  });

  console.log(`已更新 ${dnrRules.length} 条declarativeNetRequest规则`);
}

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
      // 更新declarativeNetRequest规则
      updateDNRRules();
      break;

    case "TOGGLE_ENABLED":
      isEnabled = message.data.enabled;
      chrome.storage.local.set({ enabled: isEnabled });
      // 更新declarativeNetRequest规则
      updateDNRRules();
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

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
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

  chrome.storage.local.get(["requestRules", "enabled"], (result) => {
    if (!result.requestRules) {
      chrome.storage.local.set({
        requestRules: defaultRules,
        enabled: true,
      });
      requestRules = defaultRules;
      isEnabled = true;
      // 更新declarativeNetRequest规则
      updateDNRRules();
    } else {
      requestRules = result.requestRules;
      isEnabled = result.enabled !== false;
      // 更新declarativeNetRequest规则
      updateDNRRules();
    }
  });
});
