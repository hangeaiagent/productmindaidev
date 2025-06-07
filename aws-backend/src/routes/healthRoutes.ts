import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// 基础健康检查
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || 'v1',
    memory: process.memoryUsage(),
    pid: process.pid
  };

  logger.info('健康检查请求', healthCheck);
  res.status(200).json(healthCheck);
}));

// 详细健康检查
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || 'v1',
    memory: process.memoryUsage(),
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    loadAverage: process.platform !== 'win32' ? (process as any).loadavg?.() : null,
    cpuUsage: process.cpuUsage()
  };

  res.status(200).json(detailedHealth);
}));

// 就绪检查（用于容器编排）
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  // 这里可以检查数据库连接、Redis连接等
  try {
    // TODO: 添加实际的依赖服务检查
    const readyCheck = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'ok', // 实际应该检查Redis连接
        database: 'ok' // 实际应该检查数据库连接
      }
    };

    res.status(200).json(readyCheck);
  } catch (error) {
    logger.error('就绪检查失败', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Service dependencies not available'
    });
  }
}));

// 存活检查（用于容器编排）
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}));

export default router; 