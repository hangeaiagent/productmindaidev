import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || '服务器内部错误';

  // 记录错误日志
  logger.error('请求处理错误', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      ip: req.ip
    }
  });

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      error: message,
      stack: error.stack,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
    return;
  }

  // 生产环境返回简化错误信息
  res.status(statusCode).json({
    error: statusCode >= 500 ? '服务器内部错误' : message,
    statusCode,
    timestamp: new Date().toISOString()
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 