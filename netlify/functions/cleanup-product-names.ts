import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { logger } from './utils/logger';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

// 需要清理的文本模式
const CLEANUP_PATTERNS = [
  '使用入口地址 Ai网站最新工具和软件app下载',
  '使用入口地址 Ai模型最新工具和软件app下载',
  '- 智能匹配最适合您的AI产品和网站',
  ' - 智能匹配最适合您的AI产品和网站',
  '智能匹配最适合您的AI产品和网站'
];

// 清理产品名称函数
function cleanProductName(name: string): string {
  let cleanedName = name;
  
  // 移除所有匹配的模式
  for (const pattern of CLEANUP_PATTERNS) {
    cleanedName = cleanedName.replace(pattern, '');
  }
  
  // 清理多余的空格和特殊字符
  cleanedName = cleanedName.trim();
  
  return cleanedName;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    logger.info('🧹 开始清理产品名称', {
      timestamp: new Date().toISOString(),
      userId: DEFAULT_USER_ID
    });

    // 获取所有需要清理的项目
    const { data: projects, error: fetchError } = await supabase
      .from('user_projects')
      .select('id, name, name_zh, name_en')
      .eq('user_id', DEFAULT_USER_ID)
      .or(
        CLEANUP_PATTERNS.map(pattern => `name.ilike.%${pattern}%`).join(',') + ',' +
        CLEANUP_PATTERNS.map(pattern => `name_zh.ilike.%${pattern}%`).join(',') + ',' +
        CLEANUP_PATTERNS.map(pattern => `name_en.ilike.%${pattern}%`).join(',')
      );

    if (fetchError) {
      throw fetchError;
    }

    if (!projects || projects.length === 0) {
      logger.info('✅ 没有找到需要清理的项目');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '没有找到需要清理的项目',
          summary: {
            totalFound: 0,
            totalCleaned: 0,
            errors: 0
          }
        })
      };
    }

    logger.info('📋 找到需要清理的项目', {
      totalProjects: projects.length
    });

    const cleanedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];

    // 批量清理项目名称
    for (const project of projects) {
      try {
        const originalName = project.name;
        const originalNameZh = project.name_zh;
        const originalNameEn = project.name_en;

        // 清理各个字段
        const cleanedName = cleanProductName(originalName || '');
        const cleanedNameZh = cleanProductName(originalNameZh || '');
        const cleanedNameEn = cleanProductName(originalNameEn || '');

        // 检查是否有变化
        const hasChanges = 
          cleanedName !== originalName ||
          cleanedNameZh !== originalNameZh ||
          cleanedNameEn !== originalNameEn;

        if (!hasChanges) {
          logger.info('⏭️ 项目无需清理，跳过', {
            projectId: project.id,
            projectName: originalName
          });
          continue;
        }

        // 更新数据库
        const { data: updatedProject, error: updateError } = await supabase
          .from('user_projects')
          .update({
            name: cleanedName,
            name_zh: cleanedNameZh,
            name_en: cleanedNameEn,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        cleanedProjects.push({
          id: project.id,
          originalName,
          cleanedName,
          changes: {
            name: originalName !== cleanedName,
            name_zh: originalNameZh !== cleanedNameZh,
            name_en: originalNameEn !== cleanedNameEn
          }
        });

        logger.info('✅ 项目名称清理成功', {
          projectId: project.id,
          originalName,
          cleanedName,
          removedText: originalName.replace(cleanedName, '').trim()
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          project: project.name || project.id,
          error: errorMessage
        });
        logger.error('❌ 项目名称清理失败', {
          projectId: project.id,
          projectName: project.name,
          error: errorMessage
        });
      }
    }

    logger.info('🎉 产品名称清理完成', {
      totalFound: projects.length,
      totalCleaned: cleanedProjects.length,
      errors: errors.length
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        summary: {
          totalFound: projects.length,
          totalCleaned: cleanedProjects.length,
          errors: errors.length
        },
        cleanedProjects: cleanedProjects.map(p => ({
          id: p.id,
          originalName: p.originalName,
          cleanedName: p.cleanedName,
          changes: p.changes
        })),
        errors,
        cleanupPatterns: CLEANUP_PATTERNS
      })
    };

  } catch (error) {
    logger.error('❌ 产品名称清理失败', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 