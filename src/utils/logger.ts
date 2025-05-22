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

  // 记录HTTP请求和响应
  logHttpRequest(config: {
    url: string;
    method: string;
    data?: any;
    headers?: any;
    responseStatus?: number;
    responseData?: any;
    error?: any;
  }) {
    const timestamp = new Date().toISOString();
    const isError = config.error || (config.responseStatus && config.responseStatus >= 400);
    
    const logEntry = {
      timestamp,
      level: isError ? 'error' : 'info',
      message: `HTTP ${config.method} ${config.url} ${config.responseStatus ? `- Status: ${config.responseStatus}` : ''}`,
      request: {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: this.sanitizeHeaders(config.headers)
      },
      response: config.responseStatus ? {
        status: config.responseStatus,
        data: config.responseData
      } : undefined,
      error: config.error
    };

    const logMessage = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: HTTP ${config.method} ${config.url} ${config.responseStatus ? `- Status: ${config.responseStatus}` : ''}
Request: ${JSON.stringify(this.sanitizeRequestData(config.data), null, 2)}
${config.responseStatus ? `Response Status: ${config.responseStatus}
Response Data: ${JSON.stringify(config.responseData, null, 2)}` : ''}
${config.error ? `Error: ${JSON.stringify(config.error, null, 2)}` : ''}`;

    this.logs.push(logMessage);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    if (isError) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
    
    return logEntry;
  }
  
  // 清理敏感请求数据
  private sanitizeRequestData(data: any): any {
    if (!data) return data;
    
    // 如果是对象，进行深度复制并清理
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      
      // 清理可能包含敏感信息的字段
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'api_key'];
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  // 清理敏感头信息
  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;
    
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'apikey'];
    
    for (const header of sensitiveHeaders) {
      if (header.toLowerCase() in sanitized) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  // 分析HTTP错误并提供诊断信息
  analyzeHttpError(error: any, context: any = {}): {
    statusCode: number | null;
    errorType: string;
    possibleCauses: string[];
    recommendedActions: string[];
    diagnosticInfo: any;
  } {
    let statusCode: number | null = null;
    let errorType = 'unknown';
    let possibleCauses: string[] = [];
    let recommendedActions: string[] = [];
    const diagnosticInfo = { ...context };

    try {
      // 尝试从错误对象中提取HTTP状态码
      if (error && error.status) {
        statusCode = parseInt(error.status, 10);
      } else if (error && error.message) {
        // 尝试从错误消息中提取状态码
        const statusMatch = error.message.match(/(\d{3})/);
        if (statusMatch && statusMatch[1]) {
          statusCode = parseInt(statusMatch[1], 10);
        }
      }
      
      diagnosticInfo.extractedStatusCode = statusCode;
      diagnosticInfo.originalError = typeof error === 'object' ? {
        message: error.message,
        name: error.name,
        stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined
      } : error;

      // 根据状态码分析错误
      switch (statusCode) {
        case 400:
          errorType = 'Bad Request';
          possibleCauses = [
            '请求参数格式错误',
            '缺少必需的参数',
            '参数值类型不正确',
            '参数验证失败'
          ];
          recommendedActions = [
            '检查请求体中的参数格式是否正确',
            '确保所有必需的参数都已提供',
            '检查参数值的类型是否符合API要求',
            '参考API文档验证参数格式'
          ];
          
          // 额外的诊断信息
          if (context.requestBody) {
            try {
              const body = typeof context.requestBody === 'string' 
                ? JSON.parse(context.requestBody) 
                : context.requestBody;
              
              diagnosticInfo.requestBodyKeys = Object.keys(body);
              diagnosticInfo.hasRequiredFields = {
                projectId: !!body.projectId,
                templateId: !!body.templateId,
                userId: !!body.userId
              };
              
              // 检查格式
              diagnosticInfo.fieldFormats = {
                projectIdFormat: typeof body.projectId === 'string' ? 
                  (body.projectId.match(/^[a-zA-Z0-9-_]+$/) ? 'valid' : 'invalid') : 'wrong type',
                templateIdFormat: typeof body.templateId === 'string' ? 
                  (body.templateId.match(/^[a-zA-Z0-9-_]+$/) ? 'valid' : 'invalid') : 'wrong type',
                userIdFormat: typeof body.userId === 'string' ? 
                  (body.userId.match(/^[a-zA-Z0-9-_]+$/) ? 'valid' : 'invalid') : 'wrong type'
              };
            } catch (e) {
              diagnosticInfo.requestBodyParseError = e instanceof Error ? e.message : '解析请求体失败';
            }
          }
          break;
          
        case 401:
          errorType = 'Unauthorized';
          possibleCauses = [
            '缺少身份验证令牌',
            '身份验证令牌已过期',
            '身份验证令牌无效'
          ];
          recommendedActions = [
            '检查是否提供了身份验证令牌',
            '重新登录以获取新的令牌',
            '确保令牌格式正确并且未被篡改'
          ];
          break;
          
        case 403:
          errorType = 'Forbidden';
          possibleCauses = [
            '用户没有访问请求资源的权限',
            '账户可能被限制或停用'
          ];
          recommendedActions = [
            '确认用户具有访问该资源的权限',
            '联系管理员检查账户状态'
          ];
          break;
          
        case 404:
          errorType = 'Not Found';
          possibleCauses = [
            'API端点URL不正确',
            '请求的资源不存在',
            '资源可能已被删除'
          ];
          recommendedActions = [
            '检查API端点URL是否正确',
            '确认资源ID是否存在',
            '联系后端开发人员确认API端点'
          ];
          break;
          
        case 429:
          errorType = 'Too Many Requests';
          possibleCauses = [
            '超过API请求频率限制',
            '短时间内发送了过多请求'
          ];
          recommendedActions = [
            '减少请求频率',
            '实现请求限流或退避策略',
            '稍后重试'
          ];
          break;
          
        case 500:
          errorType = 'Internal Server Error';
          possibleCauses = [
            '服务器内部错误',
            '后端代码异常',
            '数据库或依赖服务故障'
          ];
          recommendedActions = [
            '联系后端开发人员或管理员',
            '检查服务器日志',
            '稍后重试'
          ];
          break;
          
        default:
          errorType = statusCode ? `HTTP Error ${statusCode}` : 'Unknown Error';
          possibleCauses = ['未知错误原因'];
          recommendedActions = ['联系技术支持获取帮助'];
      }
      
      // 记录分析结果
      this.error(`HTTP错误分析: ${errorType}`, {
        statusCode,
        possibleCauses,
        recommendedActions,
        diagnosticInfo
      });
      
    } catch (analyzeError) {
      this.error('分析HTTP错误时出现异常', {
        originalError: error,
        analyzeError: analyzeError instanceof Error ? analyzeError.message : analyzeError
      });
    }
    
    return {
      statusCode,
      errorType,
      possibleCauses,
      recommendedActions,
      diagnosticInfo
    };
  }
}

export const logger = new Logger();