// 格式化时间
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 生成唯一ID
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// 截断文本
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 格式化JSON字符串
export const formatJson = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonString;
  }
};

// 验证JSON字符串
export const validateJson = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

// 深度克隆对象
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 获取状态码样式类
export const getStatusClass = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) {
    return 'status-success';
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'status-redirect';
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'status-client-error';
  } else if (statusCode >= 500) {
    return 'status-server-error';
  }
  return 'status-unknown';
};

// 验证URL模式（正则表达式）
export const validateUrlPattern = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

// 解析headers文本为对象
export const parseHeaders = (headersText: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  headersText.split('\n').forEach((line) => {
    const [key, value] = line.split(':').map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  });
  return headers;
};

// 将headers对象转换为文本
export const stringifyHeaders = (headers: Record<string, string>): string => {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

// 数组去重
export const uniqueArray = <T>(array: T[], key?: keyof T): T[] => {
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      return seen.has(value) ? false : seen.add(value);
    });
  }
  return [...new Set(array)];
};

// 对象数组按字段排序
export const sortByField = <T>(
  array: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// 过滤对象数组
export const filterArray = <T>(
  array: T[],
  predicate: (item: T) => boolean
): T[] => {
  return array.filter(predicate);
};

// 分组对象数组
export const groupBy = <T, K extends keyof any>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};



// 错误处理工具
export const errorHandler = {
  log: (error: any, context?: string) => {
    console.debug(context ? `${context}:` : '错误:', error);
  },

  alert: (message: string, title: string = '错误') => {
    alert(`${title}: ${message}`);
  },

  toast: (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    // 这里可以集成UI组件的toast功能
    console.debug(`${type}: ${message}`);
  }
};