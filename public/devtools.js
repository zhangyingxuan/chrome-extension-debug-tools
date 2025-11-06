// 创建开发者工具面板
// chrome.devtools.panels.create(
//   "my panel",
//   "sources/tabs128.png",
//   "panel.html",
//   () => {
//     // console.log("前端调试面板已创建");
//     // panel.onShown.addListener((window) => {
//     //   // 面板显示时的初始化逻辑
//     //   console.log("调试面板已显示");
//     // });
//     // panel.onHidden.addListener(() => {
//     //   // 面板隐藏时的清理逻辑
//     //   console.log("调试面板已隐藏");
//     // });
//   }
// );

chrome.devtools.panels.create("前端调试", "icon.png", "index.html", () => {
  console.log("user switched to this panel");
});
