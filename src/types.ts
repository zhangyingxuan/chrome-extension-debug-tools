// 网络请求相关类型
export interface RequestRule {
  id: string;
  enabled: boolean;
  urlPattern: string;
  method: string;
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
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

// 网络请求数据
export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  type: string;
}

// 存储的数据结构
export interface StorageData {
  requestRules: RequestRule[];
  performanceHistory: PerformanceData[];
  enabled: boolean;
}

// Chrome API 事件类型
export interface ChromeMessage {
  type: 'NETWORK_REQUEST' | 'PERFORMANCE_DATA' | 'UPDATE_RULES' | 'TOGGLE_ENABLED' | 'GET_RULES' | 'START_PERFORMANCE_MONITOR' | 'STOP_PERFORMANCE_MONITOR' | 'GET_PERFORMANCE_DATA';
  data?: any;
}