import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// 确保在服务启动时加载环境变量
const envPath = path.resolve(__dirname, '../../.env');
console.log('🔍 尝试加载Supabase配置文件:', envPath);
dotenv.config({ path: envPath });

// 兼容不同的环境变量命名方式
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase配置状态:', {
  SUPABASE_URL: !!supabaseUrl,
  SUPABASE_ANON_KEY: !!supabaseKey,
  envPath
});

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase配置缺失，将使用模拟数据模式');
  console.warn('环境变量状态:', {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY
  });
}

// 如果没有配置，创建一个模拟的客户端
let supabase: any;
if (supabaseUrl && supabaseKey) {
  console.log('🔌 正在初始化Supabase客户端...');
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  console.log('✅ Supabase客户端初始化成功');
} else {
  console.warn('⚠️ 未找到Supabase配置，将使用模拟客户端');
  // 模拟客户端，用于测试
  supabase = {
    from: (table: string) => ({
      select: () => ({
        data: [],
        error: null
      }),
      insert: () => ({
        data: null,
        error: null
      }),
      eq: () => ({}),
      single: () => ({
        data: null,
        error: null
      })
    })
  };
}

export { supabase };

// 模板接口
export interface Template {
  id: string;
  category_id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  prompt_content: string;
  no: number;
}

// 项目接口
export interface Project {
  id: string;
  name: string;
  description: string;
  website_url?: string;
  user_id: string;
  is_default: boolean;
  primary_category?: string;
  secondary_category?: string;
  template_generation_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  template_generation_completed?: boolean;
  template_generation_started_at?: string;
  template_generation_completed_at?: string;
  template_generation_progress?: number;
  template_generation_error?: string;
}

// 模板版本接口
export interface TemplateVersion {
  id: string;
  template_id: string;
  project_id: string;
  created_by: string;
  input_content: string;
  output_content: any;
  version_number: number;
  is_active: boolean;
  created_at: string;
}

/**
 * 获取模板列表
 */
export async function getTemplates(options: {
  categoryCode?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { categoryCode, limit = 50, offset = 0 } = options;

  try {
    let query = supabase
      .from('templates')
      .select(`
        *,
        template_categories!inner(*)
      `)
      .order('no');

    if (categoryCode) {
      query = query.eq('template_categories.id', categoryCode);
    }

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('获取模板失败', error);
      throw error;
    }

    return data as Template[];
  } catch (error) {
    logger.error('获取模板异常', error);
    throw error;
  }
}

/**
 * 获取项目列表
 */
export async function getProjects(options: {
  userId?: string;
  tableName?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { userId, tableName = 'user_projects', limit = 50, offset = 0 } = options;

  try {
    let query = supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('获取项目失败', error);
      throw error;
    }

    return data as Project[];
  } catch (error) {
    logger.error('获取项目异常', error);
    throw error;
  }
}

/**
 * 获取单个项目详情
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 没有找到记录
      }
      logger.error('获取项目详情失败', error);
      throw error;
    }

    return data as Project;
  } catch (error) {
    logger.error('获取项目详情异常', error);
    throw error;
  }
}

/**
 * 检查模板版本是否存在
 */
export async function checkExistingVersion(
  templateId: string,
  projectId: string,
  language: string = 'zh'
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('template_versions')
      .select('version_number')
      .eq('template_id', templateId)
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('检查版本失败', error);
      return 1;
    }

    return data && data.length > 0 ? data[0].version_number + 1 : 1;
  } catch (error) {
    logger.error('版本检查异常', error);
    return 1;
  }
}

/**
 * 保存模板版本（支持中英文双语内容）
 */
export async function saveTemplateVersion(version: {
  template_id: string;
  project_id: string;
  created_by: string;
  input_content: string;
  output_content?: any;
  output_content_zh?: any;
  output_content_en?: any;
  version_number?: number;
}): Promise<TemplateVersion> {
  try {
    const insertData: any = {
      template_id: version.template_id,
      project_id: version.project_id,
      created_by: version.created_by,
      input_content: version.input_content,
      is_active: true
    };

    // 处理双语内容
    if (version.output_content_zh || version.output_content_en) {
      if (version.output_content_zh) {
        insertData.output_content_zh = version.output_content_zh;
      }
      if (version.output_content_en) {
        insertData.output_content_en = version.output_content_en;
      }
    } else if (version.output_content) {
      insertData.output_content = version.output_content;
    }

    const { data, error } = await supabase
      .from('template_versions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('保存模板版本失败', error);
      throw error;
    }

    logger.info('模板版本保存成功', { versionId: data.id });
    return data as TemplateVersion;
  } catch (error) {
    logger.error('保存模板版本异常', error);
    throw error;
  }
}

/**
 * 获取模板版本历史
 */
export async function getTemplateVersions(
  templateId: string,
  projectId?: string
): Promise<TemplateVersion[]> {
  try {
    let query = supabase
      .from('template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('获取模板版本失败', error);
      throw error;
    }

    return data as TemplateVersion[];
  } catch (error) {
    logger.error('获取模板版本异常', error);
    throw error;
  }
}

/**
 * 获取单个模板详情
 */
export async function getTemplateById(templateId: string): Promise<Template | null> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 没有找到记录
      }
      logger.error('获取模板详情失败', error);
      throw error;
    }

    return data as Template;
  } catch (error) {
    logger.error('获取模板详情异常', error);
    throw error;
  }
}

/**
 * 根据ID列表获取模板
 */
export async function getTemplatesByIds(templateIds: string[]): Promise<Template[]> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .in('id', templateIds)
      .order('no', { ascending: true });

    if (error) {
      logger.error('获取模板列表失败', error);
      throw error;
    }

    return data as Template[];
  } catch (error) {
    logger.error('获取模板列表异常', error);
    throw error;
  }
}

/**
 * 检查模板版本是否存在（不区分语言）
 */
export async function getTemplateVersion(
  templateId: string,
  projectId: string,
  language?: string
): Promise<TemplateVersion | null> {
  try {
    const { data, error } = await supabase
      .from('template_versions')
      .select('*')
      .eq('template_id', templateId)
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 没有找到记录
      }
      logger.error('检查模板版本失败', error);
      throw error;
    }

    return data as TemplateVersion;
  } catch (error) {
    logger.error('检查模板版本异常', error);
    throw error;
  }
}

/**
 * 获取项目的模板版本列表
 */
export async function getTemplateVersionsByProject(
  projectId: string,
  options?: { language?: string; template_id?: string }
): Promise<TemplateVersion[]> {
  try {
    let query = supabase
      .from('template_versions')
      .select(`
        *,
        templates:template_id (
          name_zh,
          name_en,
          category_id
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (options?.template_id) {
      query = query.eq('template_id', options.template_id);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('获取项目模板版本失败', error);
      throw error;
    }

    return data as TemplateVersion[];
  } catch (error) {
    logger.error('获取项目模板版本异常', error);
    throw error;
  }
}

/**
 * 保存生成的模板版本（用于批量生成）
 */
export async function saveGeneratedTemplateVersion(version: {
  template_id: string;
  project_id: string;
  user_id: string;
  language: string;
  content: string;
  version: string;
  status: string;
}): Promise<TemplateVersion> {
  try {
    const { data, error } = await supabase
      .from('template_versions')
      .insert({
        template_id: version.template_id,
        project_id: version.project_id,
        created_by: version.user_id,
        input_content: `Language: ${version.language}`,
        output_content: version.content,
        language: version.language,
        version: version.version,
        status: version.status,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('保存生成的模板版本失败', error);
      throw error;
    }

    logger.info('生成的模板版本保存成功', { 
      versionId: data.id, 
      templateId: version.template_id,
      language: version.language 
    });
    return data as TemplateVersion;
  } catch (error) {
    logger.error('保存生成的模板版本异常', error);
    throw error;
  }
}

/**
 * 更新项目模板生成状态
 */
export async function updateProjectTemplateStatus(
  projectId: string,
  status: {
    template_generation_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    template_generation_completed?: boolean;
    template_generation_started_at?: string;
    template_generation_completed_at?: string;
    template_generation_progress?: number;
    template_generation_error?: string;
  }
): Promise<Project | null> {
  try {
    const updateData: any = {};
    
    if (status.template_generation_status !== undefined) {
      updateData.template_generation_status = status.template_generation_status;
    }
    if (status.template_generation_completed !== undefined) {
      updateData.template_generation_completed = status.template_generation_completed;
    }
    if (status.template_generation_started_at !== undefined) {
      updateData.template_generation_started_at = status.template_generation_started_at;
    }
    if (status.template_generation_completed_at !== undefined) {
      updateData.template_generation_completed_at = status.template_generation_completed_at;
    }
    if (status.template_generation_progress !== undefined) {
      updateData.template_generation_progress = status.template_generation_progress;
    }
    if (status.template_generation_error !== undefined) {
      updateData.template_generation_error = status.template_generation_error;
    }

    const { data, error } = await supabase
      .from('user_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logger.error('更新项目模板生成状态失败', error);
      throw error;
    }

    logger.info('项目模板生成状态更新成功', { 
      projectId, 
      status: status.template_generation_status,
      progress: status.template_generation_progress 
    });
    return data as Project;
  } catch (error) {
    logger.error('更新项目模板生成状态异常', error);
    throw error;
  }
}

/**
 * 获取需要生成模板的项目（未完成或失败的项目）
 */
export async function getProjectsNeedingTemplateGeneration(
  userId: string,
  limit: number = 50
): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', userId)
      .not('primary_category', 'is', null)
      .or('template_generation_completed.is.null,template_generation_completed.eq.false,template_generation_status.eq.failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('获取需要生成模板的项目失败', error);
      throw error;
    }

    return data as Project[];
  } catch (error) {
    logger.error('获取需要生成模板的项目异常', error);
    throw error;
  }
}

/**
 * 获取项目模板生成统计信息
 */
export async function getProjectTemplateStats(userId: string): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
}> {
  try {
    const { data, error } = await supabase
      .from('user_projects')
      .select('template_generation_status, template_generation_completed')
      .eq('user_id', userId)
      .not('primary_category', 'is', null);

    if (error) {
      logger.error('获取项目模板统计失败', error);
      throw error;
    }

    const stats = {
      total: data.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0
    };

    data.forEach((project: any) => {
      if (project.template_generation_completed) {
        stats.completed++;
      } else {
        switch (project.template_generation_status) {
          case 'pending':
            stats.pending++;
            break;
          case 'in_progress':
            stats.in_progress++;
            break;
          case 'failed':
            stats.failed++;
            break;
          default:
            stats.pending++;
        }
      }
    });

    return stats;
  } catch (error) {
    logger.error('获取项目模板统计异常', error);
    throw error;
  }
} 