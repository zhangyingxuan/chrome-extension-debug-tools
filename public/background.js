// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  console.log("前端调试增强器已安装");
});

// 更新插件图标badge状态
const updateBadgeStatus = (enabled) => {
  try {
    if (enabled) {
      chrome.action.setBadgeText({ text: "ON" });
      chrome.action.setBadgeBackgroundColor({ color: "#52c41a" }); // 绿色
    } else {
      chrome.action.setBadgeText({ text: "OFF" });
      chrome.action.setBadgeBackgroundColor({ color: "#f5222d" }); // 红色
    }
    console.log(`插件图标状态已更新为: ${enabled ? "ON" : "OFF"}`);
  } catch (error) {
    console.warn("设置插件图标badge失败:", error);
  }
};
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log("storage.onChanged.addListener", key, oldValue, newValue);
    if (key === "requestRulesEnabled") {
      updateBadgeStatus(newValue);
    }
  }
});
