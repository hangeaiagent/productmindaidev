import { supabase } from '../lib/supabase';
import { logger } from './logger';

export interface FunctionCallOptions {
  retries?: number;
  timeout?: number;
  backoff?: boolean;
  maxDelay?: number;
}

export class FunctionCaller {
  private static readonly DEFAULT_OPTIONS: Required<FunctionCallOptions> = {
    retries: 3,
    timeout: 30000,
    backoff: true,
    maxDelay: 10000
  };

  static async callFunction<T>(
    functionName: string,
    body: any = {},
    options: FunctionCallOptions = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let delay = 1000;

    for (let attempt = 1; attempt <= opts.retries; attempt++) {
      try {
        logger.info(`调用函数 ${functionName}`, { attempt, body });

        // 使用正确的环境变量获取方式
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('缺少 VITE_SUPABASE_URL 环境变量');
        }

        // 构建函数URL
        const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
        
        // 获取会话令牌
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token || '';
        
        // 直接使用fetch API而不是supabase.functions.invoke
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        logger.info(`函数 ${functionName} 调用成功`, { attempt });
        return data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(`函数 ${functionName} 调用失败`, {
          attempt,
          error: lastError.message,
          stack: lastError.stack
        });

        if (attempt < opts.retries) {
          if (opts.backoff) {
            logger.info(`等待 ${delay}ms 后重试...`);
            await this.sleep(delay);
            delay = Math.min(delay * 2, opts.maxDelay);
          } else {
            await this.sleep(1000);
          }
        }
      }
    }

    throw new Error(
      `函数 ${functionName} 在 ${opts.retries} 次尝试后仍然失败: ${lastError?.message}`
    );
      }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async batchProcess<T>(
    items: any[],
    processor: (item: any) => Promise<T>,
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<(T | null)[]> {
    const {
      batchSize = 3,
      delayBetweenBatches = 1000,
      onProgress
    } = options;

    const results: (T | null)[] = [];
    const total = items.length;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));
      
      logger.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(total / batchSize)}`, {
        batchSize: batch.length,
        totalProcessed: i,
        totalItems: total
      });

      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            return await processor(item);
          } catch (error) {
            logger.error('批处理项目失败', { error, item });
            return null;
          }
        })
      );

      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }

      if (i + batchSize < items.length) {
        await FunctionCaller.delay(delayBetweenBatches);
      }
    }

    return results;
  }
} 