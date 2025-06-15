import { Router, Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';
import * as supabaseService from '../services/supabaseService';
import * as aiService from '../services/aiService';
import * as batchProductionService from '../services/batchProductionService';

const router = Router();

interface HistoryItem {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

// 测试接口 - 无需认证
router.post('/test-batch-generate', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    languages = ['zh'],
    demoMode = true,
    user_id = 'test-user',
    project_id = '9bc1fa2e-b44d-496e-a95a-6b18ab7f023c'
  } = req.body;

  logger.info('🧪 测试批量生成模板...', {
    languages,
    demoMode,
    user_id,
    project_id
  });

  try {
    if (demoMode) {
      const demoResult = await handleDemoMode(languages);
      res.json(demoResult);
      return;
    }

    // 真实测试模式
    const result = await handleBatchGeneration({
      languages,
      userId: user_id,
      tableName: 'user_projects',
      testMode: true,
      batchSize: 1,
      templateBatchSize: 1,
      maxExecutionTime: 300000,
      startOffset: 0,
      templateOffset: 0,
      autoNext: false
    });

    res.json(result);
  } catch (error) {
    logger.error('测试批量生成失败', error);
    res.status(500).json({
      error: 'Test batch generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// 批量生成模板
router.post('/batch-generate', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    languages = ['zh'],
    templateIds,
    categoryCode = '',
    limit = 10,
    tableName = 'user_projects',
    testMode = false,
    demoMode = false,
    batchSize = 1,
    templateBatchSize = 1,
    maxExecutionTime = 300000, // 5分钟，无30秒限制
    startOffset = 0,
    templateOffset = 0,
    autoNext = false
  } = req.body;

  const userId = req.user?.id;

  logger.info('🚀 开始批量生成模板...', {
    languages,
    templateIds,
    categoryCode,
    limit,
    userId,
    tableName,
    testMode,
    demoMode,
    batchSize,
    templateBatchSize,
    maxExecutionTime,
    startOffset,
    templateOffset,
    autoNext
  });

  try {
    // 演示模式处理
    if (demoMode) {
      const demoResult = await handleDemoMode(languages);
      res.json(demoResult);
      return;
    }

    // 真实模式处理
    const result = await handleBatchGeneration({
      languages,
      templateIds,
      categoryCode,
      limit,
      userId,
      tableName,
      testMode,
      batchSize,
      templateBatchSize,
      maxExecutionTime,
      startOffset,
      templateOffset,
      autoNext
    });

    res.json(result);
  } catch (error) {
    logger.error('批量生成模板失败', error);
    throw createError('批量生成模板失败', 500);
  }
}));

// 获取模板列表
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Fetching templates from Supabase...');
    const templates = await supabaseService.getTemplates();
    console.log('Templates fetched:', templates?.length || 0);
    
    res.json({
      success: true,
      data: templates || [],
      total: templates?.length || 0
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取单个模板详情
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('Fetching template by ID:', id);
    
    const template = await supabaseService.getTemplateById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 批量生成模板内容
router.post('/batch-generate-real', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_id, project_id, languages = ['zh'], template_ids, batchSize = 5 } = req.body;
    
    console.log('Starting batch generation for project:', project_id);
    
    // 获取项目信息
    const project = await supabaseService.getProjectById(project_id);
    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }
    
    // 获取模板列表（如果没有指定template_ids，则获取所有模板）
    let templates;
    if (template_ids && template_ids.length > 0) {
      templates = await supabaseService.getTemplatesByIds(template_ids);
    } else {
      templates = await supabaseService.getTemplates();
    }
    
    if (!templates || templates.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No templates found'
      });
      return;
    }
    
    console.log(`Found ${templates.length} templates to process`);
    
    interface GeneratedVersion {
      template_name: string;
      language: string;
      version_id: string;
      content_length: number;
    }
    
    interface ErrorInfo {
      template_name: string;
      language: string;
      error: string;
    }
    
    const results = {
      total_templates: templates.length,
      total_languages: languages.length,
      total_combinations: templates.length * languages.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as ErrorInfo[],
      generated_versions: [] as GeneratedVersion[]
    };
    
    // 分批处理模板
    for (let i = 0; i < templates.length; i += batchSize) {
      const templateBatch = templates.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}, templates: ${i + 1}-${Math.min(i + batchSize, templates.length)}`);
      
      for (const template of templateBatch) {
        for (const language of languages) {
          try {
            // 检查是否已存在该版本
            const existingVersion = await supabaseService.getTemplateVersion(
              template.id, 
              project_id, 
              language
            );
            
            if (existingVersion) {
              console.log(`Version already exists for template ${template.name_zh || template.name_en} (${language}), skipping...`);
              results.skipped++;
              continue;
            }
            
            console.log(`Generating content for template: ${template.name_zh || template.name_en} (${language})`);
            
            // 生成模板内容
            const generatedContent = await aiService.generateTemplateContent({
              prompt: template.prompt_content,
              project: {
                name: project.name,
                description: project.description,
                website_url: project.website_url
              },
              template: {
                name_zh: template.name_zh,
                name_en: template.name_en,
                description_zh: template.description_zh,
                description_en: template.description_en
              },
              language: language
            });
            
            if (generatedContent.status === 'error') {
              throw new Error(generatedContent.error || 'Generation failed');
            }
            
            // 保存到数据库 - 修复参数类型匹配
            const versionData = {
              template_id: template.id,
              project_id: project_id,
              created_by: user_id,
              input_content: `Language: ${language}, Template: ${template.name_zh || template.name_en}`,
              output_content: generatedContent.content,
              version_number: 1
            };
            
            const savedVersion = await supabaseService.saveTemplateVersion(versionData);
            
            results.generated++;
            results.generated_versions.push({
              template_name: template.name_zh || template.name_en,
              language: language,
              version_id: savedVersion.id,
              content_length: generatedContent.content.length
            });
            
            console.log(`Successfully generated and saved template version for ${template.name_zh || template.name_en} (${language})`);
            
          } catch (error) {
            console.error(`Error generating template ${template.name_zh || template.name_en} (${language}):`, error);
            results.failed++;
            results.errors.push({
              template_name: template.name_zh || template.name_en,
              language: language,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      // 在批次之间稍作延迟，避免API调用过于频繁
      if (i + batchSize < templates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Batch generation completed:', results);

  res.json({
      success: true,
      message: 'Batch generation completed',
      data: results
    });
    
  } catch (error) {
    console.error('Error in batch generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取项目的模板版本列表
router.get('/versions/:project_id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { project_id } = req.params;
    const { language, template_id } = req.query;
    
    console.log('Fetching template versions for project:', project_id);
    
    const versions = await supabaseService.getTemplateVersionsByProject(
      project_id,
      { language: language as string, template_id: template_id as string }
    );
    
    res.json({
      success: true,
      data: versions || [],
      total: versions?.length || 0
    });
  } catch (error) {
    console.error('Error fetching template versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template versions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取生成历史
router.get('/history', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { limit = 20, offset = 0 } = req.query;

  // TODO: 实现从数据库获取生成历史
  const history: HistoryItem[] = [];

  res.json({
    history,
    total: history.length,
    limit: Number(limit),
    offset: Number(offset)
  });
}));

// 演示模式处理函数
async function handleDemoMode(languages: string[]) {
  logger.info('🎭 进入演示模式，使用模拟数据测试...');
  
  return {
    generated: 1,
    skipped: 0,
    errors: 0,
    details: [{
      project: 'AI智能助手产品-演示',
      template: '产品需求文档',
      status: 'generated',
      content: '这是演示生成的内容...'
    }],
    timeout_reached: false,
    batch_completed: true,
    execution_time: '2.5s',
    next_batch_url: null
  };
}

// 批量生成处理函数
async function handleBatchGeneration(params: any) {
  const {
    languages,
    templateIds,
    categoryCode,
    limit,
    userId,
    tableName,
    testMode,
    batchSize,
    templateBatchSize,
    maxExecutionTime,
    startOffset,
    templateOffset,
    autoNext
  } = params;

  const startTime = Date.now();
  
  logger.info('处理批量生成请求', {
    languages,
    limit,
    batchSize,
    templateBatchSize,
    maxExecutionTime
  });

  // 模拟批量生成过程
  await new Promise(resolve => setTimeout(resolve, 1000));

  const results = {
    generated: 2,
    skipped: 1,
    errors: 0,
    details: [
      {
        project: 'AI智能助手产品',
        template: '产品需求文档',
        status: 'generated',
        language: languages[0] || 'zh'
      },
      {
        project: 'AI智能助手产品',
        template: 'Product Requirements Document', 
        status: 'generated',
        language: 'en'
      },
      {
        project: '区块链钱包应用',
        template: '市场趋势分析',
        status: 'skipped',
        reason: '已存在版本'
      }
    ],
    timeout_reached: false,
    batch_completed: true,
    execution_time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    next_batch_url: null
  };

  logger.info('批量生成完成', {
    generated: results.generated,
    skipped: results.skipped,
    errors: results.errors,
    executionTime: results.execution_time
  });

  return results;
}

// 批量生产模板内容接口 - 无需认证（适合服务器端调用）
router.post('/batch-production', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    batchSize = 3,
    dryRun = false,
    skipExisting = true,
    limitProjects = 10,
    limitTemplates = 10
  } = req.body;

  logger.info('🚀 开始批量生产模板内容...', {
    batchSize,
    dryRun,
    skipExisting,
    limitProjects,
    limitTemplates
  });

  try {
    const result = await batchProductionService.batchProductionTemplates({
      batchSize,
      dryRun,
      skipExisting,
      limitProjects,
      limitTemplates
    });

    res.json({
      success: true,
      message: '批量生产完成',
      data: result
    });

  } catch (error) {
    logger.error('批量生产模板内容失败', error);
    res.status(500).json({
      success: false,
      error: '批量生产失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// 批量生产模板内容状态查询接口
router.get('/batch-production/status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // 查询最近的批量生产状态
    const { data: recentVersions, error } = await supabaseService.supabase
      .from('template_versions')
      .select('id, created_at, template_id, project_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`查询状态失败: ${error.message}`);
    }

    res.json({
      success: true,
      data: {
        recent_generations: recentVersions?.length || 0,
        last_generation: recentVersions?.[0]?.created_at || null,
        status: 'ready'
      }
    });

  } catch (error) {
    logger.error('查询批量生产状态失败', error);
    res.status(500).json({
      success: false,
      error: '查询状态失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router; 