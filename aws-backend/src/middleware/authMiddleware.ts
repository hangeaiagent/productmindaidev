import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError('未提供有效的认证令牌', 401));
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      logger.error('JWT_SECRET环境变量未设置');
      return next(createError('服务器配置错误', 500));
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      req.user = {
        id: decoded.sub || decoded.userId,
        email: decoded.email
      };
      
      logger.debug('用户认证成功', { userId: req.user.id, email: req.user.email });
      next();
    } catch (jwtError) {
      logger.warn('JWT验证失败', { error: jwtError, token: token.substring(0, 20) + '...' });
      return next(createError('无效的认证令牌', 401));
    }
  } catch (error) {
    logger.error('认证中间件错误', error);
    return next(createError('认证处理失败', 500));
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  return authMiddleware(req, res, next);
}; 