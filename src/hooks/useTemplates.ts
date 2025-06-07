import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Template, TemplateCategory } from '../types';
import { logger } from '../utils/logger';

export function useTemplates(projectId?: string) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // Initial delay of 1 second

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Check network connectivity
        if (!navigator.onLine) {
          throw new Error('网络连接已断开，请检查您的网络连接后重试');
        }

        logger.log('开始获取模板数据', { projectId });
        logger.log('构建查询', { hasProjectId: !!projectId });

        // 获取分类数据
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('template_categories')
          .select('*')
          .eq('isshow', 1)
          .order('no');

        if (categoriesError) {
          throw new Error(`获取分类失败: ${categoriesError.message}`);
        }

        // 构建基础查询
        let query = supabase
          .from('templates')
          .select(`
            *,
            category:template_categories (
              id,
              name_en,
              name_zh,
              description_en,
              description_zh,
              no
            )${projectId ? `,
            versions:template_versions (
              id,
              input_content,
              output_content,
              created_at,
              created_by,
              is_active,
              version_number,
              project_id
            )
            ` : ''}`)
          .order('category(no)', { ascending: true })
          .order('no', { ascending: true });

        // 如果有 projectId，添加版本过滤条件
        if (projectId) {
          query = query.eq('versions.project_id', projectId);
        }
        
        logger.log('执行模板查询', { 
          hasProjectId: !!projectId,
          includesVersions: !!projectId
        });

        const { data: templatesData, error: templatesError } = await query;

        if (templatesError) {
          logger.error('查询失败', { error: templatesError });
          throw new Error(templatesError.message);
        }

        if (isMounted) {
          setCategories(categoriesData || []);
          setTemplates(templatesData || []);
          logger.log('模板数据加载完成', {
            templatesCount: templatesData?.length || 0,
            categoriesCount: categoriesData?.length || 0,
            projectId
          });
          setError(null);
          retryCount = 0; // Reset retry count on success
        }
      } catch (err) {
        if (!isMounted) return;

        const errorMessage = err instanceof Error ? err.message : '加载数据失败';
        logger.error('获取模板数据失败', { error: errorMessage });

        // Implement retry logic for network errors
        if (retryCount < maxRetries && (err instanceof Error && err.message.includes('Failed to fetch'))) {
          retryCount++;
          const delay = retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
          logger.log(`重试获取模板数据 (${retryCount}/${maxRetries})，等待 ${delay}ms`);
          
          setTimeout(() => {
            if (isMounted) {
              fetchData();
            }
          }, delay);
          return;
        }

        setError(errorMessage);
        setCategories([]);
        setTemplates([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    // Add network status event listeners
    const handleOnline = () => {
      if (isMounted && error) {
        fetchData(); // Retry when connection is restored
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => {
      if (isMounted) {
        setError('网络连接已断开，请检查您的网络连接后重试');
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', () => {});
    };
  }, [projectId]);

  return {
    templates,
    categories,
    loading,
    error,
    refetch: async () => {
      setLoading(true);
      setError(null);
      try {
        if (!navigator.onLine) {
          throw new Error('网络连接已断开，请检查您的网络连接后重试');
        }

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('template_categories')
          .select('*')
          .eq('isshow', 1)
          .order('no');

        if (categoriesError) throw categoriesError;

        let query = supabase
          .from('templates')
          .select(`
            *,
            category:template_categories (
              id,
              name_en,
              name_zh,
              description_en,
              description_zh,
              no
            ),
            versions:template_versions (
              id,
              input_content,
              output_content,
              created_at,
              created_by,
              is_active,
              version_number
            )
          `)
          .order('category(no)', { ascending: true })
          .order('no', { ascending: true });
 logger.log('添加 projectId 筛选条件##', { projectId });
        if (projectId) {
          logger.log('添加 projectId 筛选条件', { projectId });
          query = query.eq('versions.project_id', projectId);
        }

        const { data: templatesData, error: templatesError } = await query;

        if (templatesError) throw templatesError;
            
        logger.log('重新获取数据成功', {
          templatesCount: templatesData?.length || 0,
          categoriesCount: categoriesData?.length || 0
        });
            
        setCategories(categoriesData || []);
        setTemplates(templatesData || []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载数据失败';
        logger.error('重新获取数据失败', { error: errorMessage });
        setError(errorMessage);
        setCategories([]);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }
  };
}