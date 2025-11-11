// 存储的请求规则
let requestRules = [];
let isEnabled = true;

// 拦截历史记录
let interceptionHistory = [];

// 从存储中加载配置
chrome.storage.local.get(["requestRules", "enabled"], (result) => {
  requestRules = result.requestRules || [];
  isEnabled = result.enabled !== false;
});

// 监听declarativeNetRequest规则匹配事件（用于记录拦截历史）
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((details) => {
  // 只记录我们自己的动态规则（ID从1000开始）
  if (details.rule.ruleId >= 1000) {
    const ruleIndex = details.rule.ruleId - 1000;
    const matchedRule = requestRules[ruleIndex];

    if (matchedRule && matchedRule.enabled) {
      const record = {
        id: details.rule.ruleId,
        timestamp: Date.now(),
        url: details.request.url,
        method: details.request.method,
        ruleId: matchedRule.id,
        matchedRule: matchedRule.urlPattern,
        responseStatus: matchedRule.response.status,
        delay: matchedRule.delay,
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
  // 过滤URL模式中的非ASCII字符，确保urlFilter只包含ASCII字符
  let cleanUrlPattern = rule.urlPattern.replace(/[^\x00-\x7F]/g, "");

  // 如果过滤后为空，使用默认的通配符模式
  if (!cleanUrlPattern.trim()) {
    cleanUrlPattern = ".*";
    console.warn(
      `规则ID ${ruleId} 的URL模式过滤后为空，已使用默认通配符模式: "${rule.urlPattern}" -> "${cleanUrlPattern}"`
    );
  } else if (cleanUrlPattern !== rule.urlPattern) {
    console.warn(
      `规则ID ${ruleId} 的URL模式包含非ASCII字符，已自动过滤: "${rule.urlPattern}" -> "${cleanUrlPattern}"`
    );
  }

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
      urlFilter: cleanUrlPattern,
      resourceTypes: ["xmlhttprequest"],
      requestMethods: [rule.method.toLowerCase()],
    },
  };
}

// 更新declarativeNetRequest规则
async function updateDNRRules() {
  try {
    if (!isEnabled) {
      // 如果禁用，移除所有动态规则
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: requestRules.map((rule, index) => index + 1000),
      });
      console.log("已禁用所有declarativeNetRequest规则");
      return;
    }

    const enabledRules = requestRules.filter((rule) => rule.enabled);

    // 过滤掉URL模式为空的规则
    const validRules = enabledRules.filter((rule) => {
      if (!rule.urlPattern || !rule.urlPattern.trim()) {
        console.warn(`规则ID ${rule.id} 的URL模式为空，已跳过`);
        return false;
      }
      return true;
    });

    const dnrRules = validRules.map((rule, index) =>
      convertToDNRRule(rule, index + 1000)
    );

    console.log("正在更新declarativeNetRequest规则:", {
      totalRules: requestRules.length,
      enabledRules: enabledRules.length,
      dnrRules: dnrRules.map((rule) => ({
        id: rule.id,
        urlFilter: rule.condition.urlFilter,
        method: rule.condition.requestMethods?.[0],
      })),
    });

    // 先移除旧规则，再添加新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: requestRules.map((rule, index) => index + 1000),
      addRules: dnrRules,
    });

    console.log(`已成功更新 ${dnrRules.length} 条declarativeNetRequest规则`);
  } catch (error) {
    console.error("更新declarativeNetRequest规则时发生错误:", error);

    // 尝试获取更详细的错误信息
    if (error.message && error.message.includes("urlFilter")) {
      console.error("URL过滤器错误详情:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

// 监听来自内容脚本和devtools的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "UPDATE_RULES":
      // 清理规则中的非ASCII字符
      const cleanedRules = cleanRules(message.data.rules);

      // 如果规则被清理过，记录日志
      if (JSON.stringify(cleanedRules) !== JSON.stringify(message.data.rules)) {
        console.warn("检测到规则包含非ASCII字符，已自动清理");
      }

      requestRules = cleanedRules;
      isEnabled = message.data.enabled;
      // 保存到存储
      chrome.storage.local.set({
        requestRules,
        enabled: isEnabled,
      });
      // 更新declarativeNetRequest规则
      updateDNRRules();
      break;

    case "UPDATE_GROUPS":
      // 保存分组数据
      console.log("保存分组数据:", message.data.groups);
      chrome.storage.local.set({
        ruleGroups: message.data.groups,
      });
      sendResponse({ success: true });
      break;

    case "GET_GROUPS":
      // 获取分组数据
      chrome.storage.local.get(["ruleGroups"], (result) => {
        sendResponse({ groups: result.ruleGroups || [] });
      });
      return true; // 保持消息通道开放

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

// 清理规则中的非ASCII字符
function cleanRules(rules) {
  return rules.map((rule) => {
    if (rule.urlPattern && /[^\x00-\x7F]/.test(rule.urlPattern)) {
      const originalPattern = rule.urlPattern;
      let cleanedPattern = rule.urlPattern.replace(/[^\x00-\x7F]/g, "");

      // 如果过滤后为空，使用默认的通配符模式
      if (!cleanedPattern.trim()) {
        cleanedPattern = ".*";
        console.warn(
          `清理规则ID ${rule.id} 的URL模式过滤后为空，已使用默认通配符模式: "${originalPattern}" -> "${cleanedPattern}"`
        );
      } else {
        console.warn(
          `清理规则ID ${rule.id} 的URL模式: "${originalPattern}" -> "${cleanedPattern}"`
        );
      }

      return {
        ...rule,
        urlPattern: cleanedPattern,
      };
    }
    return rule;
  });
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

  // 初始化默认分组
  const defaultGroups = [
    {
      id: "default_group",
      name: "默认分组",
      enabled: true,
      expanded: true,
      order: 0,
    },
  ];

  chrome.storage.local.get(
    ["requestRules", "enabled", "ruleGroups"],
    (result) => {
      if (!result.requestRules) {
        chrome.storage.local.set({
          requestRules: defaultRules,
          enabled: true,
          ruleGroups: defaultGroups,
        });
        requestRules = defaultRules;
        isEnabled = true;
        // 更新declarativeNetRequest规则
        updateDNRRules();
      } else {
        // 清理现有规则中的非ASCII字符
        const cleanedRules = cleanRules(result.requestRules);

        // 如果规则被清理过，保存清理后的版本
        if (
          JSON.stringify(cleanedRules) !== JSON.stringify(result.requestRules)
        ) {
          chrome.storage.local.set({
            requestRules: cleanedRules,
            enabled: result.enabled !== false,
            ruleGroups: result.ruleGroups || [],
          });
          console.log("已自动清理规则中的非ASCII字符");
        }

        requestRules = cleanedRules;
        isEnabled = result.enabled !== false;
        // 更新declarativeNetRequest规则
        updateDNRRules();
      }
    }
  );
});

// 网络请求记录功能已移到RequestLogger.vue组件内部
// 因为chrome.devtools.network.onRequestFinished需要在DevTools上下文中运行
