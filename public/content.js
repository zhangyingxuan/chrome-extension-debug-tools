/**
 * 注入脚本到页面
 * @param {*} path
 * @param {*} root
 */
function injectedScript(path, root = document.documentElement) {
  const scriptNode = document.createElement("script");
  scriptNode.src = chrome.runtime.getURL(path);
  root.appendChild(scriptNode);
  // s.onload = () => s.remove();
  //  (document.head || document.documentElement).appendChild(s);
  return scriptNode;
}

async function injectContent() {
  const from = "blowsysun-debug-tools";
  const pageScripts = injectedScript("./interceptor.js");
  if (pageScripts) {
    pageScripts.addEventListener("load", () => {
      // 取出存储中的数据初始化拦截规则
      chrome.storage.local.get(
        ["scriptRequestRules", "scriptRequestRulesEnabled"],
        (result) => {
          // console.log("注入拦截脚本成功【初始化content.js】", result);
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
    });
  }
}

injectContent();

// 2. 二次更新（无需刷新）
chrome.runtime.onMessage.addListener((data) => {
  const { from, action, value } = data;
  // console.log("二次转发消息", from, action, value);
  if (data.from !== "blowsysun-debug-tools") return;
  window.postMessage({ from, action, value });
});
