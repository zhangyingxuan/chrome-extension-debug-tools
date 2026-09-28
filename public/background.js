// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  await syncDnrRules();
});

// 浏览器启动时确保 DNR 规则已安装（扩展重载/更新会清空 dynamic rules）
chrome.runtime.onStartup.addListener(async () => {
  await syncDnrRules();
});

// 监听存储变化：脚本规则变更通知所有标签页；请求拦截规则变更同步到 DNR
chrome.storage.onChanged.addListener((changes) => {
  if (changes.scriptRequestRules) {
    const newRules = changes.scriptRequestRules.newValue || [];
    // 向所有活动标签页发送规则更新消息
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url?.startsWith("chrome-extension://")) return; // 直接跳过
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              from: "blowsysun-debug-tools",
              action: "RULES_UPDATE",
              value: newRules,
            })
            .catch((error) => {
              if (error.message.includes("Receiving end does not exist")) {
                // 忽略内容脚本未注入的错误
              } else {
                console.error(`向标签页 ${tab.id} 发送规则更新失败:`, error);
              }
            });
        }
      });
    });
  }

  // 请求拦截（declarativeNetRequest）规则变更 → 由后台重装，与面板是否打开无关
  if (changes.requestRules || changes.requestRulesEnabled) {
    syncDnrRules();
  }
});

/**
 * 将面板缓存的请求拦截规则同步安装到 declarativeNetRequest。
 * 扩展重载/更新会清空 dynamic rules，仅面板展示是不够的，需在此重装。
 */
async function syncDnrRules() {
  try {
    const { requestRules = [], requestRulesEnabled = true } =
      await chrome.storage.local.get(["requestRules", "requestRulesEnabled"]);

    // 收集所有规则ID（含附加 header 规则）
    const allRuleIds = [];
    requestRules.forEach((rule) => {
      allRuleIds.push(rule.ruleId, rule.ruleId + 100000, rule.ruleId + 200000);
    });

    if (!requestRulesEnabled) {
      // 主开关关闭：清空全部 DNR 规则
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: allRuleIds,
        addRules: [],
      });
      return;
    }

    // 先清空旧规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: allRuleIds,
      addRules: [],
    });

    // 逐条安装：DNR 校验为 all-or-nothing，单条非法规则不拖垮全部
    const enabledRules = requestRules.filter((rule) => rule.enabled);
    let installed = 0;
    for (const rule of enabledRules) {
      // DNR 要求规则 id >= 1；跳过非法 ruleId（等面板 loadRules 修复）
      const rid = Number(rule.ruleId);
      if (!Number.isInteger(rid) || rid < 1) {
        console.warn(`[DNR][bg] 跳过非法 ruleId=${rule.ruleId} 的规则`, rule.name || rule.urlPattern);
        continue;
      }
      const converted = convertDnrRule(rule, rid);
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [],
          addRules: converted,
        });
        installed += converted.length;
      } catch (error) {
        console.error(
          `[DNR][bg] 跳过非法规则 ${rule.name || rule.ruleId}:`,
          error
        );
      }
    }
    console.log(`[DNR][bg] 同步完成: 安装 ${installed} 条规则`);
  } catch (error) {
    console.error("[DNR][bg] 同步失败:", error);
  }
}

/**
 * 与面板 DeclarativeNetInterceptor.dnrConverter.convert 保持一致的规则转换。
 * 主规则：redirect 到 data:application/json mock；可叠加请求/响应头修改规则。
 */
function convertDnrRule(rule, ruleId) {
  const condition = {
    urlFilter: rule.urlPattern,
    regexFilter: rule.urlPattern,
    // Chrome DNR ResourceType 无 fetch 类型(那是 Firefox)；页面 fetch()/XHR 均归 xmlhttprequest
    resourceTypes: ["xmlhttprequest"],
    requestMethods: [String(rule.method || "GET").toLowerCase()],
  };
  if (rule.filterType === "urlFilter") {
    delete condition.regexFilter;
  } else {
    delete condition.urlFilter;
  }

  const dnrRules = [];

  dnrRules.push({
    id: ruleId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: `data:application/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(rule.response?.body)
        )}`,
      },
    },
    condition,
  });

  if (
    rule.enableResponseHeaders &&
    rule.response?.headers &&
    Object.keys(rule.response.headers).length > 0
  ) {
    // DNR modifyHeaders 的 value 必须是字符串；对象等强转为字符串
    const responseHeaders = Object.entries(rule.response.headers).map(
      ([header, value]) => ({
        header,
        operation: "set",
        value: typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
      })
    );
    dnrRules.push({
      id: ruleId + 100000,
      priority: 1,
      action: { type: "modifyHeaders", responseHeaders },
      condition: { ...condition },
    });
  }

  if (
    rule.enableRequestHeaders &&
    rule.requestHeaders &&
    Object.keys(rule.requestHeaders).length > 0
  ) {
    // DNR modifyHeaders 的 value 必须是字符串；对象等强转为字符串
    const requestHeaders = Object.entries(rule.requestHeaders).map(
      ([header, value]) => ({
        header,
        operation: "set",
        value: typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
      })
    );
    dnrRules.push({
      id: ruleId + 200000,
      priority: 1,
      action: { type: "modifyHeaders", requestHeaders },
      condition: { ...condition },
    });
  }

  return dnrRules;
}
