import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis重试次数超过10次');
            return new Error('重试次数超限');
          }
          // 指数退避重试，最大3秒
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000
      }
    });

    redisClient.on('error', (error: Error) => {
      logger.error('Redis客户端错误:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis连接建立');
    });

    redisClient.on('ready', () => {
      logger.info('Redis客户端就绪');
    });

    redisClient.on('end', () => {
      logger.info('Redis连接结束');
    });

    await redisClient.connect();
    logger.info('✅ Redis连接成功');
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis连接失败:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化，请先调用connectRedis()');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis连接已关闭');
  }
};