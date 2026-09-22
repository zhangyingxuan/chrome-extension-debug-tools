const INTERCEPTOR_SRC = chrome.runtime.getURL("./interceptor.js");

function isInterceptorInjected() {
  return !!document.querySelector(`script[src="${INTERCEPTOR_SRC}"]`);
}

function sendRules() {
  const from = "blowsysun-debug-tools";
  chrome.storage.local.get(
    ["scriptRequestRulesEnabled", "scriptRequestRules"],
    (result) => {
      const { scriptRequestRulesEnabled = true, scriptRequestRules = [] } =
        result;
      if (scriptRequestRulesEnabled) {
        window.postMessage({
          from,
          action: "OPEN_RULES_ENABLED",
          value: scriptRequestRules,
        });
      } else {
        window.postMessage({
          from,
          action: "CLOSE_RULES_ENABLED",
        });
      }
    }
  );
}

function injectContent() {
  if (isInterceptorInjected()) {
    if (window.__interceptorManager__) {
      sendRules();
    }
    return;
  }

  const scriptNode = document.createElement("script");
  scriptNode.src = INTERCEPTOR_SRC;
  scriptNode.addEventListener("load", sendRules, { once: true });
  (document.documentElement || document.head).appendChild(scriptNode);
}

injectContent();

// 1. 监听backgroud.js 传来的消息
chrome.runtime.onMessage.addListener((data) => {
  const { from, action, value } = data;
  if (data.from !== "blowsysun-debug-tools") return;

  window.postMessage({ from, action, value });
});

// 2. 监听页面脚本，传来的消息
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data.from) return;
  // 页面 -> devtools
  if (e.data.from === "blowsysun-debug-tools-page") {
    chrome.runtime.sendMessage({
      from: e.data.from,
      action: e.data.action,
      value: e.data.value,
    });
  }
});
