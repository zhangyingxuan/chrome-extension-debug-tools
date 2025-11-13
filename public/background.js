// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  console.log("前端调试增强器已安装");
});
