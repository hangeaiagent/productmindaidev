import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `[${timestamp}] [${level}] ${message}${metaStr}`;
        })
      )
    })
  ]
});

// 添加详细的日志记录函数
const detailedLogger = {
  projectOperation: (operation: string, details: any) => {
    logger.info(`项目操作: ${operation}`, {
      ...details,
      timestamp: new Date().toISOString(),
      operation_type: 'project'
    });
  },

  duplicateFound: (projectName: string, details: any) => {
    logger.warn(`发现重复项目: ${projectName}`, {
      ...details,
      timestamp: new Date().toISOString(),
      operation_type: 'duplicate_check'
    });
  },

  batchOperation: (batchNumber: number, totalBatches: number, details: any) => {
    logger.info(`批次处理: ${batchNumber}/${totalBatches}`, {
      ...details,
      timestamp: new Date().toISOString(),
      operation_type: 'batch'
    });
  },

  operationStats: (operation: string, stats: any) => {
    logger.info(`操作统计: ${operation}`, {
      ...stats,
      timestamp: new Date().toISOString(),
      operation_type: 'stats'
    });
  },

  operationError: (operation: string, error: any, context?: any) => {
    logger.error(`操作失败: ${operation}`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      context,
      timestamp: new Date().toISOString(),
      operation_type: 'error'
    });
  }
};

export { logger, detailedLogger }; 