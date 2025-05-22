import { supabase } from '../lib/supabase';
import { logger } from './logger';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

export class FunctionCaller {
  private static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async callWithRetry<T>(
    functionName: string,
    body: any,
    options: RetryOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 5000
    } = options;

    let lastError = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.log(`调用函数 ${functionName} (尝试 ${attempt}/${maxRetries})`, {
          functionName,
          attempt,
          body: JSON.stringify(body)
        });

        // 构建函数URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co';
        const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
        
        // 获取会话令牌和API密钥
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token || '';
        const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        // 直接使用fetch API而不是supabase.functions.invoke
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': apiKey
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`函数调用失败: ${response.status} ${errorText}`);
          logger.error(`函数调用失败 (尝试 ${attempt}/${maxRetries})`, {
            error: lastError,
            functionName,
            attempt,
            status: response.status
          });
          
          // 如果是最后一次尝试，直接返回错误
          if (attempt === maxRetries) {
            return { data: null, error: lastError };
          }
        } else {
          // 调用成功，返回结果
          const data = await response.json();
          return { data, error: null };
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        await FunctionCaller.delay(delay);

      } catch (error) {
        lastError = error;
        logger.error(`函数调用异常 (尝试 ${attempt}/${maxRetries})`, {
          error,
          functionName,
          attempt
        });

        if (attempt === maxRetries) {
          return { data: null, error: lastError };
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        await FunctionCaller.delay(delay);
      }
    }

    return { data: null, error: lastError };
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