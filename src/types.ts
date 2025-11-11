// 网络请求相关类型
export interface RequestRule {
  id: string;
  enabled: boolean;
  urlPattern: string;
  method: string;
  delay: number;
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  groupId?: string; // 新增分组ID字段
}

// 规则分组类型
export interface RuleGroup {
  id: string;
  name: string;
  enabled: boolean;
  expanded: boolean; // 是否展开分组
  order: number; // 分组排序
}

// 拦截记录类型
export interface InterceptionRecord {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  matchedRule?: string;
  responseStatus: number;
  delay: number;
  error?: string;
  ruleId: string;
}

// 性能监控数据类型
export interface PerformanceData {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  jsHeapSize: number;
  jsHeapUsed: number;
  domNodes: number;
  eventListeners: number;
}

// 进程/线程信息
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  type: 'main' | 'renderer' | 'worker' | 'other';
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
}

// Chrome消息类型
export interface ChromeMessage {
  type: string;
  data?: any;
}