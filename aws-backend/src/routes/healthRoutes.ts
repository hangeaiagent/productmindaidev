import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

// 健康检查路由
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router; 