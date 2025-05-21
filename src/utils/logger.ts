// 日志工具
class Logger {
  private logs: string[] = [];
  private maxLogs: number = 1000; // 限制日志数量

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'info',
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };
    
    const logMessage = `[${timestamp}] INFO: ${message}${data ? '\nData: ' + JSON.stringify(data, null, 2) : ''}`;
    this.logs.push(logMessage);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.log(logMessage);
    return logEntry;
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    const logEntry = {
      timestamp,
      level: 'error',
      message,
      error: errorDetails
    };

    const logMessage = `[${timestamp}] ERROR: ${message}\nError Details: ${JSON.stringify(errorDetails, null, 2)}`;
    this.logs.push(logMessage);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.error(logMessage);
    return logEntry;
  }

  warn(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'warn',
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };

    const logMessage = `[${timestamp}] WARN: ${message}${data ? '\nData: ' + JSON.stringify(data, null, 2) : ''}`;
    this.logs.push(logMessage);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.warn(logMessage);
    return logEntry;
  }

  debug(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'debug',
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };

    const logMessage = `[${timestamp}] DEBUG: ${message}${data ? '\nData: ' + JSON.stringify(data, null, 2) : ''}`;
    this.logs.push(logMessage);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    console.debug(logMessage);
    return logEntry;
  }

  getLogs(): string[] {
    return this.logs;
  }

  getLatestLogs(count: number = 100): string[] {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
    console.log('日志已清空');
  }

  // 导出日志到文件
  exportLogs(): string {
    return this.logs.join('\n');
  }
}

export const logger = new Logger();