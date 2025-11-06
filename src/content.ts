import { PerformanceData, ChromeMessage } from './types'

// 性能数据收集
class PerformanceCollector {
  private performanceData: PerformanceData[] = []
  private isCollecting = false
  private collectInterval: number | null = null

  startCollecting() {
    if (this.isCollecting) return

    this.isCollecting = true
    this.collectInterval = window.setInterval(() => {
      this.collectPerformanceData()
    }, 1000) // 每秒收集一次
  }

  stopCollecting() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval)
      this.collectInterval = null
    }
    this.isCollecting = false
  }

  private collectPerformanceData() {
    // 检查performance.memory是否存在（Chrome特有API）
    const performanceMemory = (window.performance as any).memory;
    if (!performanceMemory) return

    const memory = performanceMemory
    const data: PerformanceData = {
      timestamp: Date.now(),
      cpuUsage: this.calculateCPUUsage(),
      memoryUsage: memory.usedJSHeapSize / memory.totalJSHeapSize * 100,
      jsHeapSize: memory.totalJSHeapSize,
      jsHeapUsed: memory.usedJSHeapSize,
      domNodes: this.countDOMNodes(),
      eventListeners: this.countEventListeners()
    }

    this.performanceData.push(data)

    // 只保留最近100条数据
    if (this.performanceData.length > 100) {
      this.performanceData = this.performanceData.slice(-100)
    }

    // 发送性能数据到背景脚本
    chrome.runtime.sendMessage({
      type: 'PERFORMANCE_DATA',
      data: data
    } as ChromeMessage)
  }

  private calculateCPUUsage(): number {
    // 简化的CPU使用率计算
    // 在实际应用中，可以使用更精确的Performance API
    return Math.random() * 100 // 临时实现
  }

  private countDOMNodes(): number {
    return document.querySelectorAll('*').length
  }

  private countEventListeners(): number {
    // 简化的监听器计数
    let count = 0
    const allElements = document.querySelectorAll('*')
    allElements.forEach(element => {
      // 这里可以扩展为实际的事件监听器计数
      count++
    })
    return count
  }

  getPerformanceData(): PerformanceData[] {
    return [...this.performanceData]
  }
}

// 初始化性能收集器
const collector = new PerformanceCollector()

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  if (message.type === 'TOGGLE_ENABLED') {
    if (message.data.enabled) {
      collector.startCollecting()
    } else {
      collector.stopCollecting()
    }
  }
})

// 页面加载完成后开始收集性能数据
document.addEventListener('DOMContentLoaded', () => {
  collector.startCollecting()
})

// 页面卸载时停止收集
window.addEventListener('beforeunload', () => {
  collector.stopCollecting()
})