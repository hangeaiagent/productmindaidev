import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// CommonJS 不需要 __dirname 替代方案
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

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

// 初始化Supabase客户端
let supabase: any;
if (supabaseUrl && supabaseKey) {
  console.log('🔌 正在初始化Supabase客户端...');
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'productmind-ai'
        }
      }
    });
    console.log('✅ Supabase客户端初始化成功');
  } catch (initError) {
    console.error('❌ Supabase客户端初始化失败:', initError);
    throw initError;
  }
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

// AI产品创意接口
export interface AIProductIdea {
  id: string;
  temp_user_id: string;
  requirement: string;
  analysis_result: any;
  language: string;
  created_at: string;
  updated_at?: string;
}

/**
 * 保存AI产品创意分析结果
 */
export async function saveAIProductIdea(ideaData: {
  tempUserId: string;
  requirement: string;
  analysisResult: any;
  language: string;
}): Promise<AIProductIdea> {
  try {
    logger.info('[AWS API] 开始保存AI产品创意...', {
      tempUserId: ideaData.tempUserId,
      requirementLength: ideaData.requirement?.length,
      language: ideaData.language
    });

    // 检查是否已存在相同用户和需求的记录
    const { data: existingData, error: checkError } = await supabase
      .from('ai_product_ideas')
      .select('id')
      .eq('temp_user_id', ideaData.tempUserId)
      .eq('requirement', ideaData.requirement)
      .single();

    logger.info('[AWS API] 现有记录检查结果:', {
      foundExisting: !!existingData,
      existingId: existingData?.id,
      checkError: checkError?.code
    });

    let data;
    let error;

    if (existingData) {
      logger.info('[AWS API] 更新现有记录...', existingData.id);
      // 更新现有记录
      const updateResult = await supabase
        .from('ai_product_ideas')
        .update({
          analysis_result: ideaData.analysisResult,
          language: ideaData.language,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select()
        .single();
      
      data = updateResult.data;
      error = updateResult.error;
      logger.info('[AWS API] 更新结果:', {
        success: !error,
        id: data?.id,
        error: error?.message
      });
    } else {
      logger.info('[AWS API] 创建新记录...');
      // 创建新记录
      const insertResult = await supabase
        .from('ai_product_ideas')
        .insert({
          temp_user_id: ideaData.tempUserId,
          requirement: ideaData.requirement,
          analysis_result: ideaData.analysisResult,
          language: ideaData.language
        })
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
      logger.info('[AWS API] 插入结果:', {
        success: !error,
        id: data?.id,
        error: error?.message
      });
    }

    if (error) {
      logger.error('[AWS API] 数据库操作失败:', {
        error: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    logger.info('[AWS API] ✅ AI产品创意保存成功:', {
      id: data.id,
      operation: existingData ? 'update' : 'create'
    });

    return data as AIProductIdea;
  } catch (error) {
    logger.error('[AWS API] 保存AI产品创意异常:', error);
    throw error;
  }
}

/**
 * 根据ID获取AI产品创意
 */
export async function getAIProductIdeaById(id: string): Promise<AIProductIdea | null> {
  try {
    logger.info('[AWS API] 获取AI产品创意:', { id });

    const { data, error } = await supabase
      .from('ai_product_ideas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.info('[AWS API] AI产品创意不存在:', { id });
        return null;
      }
      logger.error('[AWS API] 获取AI产品创意失败:', error);
      throw error;
    }

    logger.info('[AWS API] ✅ AI产品创意获取成功:', { id, language: data.language });
    return data as AIProductIdea;
  } catch (error) {
    logger.error('[AWS API] 获取AI产品创意异常:', error);
    throw error;
  }
}

/**
 * 生成SEO友好的HTML页面内容
 */
export function generateSEOPage(data: AIProductIdea): string {
  const { id, requirement, analysis_result, language, created_at } = data;
  const analysis = typeof analysis_result === 'string' ? JSON.parse(analysis_result) : analysis_result;
  
  const isZh = language === 'zh';
  const title = isZh ? 'AI产品创意分析报告' : 'AI Product Idea Analysis Report';
  const description = isZh 
    ? `${requirement.substring(0, 150)}...` 
    : `AI-powered analysis for: ${requirement.substring(0, 150)}...`;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isZh ? 'zh-CN' : 'en-US');
  };

  const renderMVP = (mvp: any) => {
    if (!mvp) return '';
    
    return `
      <section class="mvp-section">
        <h2 class="section-title">
          <span class="icon">💡</span>
          ${isZh ? '最小可行产品 (MVP)' : 'Minimum Viable Product (MVP)'}
        </h2>
        <div class="mvp-content">
          <h3 class="mvp-title">${mvp.title || ''}</h3>
          <p class="mvp-description">${mvp.description || ''}</p>
          
          <div class="mvp-grid">
            <div class="mvp-item">
              <h4>${isZh ? '核心功能' : 'Core Features'}</h4>
              <ul>
                ${(mvp.coreFeatures || []).map((feature: string) => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            
            <div class="mvp-item">
              <h4>${isZh ? '目标用户' : 'Target Users'}</h4>
              <ul>
                ${(mvp.targetUsers || []).map((user: string) => `<li>${user}</li>`).join('')}
              </ul>
            </div>
            
            <div class="mvp-item">
              <h4>${isZh ? '商业模式' : 'Business Model'}</h4>
              <p>${mvp.businessModel || ''}</p>
            </div>
          </div>
        </div>
      </section>
    `;
  };

  const renderTechnicalSolution = (tech: any) => {
    if (!tech) return '';
    
    return `
      <section class="tech-section">
        <h2 class="section-title">
          <span class="icon">🔧</span>
          ${isZh ? 'AI技术方案' : 'AI Technical Solution'}
        </h2>
        
        ${tech.recommendedModels ? `
          <div class="recommended-models">
            <h3>${isZh ? '推荐模型' : 'Recommended Models'}</h3>
            <div class="models-grid">
              ${tech.recommendedModels.map((model: any) => `
                <div class="model-card">
                  <h4>${model.name} <span class="provider">(${model.provider})</span></h4>
                  <p>${model.reason}</p>
                  <div class="pricing">${isZh ? '价格' : 'Pricing'}: ${model.pricing}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${tech.keyAlgorithms && tech.keyAlgorithms.length > 0 ? `
          <div class="algorithms">
            <h3>${isZh ? '关键算法' : 'Key Algorithms'}</h3>
            <div class="algorithm-tags">
              ${tech.keyAlgorithms.map((algo: string) => `<span class="algorithm-tag">${algo}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${tech.mcpTools && tech.mcpTools.length > 0 ? `
          <div class="mcp-tools">
            <h3>${isZh ? 'MCP工具' : 'MCP Tools'}</h3>
            <div class="tools-grid">
              ${tech.mcpTools.map((tool: any) => `
                <div class="tool-card">
                  <h4>${tool.name}</h4>
                  <p><strong>${isZh ? '用途' : 'Purpose'}:</strong> ${tool.purpose}</p>
                  <p><strong>${isZh ? '实现' : 'Implementation'}:</strong> ${tool.implementation}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </section>
    `;
  };

  const renderDevelopmentModules = (modules: any[]) => {
    if (!modules || !Array.isArray(modules)) return '';
    
    return `
      <section class="modules-section">
        <h2 class="section-title">
          <span class="icon">⚙️</span>
          ${isZh ? '开发模块' : 'Development Modules'}
        </h2>
        <div class="modules-grid">
          ${modules.map((module, index) => `
            <div class="module-card">
              <div class="module-header">
                <h3>${index + 1}. ${module.moduleName}</h3>
                <div class="module-meta">
                  <span class="priority priority-${module.priority?.toLowerCase()}">${module.priority}</span>
                  <span class="time">${module.estimatedTime}</span>
                </div>
              </div>
              <p class="module-desc">${module.functionality}</p>
              
              ${module.cursorPrompts && module.cursorPrompts.length > 0 ? `
                <div class="cursor-prompts">
                  <h4>${isZh ? 'Cursor提示词文件' : 'Cursor Prompt Files'}:</h4>
                  <div class="prompt-files">
                    ${module.cursorPrompts.map((prompt: any) => `
                      <span class="file-tag">${prompt.fileName}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  // 转义HTML内容防止XSS
  const safeRequirement = requirement.replace(/[<>'"&]/g, (char) => {
    const entities: { [key: string]: string } = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
    return entities[char];
  });
  
  const safeDescription = description.replace(/[<>'"&]/g, (char) => {
    const entities: { [key: string]: string } = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
    return entities[char];
  });

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ProductMind AI</title>
  <meta name="description" content="${safeDescription}">
  <meta name="keywords" content="${isZh ? 'AI产品分析,产品创意,最小可行产品,技术方案,ProductMind AI' : 'AI product analysis,product ideas,MVP,technical solution,ProductMind AI'}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title} - ProductMind AI">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://productmindai.com/shortproject/${id}">
  <meta property="og:site_name" content="ProductMind AI">
  <meta property="og:image" content="https://productmindai.com/og-image.png">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} - ProductMind AI">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="https://productmindai.com/og-image.png">
  
  <link rel="canonical" href="https://productmindai.com/shortproject/${id}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "${safeDescription}",
    "author": {
      "@type": "Organization",
      "name": "ProductMind AI"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ProductMind AI",
      "logo": {
        "@type": "ImageObject",
        "url": "https://productmindai.com/logo.png"
      }
    },
    "datePublished": "${created_at}",
    "dateModified": "${created_at}",
    "url": "https://productmindai.com/shortproject/${id}",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://productmindai.com/shortproject/${id}"
    }
  }
  </script>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f8fafc;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    
    .requirement-box {
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
    }
    
    .requirement-box h3 {
      margin-bottom: 10px;
      font-size: 1.2rem;
    }
    
    .requirement-text {
      font-size: 1.1rem;
      line-height: 1.7;
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #fff;
    }
    
    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 30px;
      color: #2d3748;
    }
    
    .section-title .icon {
      font-size: 2rem;
    }
    
    section {
      background: white;
      margin-bottom: 30px;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    
    .mvp-content h3 {
      font-size: 1.5rem;
      color: #2d3748;
      margin-bottom: 15px;
    }
    
    .mvp-description {
      font-size: 1.1rem;
      color: #4a5568;
      margin-bottom: 30px;
      line-height: 1.7;
    }
    
    .mvp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    
    .mvp-item h4 {
      font-size: 1.2rem;
      color: #2d3748;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .mvp-item ul {
      list-style: none;
    }
    
    .mvp-item li {
      padding: 8px 0;
      padding-left: 20px;
      position: relative;
      color: #4a5568;
    }
    
    .mvp-item li:before {
      content: \"▸\";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }
    
    .models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .model-card {
      background: #f7fafc;
      padding: 25px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .model-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }
    
    .model-card h4 {
      font-size: 1.2rem;
      color: #2d3748;
      margin-bottom: 10px;
    }
    
    .provider {
      font-size: 0.9rem;
      color: #667eea;
      font-weight: normal;
    }
    
    .pricing {
      margin-top: 15px;
      padding: 8px 12px;
      background: #e6fffa;
      color: #234e52;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    
    .algorithm-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }
    
    .algorithm-tag {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .tool-card {
      background: #f7fafc;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    
    .tool-card h4 {
      color: #2d3748;
      margin-bottom: 15px;
      font-size: 1.1rem;
    }
    
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 25px;
    }
    
    .module-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }
    
    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .module-header h3 {
      color: #2d3748;
      font-size: 1.2rem;
      flex: 1;
    }
    
    .module-meta {
      display: flex;
      gap: 10px;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .priority {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .priority-high {
      background: #fed7d7;
      color: #c53030;
    }
    
    .priority-medium {
      background: #feebc8;
      color: #c05621;
    }
    
    .priority-low {
      background: #c6f6d5;
      color: #2f855a;
    }
    
    .time {
      font-size: 0.9rem;
      color: #718096;
    }
    
    .module-desc {
      color: #4a5568;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    
    .cursor-prompts h4 {
      color: #2d3748;
      font-size: 1rem;
      margin-bottom: 10px;
    }
    
    .prompt-files {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .file-tag {
      background: #e2e8f0;
      color: #4a5568;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-family: monospace;
    }
    
    .footer {
      text-align: center;
      margin-top: 60px;
      padding: 40px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    
    .footer-content {
      color: #718096;
      margin-bottom: 20px;
    }
    
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    
    .footer-links a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    
    .footer-links a:hover {
      color: #764ba2;
    }
    
    .meta-info {
      font-size: 0.9rem;
      color: #718096;
      margin-top: 10px;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }
      
      .header h1 {
        font-size: 2rem;
      }
      
      section {
        padding: 25px;
      }
      
      .mvp-grid,
      .models-grid,
      .tools-grid,
      .modules-grid {
        grid-template-columns: 1fr;
      }
      
      .module-header {
        flex-direction: column;
        gap: 15px;
      }
      
      .module-meta {
        flex-direction: row;
        align-items: center;
      }
      
      .footer-links {
        flex-direction: column;
        gap: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${title}</h1>
      <p class="subtitle">${isZh ? 'AI驱动的产品创意分析报告' : 'AI-Powered Product Idea Analysis Report'}</p>
      
      <div class="requirement-box">
        <h3>${isZh ? '产品需求' : 'Product Requirement'}</h3>
        <div class="requirement-text">${safeRequirement}</div>
        <div class="meta-info">
          ${isZh ? '生成时间' : 'Generated on'}: ${formatDate(created_at)}
        </div>
      </div>
    </header>
    
    <main>
      ${renderMVP(analysis.minimumViableProduct)}
      ${renderTechnicalSolution(analysis.technicalSolution)}
      ${renderDevelopmentModules(analysis.developmentModules)}
    </main>
    
    <footer class="footer">
      <div class="footer-content">
        <p><strong>${isZh ? '本报告由 ProductMind AI 生成' : 'Generated by ProductMind AI'}</strong></p>
        <p>${isZh ? '专业的AI产品经理助手，助您高效完成产品工作' : 'Professional AI Product Manager Assistant for Efficient Product Work'}</p>
      </div>
      <div class="footer-links">
        <a href="https://productmindai.com">${isZh ? '返回首页' : 'Back to Home'}</a>
        <a href="https://productmindai.com/ai-product-idea-generator">${isZh ? '创建新方案' : 'Create New Project'}</a>
      </div>
    </footer>
  </div>
  
  <!-- Analytics -->
  <script>
    console.log('AI Product Idea Analysis Page Loaded');
  </script>
</body>
</html>`;
}

/**
 * 生成并保存SEO静态页面文件
 */
export async function generateAndSaveSEOPage(data: AIProductIdea): Promise<string> {
  try {
    logger.info('[AWS SEO] 开始生成SEO页面...', { id: data.id });
    
    const htmlContent = generateSEOPage(data);
    logger.info('[AWS SEO] HTML内容生成完成, 长度:', htmlContent.length);
    
    // 确保静态页面目录存在 - 修正路径指向项目根目录的public文件夹
    const staticDir = path.resolve(__dirname, '../../../public/static-pages/shortproject');
    try {
      await fs.access(staticDir);
      logger.info('[AWS SEO] 静态目录已存在:', staticDir);
    } catch {
      logger.info('[AWS SEO] 创建静态目录:', staticDir);
      await fs.mkdir(staticDir, { recursive: true });
    }
    
    const staticFilePath = path.join(staticDir, `${data.id}.html`);
    logger.info('[AWS SEO] 写入文件路径:', staticFilePath);
    
    await fs.writeFile(staticFilePath, htmlContent, 'utf8');
    logger.info('[AWS SEO] ✅ SEO页面生成成功:', staticFilePath);
    
    // 验证文件是否实际写入
    try {
      const stats = await fs.stat(staticFilePath);
      logger.info('[AWS SEO] 文件验证 - 大小:', stats.size, 'bytes');
    } catch (verifyError) {
      logger.error('[AWS SEO] 文件验证失败:', verifyError);
    }
    
    return staticFilePath;
  } catch (error) {
    logger.error('[AWS SEO] ❌ SEO页面生成失败:', error);
    throw error;
  }
} 