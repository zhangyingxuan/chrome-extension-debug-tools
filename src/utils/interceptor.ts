import { RequestRule } from "@/types";

/**
 * 拦截器管理器 - 用于管理XMLHttpRequest和fetch的拦截逻辑
 */
export class InterceptorManager {
  private originalFetch: typeof window.fetch;
  private originalXMLHttpRequestOpen: typeof XMLHttpRequest.prototype.open;
  private originalXMLHttpRequestSend: typeof XMLHttpRequest.prototype.send;

  private currentXhr: XMLHttpRequest | null = null;
  private currentRule: RequestRule | null = null;
  private requestRules: RequestRule[] = [];

  constructor() {
    this.originalFetch = window.fetch;
    this.originalXMLHttpRequestOpen = XMLHttpRequest.prototype.open;
    this.originalXMLHttpRequestSend = XMLHttpRequest.prototype.send;
  }

  /**
   * 设置规则列表
   */
  setRules(rules: RequestRule[]): void {
    this.requestRules = rules;
  }

  /**
   * 初始化拦截器
   */
  initialize(): void {
    // 将实例存储到window对象中，以便在XMLHttpRequest拦截方法中访问
    (window as any).__interceptorManager__ = this;
    this.interceptFetch();
    this.interceptXMLHttpRequest();
    console.log('[Interceptor] 拦截器初始化完成');
  }

  /**
   * 将Headers对象转换为普通对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 恢复原始方法
   */
  restore(): void {

    window.fetch = this.originalFetch;

    XMLHttpRequest.prototype.open = this.originalXMLHttpRequestOpen;
    XMLHttpRequest.prototype.send = this.originalXMLHttpRequestSend;

    console.log('[Interceptor] 所有拦截器已恢复完成', new Date().toISOString());
  }

  /**
   * 拦截fetch请求
   */
  private interceptFetch(): void {
    window.fetch = async (...args) => {
      const [input, init = {}] = args;
      const url = typeof input === "string" ? input : (input as Request).url;

      // console.log(`[Interceptor] fetch请求: ${url}`);
      // 检查是否有匹配的规则
      const matchedRule = this.findMatchingRule(url, init.method || "GET");

      if (matchedRule && matchedRule.enabled) {
        // 修改请求
        const modifiedRequest = this.modifyRequest(init, matchedRule);

        console.log('[Interceptor] 请求修改信息:', {
          originalHeaders: init.headers,
          modifiedHeaders: modifiedRequest.headers,
          originalBody: init.body,
          modifiedBody: modifiedRequest.body
        });

        try {
          // 执行原始fetch
          const response = await this.originalFetch.call(
            window,
            input,
            modifiedRequest
          );

          console.log('[Interceptor] 原始响应信息:', {
            status: response.status,
            statusText: response.statusText,
            headers: this.headersToObject(response.headers)
          });

          // 修改响应
          const modifiedResponse = await this.modifyResponse(response, matchedRule);

          console.log('[Interceptor] 响应修改完成:', {
            originalStatus: response.status,
            modifiedStatus: modifiedResponse.status,
            ruleStatus: matchedRule.response.status
          });

          return modifiedResponse;
        } catch (error) {
          console.error('[Interceptor] 请求执行失败:', error);
          // 如果请求失败，返回模拟响应
          const mockResponse = this.createMockResponse(matchedRule);
          console.log('[Interceptor] 返回模拟响应:', {
            status: mockResponse.status,
            bodyType: matchedRule.response.bodyType
          });
          return mockResponse;
        }
      }

      return this.originalFetch.call(window, ...args);
    };
  }

  /**
   * 拦截XMLHttpRequest
   */
  private interceptXMLHttpRequest(): void {
    const self = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string,
      ...args: any[]
    ) {
      // console.log(`[Interceptor] XMLHttpRequest.open调用: ${url} (${method})`);

      // 存储原始信息用于后续修改
      (this as any)._originalUrl = url;
      (this as any)._originalMethod = method;

      // 检查是否有匹配的规则
      const matchedRule = self.findMatchingRule(url, method);

      if (matchedRule && matchedRule.enabled) {
        console.log(`[Interceptor] 拦截到XMLHttpRequest请求: ${url}`, {
          method: method,
          ruleId: matchedRule.ruleId,
          ruleName: matchedRule.id,
          filterType: matchedRule.filterType,
          urlPattern: matchedRule.urlPattern
        });

        // 存储匹配的规则到XHR实例
        (this as any)._matchedRule = matchedRule;
      }

      return self.originalXMLHttpRequestOpen.apply(this, [
        method,
        url,
        ...args,
      ] as [string, string | URL, boolean, string?, string?]);
    };

    XMLHttpRequest.prototype.send = function (data?: any) {
      // console.log(`[Interceptor] XMLHttpRequest.send`);

      const matchedRule = (this as any)._matchedRule;

      if (matchedRule && matchedRule.enabled) {
        // console.log('[Interceptor] XMLHttpRequest请求修改信息:', {
        //   originalData: data,
        //   requestHeaders: matchedRule.requestHeaders
        // });

        // 修改请求头
        self.modifyXHRHeaders(this, matchedRule);

        // 修改请求体
        const modifiedData = self.modifyXHRBody(data, matchedRule);

        console.log('[Interceptor] XMLHttpRequest请求体修改:', {
          originalData: data,
          modifiedData: modifiedData
        });

        // 重写onreadystatechange
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function () {
          if (this.readyState === 4) {
            console.log('[Interceptor] XMLHttpRequest响应到达:', {
              originalStatus: this.status,
              originalResponseText: this.responseText,
              ruleStatus: matchedRule.response.status
            });

            // 修改响应
            self.modifyXHRResponse(this, matchedRule);

            console.log('[Interceptor] XMLHttpRequest响应修改完成:', {
              modifiedStatus: this.status,
              modifiedResponseText: this.responseText,
              bodyType: matchedRule.response.bodyType
            });
          }
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, new Event("readystatechange"));
          }
        };

        self.originalXMLHttpRequestSend.call(this, modifiedData);
        return;
      }

      self.originalXMLHttpRequestSend.call(this, data);
      return;
    };
  }

  /**
   * 查找匹配的规则
   */
  private findMatchingRule(url: string, method: string): RequestRule | null {
    const enabledRules = this.requestRules.filter((rule) => rule.enabled);

    // console.log(`[Interceptor] 开始匹配规则: ${url} (${method})`, {
    //   enabledRulesCount: enabledRules.length,
    //   totalRulesCount: this.requestRules.length
    // });

    for (const rule of enabledRules) {
      console.log(`[Interceptor] 检查规则: ${rule.id} (${rule.ruleId})`, {
        method: rule.method,
        filterType: rule.filterType,
        urlPattern: rule.urlPattern
      });

      if (rule.method !== "ALL" && rule.method !== method.toUpperCase()) {
        console.log(`[Interceptor] 方法不匹配: 规则要求 ${rule.method}, 实际 ${method}`);
        continue;
      }

      if (rule.filterType === "urlFilter") {
        if (url.includes(rule.urlPattern!)) {
          return rule;
        }
      } else if (rule.filterType === "regexFilter") {
        try {
          const regex = new RegExp(rule.urlPattern!);
          console.log(`[Interceptor] 正则匹配结果: ${regex.test(url)}: ${url} 匹配 ${rule.urlPattern}`);
          if (regex.test(url)) {
            return rule;
          }
        } catch (error) {
          console.error("正则表达式错误:", error);
        }
      }
    }

    // console.log('[Interceptor] 未找到匹配的规则');
    return null;
  }

  /**
   * 修改fetch请求
   */
  private modifyRequest(init: RequestInit, rule: RequestRule): RequestInit {
    const modifiedInit = { ...init };

    // 修改请求头
    if (rule.requestHeaders) {
      modifiedInit.headers = {
        ...init.headers,
        ...rule.requestHeaders,
      };
    }

    // 修改请求体
    if (rule.requestBody && init.body) {
      if (typeof init.body === "string") {
        try {
          const originalBody = JSON.parse(init.body);
          modifiedInit.body = JSON.stringify({
            ...originalBody,
            ...rule.requestBody,
          });
        } catch {
          // 如果不是JSON，直接替换
          modifiedInit.body = rule.requestBody;
        }
      }
    }

    return modifiedInit;
  }

  /**
   * 修改fetch响应
   */
  private async modifyResponse(
    response: Response,
    rule: RequestRule
  ): Promise<Response> {
    // 将Headers对象转换为普通对象
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const modifiedResponse = new Response(null, {
      status: rule.response.status || response.status,
      statusText: response.statusText,
      headers: {
        ...responseHeaders,
        ...rule.response.headers,
      },
    });

    // console.log('[Interceptor] 开始修改响应:', {
    //   originalStatus: response.status,
    //   ruleStatus: rule.response.status,
    //   bodyType: rule.response.bodyType,
    //   headersModified: Object.keys(rule.response.headers).length > 0
    // });

    // 修改响应体
    if (rule.response.bodyType === "function") {
      // 执行JavaScript函数
      console.log('[Interceptor] 执行JavaScript响应函数:', {
        functionLength: rule.response.body.length,
        functionPreview: rule.response.body.substring(0, 100) + '...'
      });

      try {
        const func = new Function("originalResponse", "rule", rule.response.body);
        const result = await func(response, rule);

        console.log('[Interceptor] JavaScript函数执行结果:', {
          resultType: typeof result,
          isResponse: result instanceof Response,
          resultPreview: result instanceof Response ? '[Response Object]' : JSON.stringify(result).substring(0, 200)
        });

        if (result instanceof Response) {
          return result;
        } else {
          return new Response(JSON.stringify(result), {
            status: modifiedResponse.status,
            headers: modifiedResponse.headers,
          });
        }
      } catch (error) {
        console.error("执行响应函数错误:", error);
        return response;
      }
    } else {
      // JSON响应体
      console.log('[Interceptor] 使用JSON响应体:', {
        bodyType: typeof rule.response.body,
        bodyPreview: JSON.stringify(rule.response.body).substring(0, 200)
      });

      return new Response(JSON.stringify(rule.response.body), {
        status: modifiedResponse.status,
        headers: modifiedResponse.headers,
      });
    }
  }

  /**
   * 创建模拟响应
   */
  private createMockResponse(rule: RequestRule): Response {
    let body: string;

    if (rule.response.bodyType === "function") {
      try {
        const func = new Function("rule", rule.response.body);
        const result = func(rule);
        body = JSON.stringify(result);
      } catch (error) {
        console.error("执行模拟响应函数错误:", error);
        body = JSON.stringify({ error: "Function execution failed" });
      }
    } else {
      body = JSON.stringify(rule.response.body);
    }

    return new Response(body, {
      status: rule.response.status,
      headers: rule.response.headers,
    });
  }

  /**
   * 修改XMLHttpRequest请求头
   */
  private modifyXHRHeaders(xhr: XMLHttpRequest, rule: RequestRule): void {
    if (rule.requestHeaders) {
      Object.entries(rule.requestHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
  }

  /**
   * 修改XMLHttpRequest请求体
   */
  private modifyXHRBody(data: any, rule: RequestRule): any {
    if (rule.requestBody && data) {
      if (typeof data === "string") {
        try {
          const originalBody = JSON.parse(data);
          return JSON.stringify({
            ...originalBody,
            ...rule.requestBody,
          });
        } catch {
          return rule.requestBody;
        }
      }
    }
    return data;
  }

  /**
   * 修改XMLHttpRequest响应
   */
  private modifyXHRResponse(xhr: XMLHttpRequest, rule: RequestRule): void {
    console.log('[Interceptor] 开始修改XMLHttpRequest响应:', {
      originalStatus: xhr.status,
      originalResponseText: xhr.responseText?.substring(0, 200),
      ruleStatus: rule.response.status,
      bodyType: rule.response.bodyType
    });

    if (rule.response.bodyType === "function") {
      console.log('[Interceptor] 执行XMLHttpRequest JavaScript函数:', {
        functionLength: rule.response.body.length,
        functionPreview: rule.response.body.substring(0, 100) + '...'
      });

      try {
        const func = new Function("xhr", "rule", rule.response.body);
        const result = func(xhr, rule);

        console.log('[Interceptor] XMLHttpRequest函数执行结果:', {
          resultType: typeof result,
          resultPreview: typeof result === "string" ? result.substring(0, 200) : JSON.stringify(result).substring(0, 200)
        });

        // 修改响应数据
        Object.defineProperty(xhr, "responseText", {
          value: typeof result === "string" ? result : JSON.stringify(result),
          writable: true,
        });

        Object.defineProperty(xhr, "response", {
          value: result,
          writable: true,
        });

        // 修改状态码
        Object.defineProperty(xhr, "status", {
          value: rule.response.status,
          writable: true,
        });

        console.log('[Interceptor] XMLHttpRequest响应修改完成:', {
          newStatus: xhr.status,
          newResponseTextLength: xhr.responseText?.length
        });
      } catch (error) {
        console.error("执行XHR响应函数错误:", error);
      }
    } else {
      // JSON响应体
      console.log('[Interceptor] 使用XMLHttpRequest JSON响应体:', {
        bodyType: typeof rule.response.body,
        bodyPreview: JSON.stringify(rule.response.body).substring(0, 200)
      });

      Object.defineProperty(xhr, "responseText", {
        value: JSON.stringify(rule.response.body),
        writable: true,
      });

      Object.defineProperty(xhr, "response", {
        value: rule.response.body,
        writable: true,
      });

      Object.defineProperty(xhr, "status", {
        value: rule.response.status,
        writable: true,
      });

      console.log('[Interceptor] XMLHttpRequest JSON响应修改完成:', {
        newStatus: xhr.status,
        newResponseTextLength: xhr.responseText?.length
      });
    }
  }
}

// 拦截器管理
const interceptorManager = new InterceptorManager();

// 监听来自页面的消息，允许页面查询当前规则状态
window.addEventListener("message", (event) => {
  const data = event.data;
  if (event.source !== window || data.from !== 'blowsysun-debug-tools') return;

  switch (data.action) {
    case 'RULES_UPDATE':
      interceptorManager.setRules(data.value);
      interceptorManager.initialize();
      break;
    case 'OPEN_RULES_ENABLED':
      data.value && interceptorManager.setRules(data.value);
      interceptorManager.initialize();
      break;
    case 'CLOSE_RULES_ENABLED':
      interceptorManager.restore();
      break;
    default:
      break;
  }
}, false);