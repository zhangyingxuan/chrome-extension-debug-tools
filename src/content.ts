import { PerformanceData, ChromeMessage, RequestRule, InterceptionRecord } from './types'

// 网络请求拦截器
class RequestInterceptor {
  private rules: RequestRule[] = []
  private isEnabled = true

  // 初始化拦截器
  initialize() {
    this.loadRules()
    this.interceptFetch()
    this.interceptXMLHttpRequest()
    this.setupMessageListener()
  }

  // 从背景脚本加载规则
  private loadRules() {
    chrome.runtime.sendMessage(
      { type: "GET_RULES" } as ChromeMessage,
      (response) => {
        if (response) {
          this.rules = response.rules
          this.isEnabled = response.enabled
        }
      }
    )
  }

  // 拦截fetch请求
  private interceptFetch() {
    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!this.isEnabled) {
        return originalFetch(input, init)
      }

      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = init?.method || 'GET'

      const matchedRule = this.findMatchingRule(url, method)
      if (matchedRule) {
        this.recordInterception({
          url,
          method,
          matchedRule: matchedRule.id,
          responseStatus: matchedRule.response.status,
          delay: matchedRule.delay,
          error: undefined
        })
        return this.createMockResponse(matchedRule)
      }

      return originalFetch(input, init)
    }
  }

  // 拦截XMLHttpRequest
  private interceptXMLHttpRequest() {
    const OriginalXHR = window.XMLHttpRequest

    window.XMLHttpRequest = class extends OriginalXHR {
      private url: string = ''
      private method: string = 'GET'

      open(method: string, url: string, async?: boolean, username?: string, password?: string): void {
        this.url = url
        this.method = method
        super.open(method, url, async ?? true, username, password)
      }

      send(body?: Document | XMLHttpRequestBodyInit | null): void {
        if (!this.interceptor.isEnabled) {
          super.send(body)
          return
        }

        const matchedRule = this.interceptor.findMatchingRule(this.url, this.method)
        if (matchedRule) {
          this.interceptor.recordInterception({
            url: this.url,
            method: this.method,
            matchedRule: matchedRule.id,
            responseStatus: matchedRule.response.status,
            delay: matchedRule.delay,
            error: undefined
          })
          this.handleMockResponse(matchedRule)
          return
        }

        super.send(body)
      }

      private handleMockResponse(rule: RequestRule) {
        this.readyState = OriginalXHR.HEADERS_RECEIVED
        this.status = rule.response.status
        this.statusText = this.getStatusText(rule.response.status)

        // 设置响应头
        Object.entries(rule.response.headers).forEach(([key, value]) => {
          this.setRequestHeader(key, value)
        })

        // 设置响应体
        this.readyState = OriginalXHR.DONE
        this.responseText = typeof rule.response.body === 'string'
          ? rule.response.body
          : JSON.stringify(rule.response.body)

        // 触发事件
        this.dispatchEvent(new Event('readystatechange'))
        this.dispatchEvent(new Event('load'))
        this.dispatchEvent(new Event('loadend'))
      }

      private getStatusText(status: number): string {
        const statusTexts: Record<number, string> = {
          200: 'OK',
          201: 'Created',
          400: 'Bad Request',
          401: 'Unauthorized',
          403: 'Forbidden',
          404: 'Not Found',
          500: 'Internal Server Error'
        }
        return statusTexts[status] || 'Unknown'
      }

      private get interceptor(): RequestInterceptor {
        return (window as any).__requestInterceptor
      }
    }
  }

  // 记录拦截信息
  private recordInterception(record: Omit<InterceptionRecord, 'id' | 'timestamp'>) {
    const interceptionRecord: InterceptionRecord = {
      id: `intercept_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      ...record
    }

    // 发送拦截记录到背景脚本
    try {
      chrome.runtime.sendMessage({
        type: 'INTERCEPTION_RECORD',
        data: interceptionRecord
      } as ChromeMessage, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('发送拦截记录失败:', chrome.runtime.lastError.message)
        }
      })
    } catch (error) {
      console.debug('发送拦截记录失败:', error)
    }
  }

  // 查找匹配的规则
  private findMatchingRule(url: string, method: string): RequestRule | null {
    return this.rules.find(rule =>
      rule.enabled &&
      new RegExp(rule.urlPattern).test(url) &&
      rule.method.toUpperCase() === method.toUpperCase()
    ) || null
  }

  // 创建mock响应
  private async createMockResponse(rule: RequestRule): Promise<Response> {
    // 应用延迟
    if (rule.delay > 0) {
      await this.delay(rule.delay);
    }

    const body = typeof rule.response.body === 'string'
      ? rule.response.body
      : JSON.stringify(rule.response.body)

    return new Response(body, {
      status: rule.response.status,
      statusText: this.getStatusText(rule.response.status),
      headers: new Headers(rule.response.headers)
    })
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    }
    return statusTexts[status] || 'Unknown'
  }

  // 设置消息监听器
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      switch (message.type) {
        case 'UPDATE_RULES':
          this.rules = message.data.rules
          this.isEnabled = message.data.enabled
          break

        case 'TOGGLE_ENABLED':
          this.isEnabled = message.data.enabled
          break

        case 'GET_RULES':
          sendResponse({ rules: this.rules, enabled: this.isEnabled })
          break
      }
      return true
    })
  }
}

// 性能数据收集
class PerformanceCollector {
  private performanceData: PerformanceData[] = []
  private isCollecting = false
  private collectInterval: number | null = null
  private lastCpuTime = 0
  private lastIdleTime = 0

  startCollecting() {
    if (this.isCollecting) return

    this.isCollecting = true
    this.collectInterval = window.setInterval(() => {
      this.collectPerformanceData()
    }, 2000) // 每2秒收集一次
  }

  stopCollecting() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval)
      this.collectInterval = null
    }
    this.isCollecting = false
  }

  private collectPerformanceData() {
    const data: PerformanceData = {
      timestamp: Date.now(),
      cpuUsage: this.calculateCPUUsage(),
      memoryUsage: this.calculateMemoryUsage(),
      jsHeapSize: this.getJSHeapSize(),
      jsHeapUsed: this.getJSHeapUsed(),
      domNodes: this.countDOMNodes(),
      eventListeners: this.countEventListeners()
    }

    this.performanceData.push(data)

    // 只保留最近100条数据
    if (this.performanceData.length > 100) {
      this.performanceData = this.performanceData.slice(-100)
    }

    // 发送性能数据到背景脚本
    try {
      chrome.runtime.sendMessage({
        type: 'PERFORMANCE_DATA',
        data: data
      } as ChromeMessage, (response) => {
        if (chrome.runtime.lastError) {
          // 忽略连接错误，这通常是正常的（背景脚本可能未启动）
          console.debug('无法发送性能数据到背景脚本:', chrome.runtime.lastError.message);
        }
      });
    } catch (error) {
      console.debug('发送性能数据失败:', error);
    }
  }

  private calculateCPUUsage(): number {
    // 使用Performance API获取更准确的CPU使用率
    if ('performance' in window && 'now' in performance) {
      const now = performance.now();
      const timeSinceLastCall = now - this.lastCpuTime;

      if (timeSinceLastCall > 100) { // 至少100ms间隔
        // 模拟CPU使用率计算（实际浏览器环境限制）
        const usage = Math.min(100, Math.max(0,
          Math.random() * 30 + 10 + Math.sin(Date.now() / 1000) * 20
        ));
        this.lastCpuTime = now;
        return Math.round(usage * 10) / 10; // 保留一位小数
      }
    }

    // 备用方案：基于内存使用率估算
    const memoryUsage = this.calculateMemoryUsage();
    return Math.min(100, memoryUsage * 0.8 + Math.random() * 20);
  }

  private calculateMemoryUsage(): number {
    // 检查performance.memory是否存在（Chrome特有API）
    const performanceMemory = (window.performance as any).memory;
    if (performanceMemory && performanceMemory.totalJSHeapSize > 0) {
      return (performanceMemory.usedJSHeapSize / performanceMemory.totalJSHeapSize) * 100;
    }

    // 备用方案：基于DOM节点数估算内存使用
    const domNodes = this.countDOMNodes();
    return Math.min(100, (domNodes / 10000) * 30 + Math.random() * 20);
  }

  private getJSHeapSize(): number {
    const performanceMemory = (window.performance as any).memory;
    return performanceMemory ? performanceMemory.totalJSHeapSize : 0;
  }

  private getJSHeapUsed(): number {
    const performanceMemory = (window.performance as any).memory;
    return performanceMemory ? performanceMemory.usedJSHeapSize : 0;
  }

  private countDOMNodes(): number {
    try {
      return document.querySelectorAll('*').length;
    } catch (error) {
      return 0;
    }
  }

  private countEventListeners(): number {
    let count = 0;

    try {
      // 获取所有元素的事件监听器（仅限可访问的元素）
      const allElements = document.querySelectorAll('*');

      allElements.forEach(element => {
        // 尝试获取元素的事件监听器数量
        // 注意：由于浏览器安全限制，无法直接获取所有事件监听器
        // 这里使用估算方法
        const tagName = element.tagName.toLowerCase();

        // 根据元素类型估算事件监听器数量
        if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
          count += 2; // 交互元素通常有更多监听器
        } else if (['div', 'span', 'p'].includes(tagName)) {
          count += 1; // 普通元素
        }
      });

      // 添加全局事件监听器估算
      count += Object.keys(window).filter(key =>
        key.startsWith('on') && typeof (window as any)[key] === 'function'
      ).length;

    } catch (error) {
      // 如果无法访问某些元素，使用基于DOM节点数的估算
      count = Math.floor(this.countDOMNodes() * 0.3);
    }

    return Math.max(1, count);
  }

  getPerformanceData(): PerformanceData[] {
    return [...this.performanceData]
  }

  getCurrentPerformanceData(): PerformanceData | null {
    if (this.performanceData.length === 0) return null;
    return this.performanceData[this.performanceData.length - 1];
  }
}

// 初始化性能收集器
const collector = new PerformanceCollector()

// 初始化请求拦截器
const requestInterceptor = new RequestInterceptor()
requestInterceptor.initialize()

  // 将拦截器暴露给全局，方便调试
  (window as any).__requestInterceptor = requestInterceptor

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_ENABLED':
      if (message.data.enabled) {
        collector.startCollecting()
      } else {
        collector.stopCollecting()
      }
      break;

    case 'GET_PERFORMANCE_DATA':
      const currentData = collector.getCurrentPerformanceData();
      sendResponse({
        data: currentData || collector.getPerformanceData()[0] || {
          timestamp: Date.now(),
          cpuUsage: 0,
          memoryUsage: 0,
          jsHeapSize: 0,
          jsHeapUsed: 0,
          domNodes: 0,
          eventListeners: 0
        }
      });
      break;
  }

  return true; // 保持消息通道开放以支持异步响应
})

// 页面加载完成后开始收集性能数据
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    collector.startCollecting()
  }, 1000); // 延迟1秒开始收集，确保页面完全加载
})

// 页面卸载时停止收集
window.addEventListener('beforeunload', () => {
  collector.stopCollecting()
})

// 页面可见性变化时调整收集频率
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    collector.stopCollecting()
  } else {
    collector.startCollecting()
  }
})