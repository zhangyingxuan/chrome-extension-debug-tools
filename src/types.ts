// 网络请求相关类型
export interface RequestRule {
  id?: string;
  ruleId: number;
  enabled: boolean;
  name?: string;
  urlPattern?: string;
  regexFilter?: string;
  filterType?: 'urlFilter' | 'regexFilter';
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
    bodyType?: 'json' | 'function';
  };
  expanded?: boolean;
  responseBody?: string;
}

// 拦截记录类型
export interface InterceptionRecord {
  id: string;
  ruleId: number;
  rulesetId: number;
  timestamp: number;
  method: string;
  url: string;
  requestId: string;
  matchedRule?: string;
  error?: string;
  expanded: boolean;
}

// 网络请求记录类型
export interface RequestLog {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status: number;
  duration: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  expanded: boolean;
  resourceType?: string;
}

// Chrome消息类型
export interface ChromeMessage {
  type: string;
  data?: any;
}