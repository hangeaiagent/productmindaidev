import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { logger } from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 验证 Supabase 配置
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error(
    '缺少必要的 Supabase 配置。请确保在 .env 文件中设置了 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。'
  );
  throw new Error('Supabase configuration missing');
}

// 验证 URL 格式并确保使用 HTTPS
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:') {
    logger.error('Supabase URL 必须使用 HTTPS 协议');
    throw new Error('Supabase URL must use HTTPS protocol');
  }
} catch (error) {
  logger.error(
    `Supabase URL 格式无效: ${supabaseUrl}。请检查 VITE_SUPABASE_URL 环境变量。`
  );
  throw new Error('Invalid Supabase URL format');
}

// 创建 Supabase 客户端实例
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          try {
            const value = localStorage.getItem(key);
            logger.debug('获取存储项', { key, hasValue: !!value });
            return value;
          } catch (error) {
            logger.error('读取存储项失败', { key, error });
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            logger.debug('设置存储项', { key });
            localStorage.setItem(key, value);
          } catch (error) {
            logger.error('设置存储项失败', { key, error });
          }
        },
        removeItem: (key) => {
          try {
            logger.debug('移除存储项', { key });
            localStorage.removeItem(key);
          } catch (error) {
            logger.error('移除存储项失败', { key, error });
          }
        }
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.39.7',
      },
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// 测试连接并获取数据库信息
export async function testConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`测试 Supabase 连接... (尝试 ${attempt}/${retries})`);
      
      const { data, error } = await supabase
        .from('template_categories')
        .select('count')
        .limit(1)
        .timeout(5000); // 5秒超时
      
      if (error) {
        throw error;
      }

      logger.info('Supabase 连接成功!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Supabase 连接测试失败 (尝试 ${attempt}/${retries}):`, errorMessage);
      
      if (attempt < retries) {
        logger.info(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // 指数退避
        delay *= 2;
      } else {
        logger.error('Supabase 连接测试最终失败');
        return false;
      }
    }
  }
  return false;
}

// 导出一个用于检查连接状态的函数
export async function checkConnection(): Promise<void> {
  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error('无法连接到 Supabase 服务。请检查您的网络连接和 Supabase 配置。');
  }
}