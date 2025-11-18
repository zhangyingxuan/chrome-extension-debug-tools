// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  // console.log("前端调试增强器已安装");
});

// 监听存储变化，当拦截规则变更时通知所有标签页
chrome.storage.onChanged.addListener((changes) => {
  if (changes.scriptRequestRules) {
    const newRules = changes.scriptRequestRules.newValue || [];
    console.log(
      "检测到拦截规则变更，通知所有标签页",
      changes.scriptRequestRules
    );

    // 向所有活动标签页发送规则更新消息
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "UPDATE_RULES",
              value: newRules,
            })
            .catch((error) => {
              // 忽略内容脚本未注入的错误
              if (error.message.includes("Receiving end does not exist")) {
                // console.log(`标签页 ${tab.id} 未注入内容脚本，跳过规则更新`);
              } else {
                console.error(`向标签页 ${tab.id} 发送规则更新失败:`, error);
              }
            });
        }
      });
    });
  }
});
