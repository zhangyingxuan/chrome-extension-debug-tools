// import { ChromeMessage, RequestRule, InterceptionRecord } from './types'

// // 网络请求拦截器
// class RequestInterceptor {
//   private rules: RequestRule[] = []
//   private isEnabled = true

//   // 初始化拦截器
//   initialize(): void {
//     this.loadRules()
//     this.interceptFetch()
//     this.interceptXMLHttpRequest()
//     this.setupMessageListener()
//   }

//   // 从背景脚本加载规则
//   private loadRules() {
//     try {
//       chrome.runtime.sendMessage(
//         { type: "GET_RULES" } as ChromeMessage,
//         (response) => {
//           if (response) {
//             this.rules = response.rules
//             this.isEnabled = response.enabled
//           }
//         }
//       )
//     } catch (error) {
//       console.debug('无法加载规则:', error)
//     }
//   }

//   // 拦截fetch请求
//   private interceptFetch() {
//     const originalFetch = window.fetch

//     window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
//       console.log('interceptFetch isEnabled====', this.isEnabled)
//       if (!this.isEnabled) {
//         return originalFetch(input, init)
//       }

//       const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
//       const method = init?.method || 'GET'

//       const matchedRule = this.findMatchingRule(url, method)
//       if (matchedRule) {
//         this.recordInterception({
//           url,
//           method,
//           matchedRule: matchedRule.id,
//           responseStatus: matchedRule.response.status,
//           delay: matchedRule.delay,
//           error: undefined
//         })
//         return this.createMockResponse(matchedRule)
//       }

//       return originalFetch(input, init)
//     }
//   }

//   // 拦截XMLHttpRequest
//   private interceptXMLHttpRequest() {
//     const OriginalXHR = window.XMLHttpRequest

//     window.XMLHttpRequest = class extends OriginalXHR {
//       private url: string = ''
//       private method: string = 'GET'

//       open(method: string, url: string, async?: boolean, username?: string, password?: string): void {
//         this.url = url
//         this.method = method
//         super.open(method, url, async ?? true, username, password)
//       }

//       send(body?: Document | XMLHttpRequestBodyInit | null): void {
//         console.log('interceptXMLHttpRequest send====', this.interceptor.isEnabled)
//         if (!this.interceptor.isEnabled) {
//           super.send(body)
//           return
//         }

//         const matchedRule = this.interceptor.findMatchingRule(this.url, this.method)
//         if (matchedRule) {
//           this.interceptor.recordInterception({
//             url: this.url,
//             method: this.method,
//             matchedRule: matchedRule.id,
//             responseStatus: matchedRule.response.status,
//             delay: matchedRule.delay,
//             error: undefined
//           })
//           this.handleMockResponse(matchedRule)
//           return
//         }

//         super.send(body)
//       }

//       private handleMockResponse(rule: RequestRule) {
//         // 使用Object.defineProperty来设置只读属性
//         Object.defineProperty(this, 'readyState', {
//           value: OriginalXHR.HEADERS_RECEIVED,
//           writable: false
//         })
//         Object.defineProperty(this, 'status', {
//           value: rule.response.status,
//           writable: false
//         })
//         Object.defineProperty(this, 'statusText', {
//           value: this.getStatusText(rule.response.status),
//           writable: false
//         })

//         // 设置响应头
//         Object.entries(rule.response.headers).forEach(([key, value]) => {
//           this.setRequestHeader(key, value)
//         })

//         // 设置响应体
//         Object.defineProperty(this, 'readyState', {
//           value: OriginalXHR.DONE,
//           writable: false
//         })
//         Object.defineProperty(this, 'responseText', {
//           value: typeof rule.response.body === 'string'
//             ? rule.response.body
//             : JSON.stringify(rule.response.body),
//           writable: false
//         })

//         // 触发事件
//         this.dispatchEvent(new Event('readystatechange'))
//         this.dispatchEvent(new Event('load'))
//         this.dispatchEvent(new Event('loadend'))
//       }

//       private getStatusText(status: number): string {
//         const statusTexts: Record<number, string> = {
//           200: 'OK',
//           201: 'Created',
//           400: 'Bad Request',
//           401: 'Unauthorized',
//           403: 'Forbidden',
//           404: 'Not Found',
//           500: 'Internal Server Error'
//         }
//         return statusTexts[status] || 'Unknown'
//       }

//       private get interceptor(): RequestInterceptor {
//         return (window as any).__requestInterceptor
//       }
//     }
//   }

//   // 记录拦截信息
//   private recordInterception(record: Omit<InterceptionRecord, 'id' | 'timestamp'>) {
//     console.log('recordInterception====', record)
//     const interceptionRecord: InterceptionRecord = {
//       id: `intercept_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
//       timestamp: Date.now(),
//       ...record
//     }

//     // 发送拦截记录到背景脚本
//     try {
//       chrome.runtime.sendMessage({
//         type: 'INTERCEPTION_RECORD',
//         data: interceptionRecord
//       } as ChromeMessage)
//     } catch (error) {
//       console.debug('无法发送拦截记录:', error)
//     }
//   }

//   // 查找匹配的规则
//   private findMatchingRule(url: string, method: string): RequestRule | null {
//     return this.rules.find(rule =>
//       rule.enabled &&
//       new RegExp(rule.urlPattern).test(url) &&
//       rule.method.toUpperCase() === method.toUpperCase()
//     ) || null
//   }

//   // 创建mock响应
//   private async createMockResponse(rule: RequestRule): Promise<Response> {
//     // 应用延迟
//     if (rule.delay > 0) {
//       await this.delay(rule.delay);
//     }

//     const body = typeof rule.response.body === 'string'
//       ? rule.response.body
//       : JSON.stringify(rule.response.body)

//     return new Response(body, {
//       status: rule.response.status,
//       statusText: this.getStatusText(rule.response.status),
//       headers: new Headers(rule.response.headers)
//     })
//   }

//   // 延迟函数
//   private delay(ms: number): Promise<void> {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   private getStatusText(status: number): string {
//     const statusTexts: Record<number, string> = {
//       200: 'OK',
//       201: 'Created',
//       400: 'Bad Request',
//       401: 'Unauthorized',
//       403: 'Forbidden',
//       404: 'Not Found',
//       500: 'Internal Server Error'
//     }
//     return statusTexts[status] || 'Unknown'
//   }

//   // 设置消息监听器
//   private setupMessageListener() {
//     chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
//       console.log('setupMessageListener====', message)
//       switch (message.type) {
//         case 'UPDATE_RULES':
//           this.rules = message.data.rules
//           this.isEnabled = message.data.enabled
//           break

//         case 'TOGGLE_ENABLED':
//           this.isEnabled = message.data.enabled
//           break

//         case 'GET_RULES':
//           sendResponse({ rules: this.rules, enabled: this.isEnabled })
//           break
//       }
//       return true
//     })
//   }
// }


// // 初始化请求拦截器
// const requestInterceptor = new RequestInterceptor()
// requestInterceptor.initialize();

// // 将拦截器暴露给全局，方便调试
// (window as any).__requestInterceptor = requestInterceptor