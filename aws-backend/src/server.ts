import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';

// 导入路由
import templateRoutes from './routes/templateRoutes';
import healthRoutes from './routes/healthRoutes';
import queueRoutes from './routes/queueRoutes';

// 导入中间件
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/authMiddleware';

// 导入服务
import { logger } from './utils/logger';
// import { connectRedis } from './services/redisService'; // 临时注释

// 添加接口定义
interface Template {
  id: string;
  name_zh: string;
  name_en: string;
  description_zh?: string;
  description_en?: string;
  prompt_content: string;
  category_id?: string;
}

// 加载环境变量 - 明确指定.env文件路径
const envPath = path.resolve(__dirname, '../.env');
console.log('🔧 尝试加载环境变量文件:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn('⚠️ 环境变量文件加载失败:', envResult.error);
} else {
  console.log('✅ 环境变量文件加载成功');
}

// 调试：打印关键环境变量状态
console.log('🔍 环境变量检查:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? '已设置' : '未设置',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '已设置' : '未设置',
  NODE_ENV: process.env.NODE_ENV || '未设置',
  PORT: process.env.PORT || '未设置'
});

const app = express();
const PORT = process.env.PORT || 3000;

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 限制每个IP 100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    retryAfter: '15分钟'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 请求日志中间件
app.use(requestLogger);

// 健康检查路由（不需要认证）
app.use('/health', healthRoutes);

// 测试路由（不需要认证）
app.get('/test/templates', async (req, res) => {
  try {
    res.json({
      message: '模板生成服务测试端点',
      status: 'ok',
      timestamp: new Date().toISOString(),
      features: [
        'batch-generate: 批量生成模板',
        'queue: 队列管理',
        'redis: 缓存服务'
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: '测试端点错误', message: error.message });
  }
});

// 测试批量生成（演示模式，不需要认证）
app.post('/test/batch-generate', async (req, res) => {
  try {
    const { demoMode = true, languages = ['zh'] } = req.body;
    
    logger.info('🎭 演示模式批量生成测试', { demoMode, languages });
    
    // 模拟批量生成结果
    const mockResult = {
      generated: 2,
      skipped: 1,
      errors: 0,
      details: [
        {
          project: 'AI智能助手产品-演示',
          template: '产品需求文档',
          status: 'generated',
          content: '这是演示生成的产品需求文档内容...',
          language: 'zh'
        },
        {
          project: 'AI智能助手产品-演示',
          template: 'Product Requirements Document',
          status: 'generated', 
          content: 'This is a demo generated PRD content...',
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
      execution_time: '2.5s',
      next_batch_url: null
    };
    
    res.json(mockResult);
  } catch (error: any) {
    res.status(500).json({ error: '测试批量生成失败', message: error.message });
  }
});

// 测试模板列表（不需要认证）
app.get('/test/templates-list', async (req, res) => {
  try {
    const supabaseService = require('./services/supabaseService');
    
    logger.info('🧪 测试获取模板列表...');
    
    const templates = await supabaseService.getTemplates({ limit: 10 });
    
    res.json({
      success: true,
      message: '模板列表获取成功',
      data: templates || [],
      total: templates?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('获取模板列表失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取模板列表失败', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 测试项目详情（不需要认证）
app.get('/test/project/:id', async (req, res) => {
  try {
    const supabaseService = require('./services/supabaseService');
    const { id } = req.params;
    
    logger.info('🧪 测试获取项目详情...', { projectId: id });
    
    const project = await supabaseService.getProjectById(id);
    
    res.json({
      success: true,
      message: project ? '项目详情获取成功' : '项目不存在',
      data: project,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('获取项目详情失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取项目详情失败', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 查询项目模板版本（不需要认证）
app.get('/test/project/:id/versions', async (req, res) => {
  try {
    const supabaseService = require('./services/supabaseService');
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    logger.info('🧪 查询项目模板版本...', { projectId: id, limit });
    
    const versions = await supabaseService.getTemplateVersionsByProject(id);
    
    res.json({
      success: true,
      message: `找到 ${versions?.length || 0} 个模板版本`,
      data: versions || [],
      total: versions?.length || 0,
      project_id: id,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('查询项目模板版本失败:', error);
    res.status(500).json({ 
      success: false,
      error: '查询项目模板版本失败', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 查询符合条件的项目（不需要认证）
app.get('/test/projects/search', async (req, res) => {
  try {
    const supabaseService = require('./services/supabaseService');
    const { 
      user_id = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      has_category = true,
      limit = 50 
    } = req.query;
    
    logger.info('🔍 搜索符合条件的项目...', { user_id, has_category, limit });
    
    // 构建查询条件
    let query = supabaseService.supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));
    
    if (has_category) {
      query = query.not('primary_category', 'is', null);
    }
    
    const { data: projects, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: `找到 ${projects?.length || 0} 个符合条件的项目`,
      data: projects || [],
      total: projects?.length || 0,
      search_criteria: {
        user_id,
        has_category,
        limit
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('搜索项目失败:', error);
    res.status(500).json({ 
      success: false,
      error: '搜索项目失败', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 批量生成多个项目的所有模板（不需要认证）
app.post('/test/batch-projects-generate', async (req, res): Promise<void> => {
  try {
    const supabaseService = require('./services/supabaseService');
    const aiService = require('./services/aiService');
    
    const { 
      user_id = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      project_ids = [],
      auto_search = true,
      batchSize = 25,
      testMode = false,
      concurrent = true,
      maxConcurrent = 5,
      languages = ['zh', 'en'] // 默认双语
    } = req.body;
    
    logger.info('🚀 开始批量多项目模板生成...', {
      user_id,
      project_ids,
      auto_search,
      batchSize,
      testMode,
      concurrent,
      maxConcurrent,
      languages
    });
    
    const startTime = Date.now();
    let targetProjects = [];
    
    // 如果启用自动搜索，查找符合条件的项目
    if (auto_search && project_ids.length === 0) {
      const { data: searchProjects, error } = await supabaseService.supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', user_id)
        .not('primary_category', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      targetProjects = searchProjects || [];
      logger.info(`🔍 自动搜索找到 ${targetProjects.length} 个项目`);
    } else if (project_ids.length > 0) {
      // 如果指定了项目ID，查询这些项目
      const { data: specifiedProjects, error } = await supabaseService.supabase
        .from('user_projects')
        .select('*')
        .in('id', project_ids);
      
      if (error) {
        throw error;
      }
      
      targetProjects = specifiedProjects || [];
      logger.info(`📋 指定项目查询到 ${targetProjects.length} 个项目`);
    }
    
    if (targetProjects.length === 0) {
      res.json({
        success: false,
        message: '未找到符合条件的项目',
        project_count: 0,
        results: [],
        execution_time: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      });
      return;
    }
    
    logger.info(`📊 准备为 ${targetProjects.length} 个项目生成模板`);
    
    const allResults: Array<{
      project_id: string;
      project_name: string;
      project_category?: string;
      success: boolean;
      generated_count?: number;
      skipped_count?: number;
      failed_count?: number;
      details?: any[];
      execution_time: string;
      completed: boolean;
      error?: string;
    }> = [];
    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    // 获取所有模板
    const templates = await supabaseService.getTemplates();
    if (!templates || templates.length === 0) {
      res.json({
        success: false,
        message: '未找到可用模板',
        project_count: targetProjects.length,
        results: [],
        execution_time: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      });
      return;
    }
    
    logger.info(`📝 找到 ${templates.length} 个模板待生成`);
    
    // 为每个项目生成模板
    for (const project of targetProjects) {
      try {
        logger.info(`🎯 开始处理项目: ${project.name} (${project.id})`);
        
        const projectStartTime = Date.now();
        
        const projectResults = {
          generated_count: 0,
          skipped_count: 0,
          failed_count: 0,
          details: [] as Array<{
            template: string;
            status: string;
            mode?: string;
            reason?: string;
            error?: string;
            content_length_zh?: number;
            content_length_en?: number;
          }>
        };
        
        // 判断是否双语生成
        const isBilingual = languages.includes('zh') && languages.includes('en');
        
        if (isBilingual) {
          logger.info(`🌐 使用双语生成模式处理项目: ${project.name}`);
          
          // 双语并发生成
          if (concurrent) {
            // 控制并发数量
            const chunks = [];
            for (let i = 0; i < templates.length; i += maxConcurrent) {
              chunks.push(templates.slice(i, i + maxConcurrent));
            }
            
            for (const chunk of chunks) {
              const promises = chunk.map(async (template: Template) => {
                try {
                  // 检查是否已存在双语版本
                  const existingVersion = await supabaseService.getTemplateVersion(
                    template.id, 
                    project.id
                  );
                  
                  if (existingVersion && existingVersion.output_content_zh && existingVersion.output_content_en) {
                    logger.info(`⏭️ 跳过已存在的双语模板: ${project.name} - ${template.name_zh}`);
                    projectResults.skipped_count++;
                    projectResults.details.push({
                      template: template.name_zh,
                      status: 'skipped',
                      reason: '已存在双语版本'
                    });
                    return;
                  }
                  
                  // 构建生成请求
                  const generationRequest = {
                    prompt: template.prompt_content,
                    project: {
                      name: project.name,
                      description: project.description || '',
                      website_url: project.website_url
                    },
                    template: {
                      name_zh: template.name_zh,
                      name_en: template.name_en,
                      description_zh: template.description_zh,
                      description_en: template.description_en
                    }
                  };
                  
                  // 生成双语内容
                  const { zh: zhResult, en: enResult } = await aiService.generateBilingualContent(generationRequest);
                  
                  if (zhResult.status === 'success' && enResult.status === 'success') {
                    // 构建输出内容
                    const buildOutputContent = (content: string, language: string) => ({
                      content: content,
                      annotations: [],
                      language: language,
                      generated_at: new Date().toISOString()
                    });
                    
                    // 保存双语模板版本
                    await supabaseService.saveTemplateVersion({
                      template_id: template.id,
                      project_id: project.id,
                      created_by: user_id,
                      input_content: `项目：${project.name}\n描述：${project.description}`,
                      output_content_zh: buildOutputContent(zhResult.content, 'zh'),
                      output_content_en: buildOutputContent(enResult.content, 'en')
                    });
                    
                    projectResults.generated_count++;
                    projectResults.details.push({
                      template: template.name_zh,
                      status: 'success',
                      mode: 'bilingual',
                      content_length_zh: zhResult.content.length,
                      content_length_en: enResult.content.length
                    });
                    
                    logger.info(`✅ 双语生成完成: ${project.name} - ${template.name_zh}`);
                    
                  } else {
                    throw new Error(`AI生成失败: 中文(${zhResult.error}) 英文(${enResult.error})`);
                  }
                  
                } catch (error: any) {
                  logger.error(`❌ 模板生成失败: ${project.name} - ${template.name_zh}`, error);
                  projectResults.failed_count++;
                  projectResults.details.push({
                    template: template.name_zh,
                    status: 'failed',
                    error: error.message
                  });
                }
              });
              
              await Promise.all(promises);
            }
          } else {
            // 串行生成
            for (const template of templates) {
              try {
                // 检查是否已存在
                const existingVersion = await supabaseService.getTemplateVersion(
                  template.id, 
                  project.id
                );
                
                if (existingVersion && existingVersion.output_content_zh && existingVersion.output_content_en) {
                  logger.info(`⏭️ 跳过已存在的双语模板: ${project.name} - ${template.name_zh}`);
                  projectResults.skipped_count++;
                  continue;
                }
                
                // 构建生成请求
                const generationRequest = {
                  prompt: template.prompt_content,
                  project: {
                    name: project.name,
                    description: project.description || '',
                    website_url: project.website_url
                  },
                  template: {
                    name_zh: template.name_zh,
                    name_en: template.name_en,
                    description_zh: template.description_zh,
                    description_en: template.description_en
                  }
                };
                
                // 生成双语内容
                const { zh: zhResult, en: enResult } = await aiService.generateBilingualContent(generationRequest);
                
                if (zhResult.status === 'success' && enResult.status === 'success') {
                  // 构建输出内容
                  const buildOutputContent = (content: string, language: string) => ({
                    content: content,
                    annotations: [],
                    language: language,
                    generated_at: new Date().toISOString()
                  });
                  
                  // 保存双语模板版本
                  await supabaseService.saveTemplateVersion({
                    template_id: template.id,
                    project_id: project.id,
                    created_by: user_id,
                    input_content: `项目：${project.name}\n描述：${project.description}`,
                    output_content_zh: buildOutputContent(zhResult.content, 'zh'),
                    output_content_en: buildOutputContent(enResult.content, 'en')
                  });
                  
                  projectResults.generated_count++;
                  logger.info(`✅ 双语生成完成: ${project.name} - ${template.name_zh}`);
                } else {
                  throw new Error(`AI生成失败: 中文(${zhResult.error}) 英文(${enResult.error})`);
                }
                
              } catch (error: any) {
                logger.error(`❌ 模板生成失败: ${project.name} - ${template.name_zh}`, error);
                projectResults.failed_count++;
              }
            }
          }
        } else {
          // 单语生成模式（向后兼容）
          logger.info(`🎯 使用单语生成模式处理项目: ${project.name}, 语言: ${languages.join(', ')}`);
          
          for (const language of languages) {
            for (const template of templates) {
              try {
                // 检查是否已存在该语言版本
                const existingVersion = await supabaseService.getTemplateVersion(
                  template.id, 
                  project.id
                );
                
                const languageField = language === 'zh' ? 'output_content_zh' : 'output_content_en';
                if (existingVersion && existingVersion[languageField]) {
                  logger.info(`⏭️ 跳过已存在的模板: ${project.name} - ${template.name_zh} (${language})`);
                  projectResults.skipped_count++;
                  continue;
                }
                
                // 构建生成请求
                const generationRequest = {
                  prompt: template.prompt_content,
                  project: {
                    name: project.name,
                    description: project.description || '',
                    website_url: project.website_url
                  },
                  template: {
                    name_zh: template.name_zh,
                    name_en: template.name_en,
                    description_zh: template.description_zh,
                    description_en: template.description_en
                  },
                  language: language
                };
                
                // 生成单语内容
                const result = await aiService.generateTemplateContent(generationRequest);
                
                if (result.status === 'success') {
                  // 构建输出内容
                  const outputContent = {
                    content: result.content,
                    annotations: [],
                    language: language,
                    generated_at: new Date().toISOString()
                  };
                  
                  // 保存单语模板版本
                  const saveData: any = {
                    template_id: template.id,
                    project_id: project.id,
                    created_by: user_id,
                    input_content: `项目：${project.name}\n描述：${project.description}`
                  };
                  
                  if (language === 'zh') {
                    saveData.output_content_zh = outputContent;
                  } else if (language === 'en') {
                    saveData.output_content_en = outputContent;
                  }
                  saveData.output_content = outputContent; // 主要字段保持兼容性
                  
                  await supabaseService.saveTemplateVersion(saveData);
                  
                  projectResults.generated_count++;
                  logger.info(`✅ 单语生成完成: ${project.name} - ${template.name_zh} (${language})`);
                } else {
                  throw new Error(`AI生成失败: ${result.error}`);
                }
                
              } catch (error: any) {
                logger.error(`❌ 模板生成失败: ${project.name} - ${template.name_zh} (${language})`, error);
                projectResults.failed_count++;
              }
            }
          }
        }
        
        const projectTime = ((Date.now() - projectStartTime) / 1000).toFixed(2);
        
        allResults.push({
          project_id: project.id,
          project_name: project.name,
          project_category: project.primary_category,
          success: true,
          generated_count: projectResults.generated_count,
          skipped_count: projectResults.skipped_count,
          failed_count: projectResults.failed_count,
          details: projectResults.details,
          execution_time: `${projectTime}s`,
          completed: true
        });
        
        totalGenerated += projectResults.generated_count;
        totalSkipped += projectResults.skipped_count;
        totalFailed += projectResults.failed_count;
        
        logger.info(`✅ 项目 ${project.name} 完成：生成${projectResults.generated_count}个，跳过${projectResults.skipped_count}个，失败${projectResults.failed_count}个，耗时 ${projectTime}s`);
        
      } catch (error: any) {
        logger.error(`❌ 项目 ${project.name} 处理失败:`, error);
        
        allResults.push({
          project_id: project.id,
          project_name: project.name,
          project_category: project.primary_category,
          success: false,
          error: error.message,
          execution_time: '0s',
          completed: false
        });
        
        totalFailed++;
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.json({
      success: true,
      message: `批量项目模板生成完成！`,
      project_count: targetProjects.length,
      total_templates: templates.length,
      total_generated: totalGenerated,
      total_skipped: totalSkipped,
      total_failed: totalFailed,
      results: allResults,
      execution_time: `${totalTime}s`,
      start_time: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('批量项目模板生成失败:', error);
    res.status(500).json({ 
      success: false,
      error: '批量项目模板生成失败', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 获取项目模板生成统计信息（不需要认证）
app.get('/test/template-generation/stats/:user_id', async (req, res) => {
  try {
    const supabaseService = require('./services/supabaseService');
    const { user_id } = req.params;
    
    logger.info('🔍 获取项目模板生成统计...', { user_id });
    
    const stats = await supabaseService.getProjectTemplateStats(user_id);
    
    res.json({
      success: true,
      message: '获取统计信息成功',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('获取统计信息失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取统计信息失败', 
      message: error.message
    });
  }
});

// 获取需要生成模板的项目列表（不需要认证）
app.get('/test/template-generation/pending/:user_id', async (req, res) => {
  try {
    const supabaseService = require('./services/supabaseService');
    const { user_id } = req.params;
    const { limit = 50 } = req.query;
    
    logger.info('🔍 获取需要生成模板的项目...', { user_id, limit });
    
    const projects = await supabaseService.getProjectsNeedingTemplateGeneration(
      user_id, 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      message: `找到 ${projects.length} 个需要生成模板的项目`,
      data: projects,
      total: projects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('获取待生成项目失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取待生成项目失败', 
      message: error.message
    });
  }
});

// 可中断可恢复的批量模板生成接口（不需要认证）
app.post('/test/template-generation/start', async (req, res): Promise<void> => {
  try {
    const supabaseService = require('./services/supabaseService');
    const aiService = require('./services/aiService');
    
    const { 
      user_id = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      maxConcurrent = 3, // 降低并发数避免过载
      batchSize = 5, // 每批处理项目数
      languages = ['zh', 'en'],
      skipCompleted = true, // 是否跳过已完成的项目
      resumeFromFailure = true // 是否从失败处恢复
    } = req.body;
    
    logger.info('🚀 开始可恢复批量模板生成...', {
      user_id,
      maxConcurrent,
      batchSize,
      languages,
      skipCompleted,
      resumeFromFailure
    });
    
    const startTime = Date.now();
    
    // 获取需要生成模板的项目
    const projects = await supabaseService.getProjectsNeedingTemplateGeneration(user_id);
    
    if (projects.length === 0) {
      res.json({
        success: true,
        message: '所有项目的模板都已生成完成',
        project_count: 0,
        results: [],
        execution_time: '0s'
      });
      return;
    }
    
    logger.info(`📊 找到 ${projects.length} 个需要生成模板的项目`);
    
    // 获取所有模板
    const templates = await supabaseService.getTemplates();
    if (!templates || templates.length === 0) {
      res.json({
        success: false,
        message: '未找到可用模板',
        project_count: projects.length,
        results: [],
        execution_time: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      });
      return;
    }
    
    logger.info(`📝 找到 ${templates.length} 个模板待生成`);
    
    const allResults: Array<{
      project_id: string;
      project_name: string;
      project_category?: string;
      success: boolean;
      generated_count?: number;
      skipped_count?: number;
      failed_count?: number;
      details?: any[];
      execution_time: string;
      completed: boolean;
      error?: string;
    }> = [];
    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    // 分批处理项目
    const batches = [];
    for (let i = 0; i < projects.length; i += batchSize) {
      batches.push(projects.slice(i, i + batchSize));
    }
    
    logger.info(`📦 将 ${projects.length} 个项目分为 ${batches.length} 批处理`);
    
    // 逐批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`🔄 开始处理第 ${batchIndex + 1}/${batches.length} 批，包含 ${batch.length} 个项目`);
      
      // 并发处理当前批次的项目
      const batchResults = await Promise.allSettled(
        batch.map(async (project: any) => {
          try {
            // 更新项目状态为进行中
            await supabaseService.updateProjectTemplateStatus(project.id, {
              template_generation_status: 'in_progress',
              template_generation_started_at: new Date().toISOString(),
              template_generation_progress: 0
            });
            
            const projectStartTime = Date.now();
            const projectResults = {
              generated_count: 0,
              skipped_count: 0,
              failed_count: 0,
              details: [] as Array<{
                template: string;
                status: string;
                mode?: string;
                reason?: string;
                error?: string;
                content_length_zh?: number;
                content_length_en?: number;
              }>
            };
            
            logger.info(`🎯 开始处理项目: ${project.name} (${project.id})`);
            
            // 双语并发生成
            const isBilingual = languages.includes('zh') && languages.includes('en');
            
            if (isBilingual) {
              // 分块处理模板，控制并发
              const templateChunks = [];
              for (let i = 0; i < templates.length; i += maxConcurrent) {
                templateChunks.push(templates.slice(i, i + maxConcurrent));
              }
              
              for (const chunk of templateChunks) {
                const promises = chunk.map(async (template: Template) => {
                  try {
                    // 检查是否已存在双语版本
                    const existingVersion = await supabaseService.getTemplateVersion(
                      template.id, 
                      project.id
                    );
                    
                    if (existingVersion && existingVersion.output_content_zh && existingVersion.output_content_en) {
                      logger.info(`⏭️ 跳过已存在的双语模板: ${project.name} - ${template.name_zh}`);
                      projectResults.skipped_count++;
                      projectResults.details.push({
                        template: template.name_zh,
                        status: 'skipped',
                        reason: '已存在双语版本'
                      });
                      return;
                    }
                    
                    // 构建生成请求
                    const generationRequest = {
                      prompt: template.prompt_content,
                      project: {
                        name: project.name,
                        description: project.description || '',
                        website_url: project.website_url
                      },
                      template: {
                        name_zh: template.name_zh,
                        name_en: template.name_en,
                        description_zh: template.description_zh,
                        description_en: template.description_en
                      }
                    };
                    
                    // 生成双语内容
                    const { zh: zhResult, en: enResult } = await aiService.generateBilingualContent(generationRequest);
                    
                    if (zhResult.status === 'success' && enResult.status === 'success') {
                      // 构建输出内容
                      const buildOutputContent = (content: string, language: string) => ({
                        content: content,
                        annotations: [],
                        language: language,
                        generated_at: new Date().toISOString()
                      });
                      
                      // 保存双语模板版本
                      await supabaseService.saveTemplateVersion({
                        template_id: template.id,
                        project_id: project.id,
                        created_by: user_id,
                        input_content: `项目：${project.name}\n描述：${project.description}`,
                        output_content_zh: buildOutputContent(zhResult.content, 'zh'),
                        output_content_en: buildOutputContent(enResult.content, 'en')
                      });
                      
                      projectResults.generated_count++;
                      projectResults.details.push({
                        template: template.name_zh,
                        status: 'success',
                        mode: 'bilingual',
                        content_length_zh: zhResult.content.length,
                        content_length_en: enResult.content.length
                      });
                      
                      logger.info(`✅ 双语生成完成: ${project.name} - ${template.name_zh}`);
                      
                    } else {
                      throw new Error(`AI生成失败: 中文(${zhResult.error}) 英文(${enResult.error})`);
                    }
                    
                  } catch (error: any) {
                    logger.error(`❌ 模板生成失败: ${project.name} - ${template.name_zh}`, error);
                    projectResults.failed_count++;
                    projectResults.details.push({
                      template: template.name_zh,
                      status: 'failed',
                      error: error.message
                    });
                  }
                });
                
                await Promise.all(promises);
                
                // 更新进度
                const progress = Math.round((projectResults.generated_count + projectResults.skipped_count + projectResults.failed_count) / templates.length * 100);
                await supabaseService.updateProjectTemplateStatus(project.id, {
                  template_generation_progress: progress
                });
              }
            }
            
            const projectTime = ((Date.now() - projectStartTime) / 1000).toFixed(2);
            
            // 判断是否成功完成
            const isCompleted = (projectResults.generated_count + projectResults.skipped_count) === templates.length;
            const hasFailures = projectResults.failed_count > 0;
            
            // 更新项目最终状态
            await supabaseService.updateProjectTemplateStatus(project.id, {
              template_generation_status: isCompleted ? 'completed' : (hasFailures ? 'failed' : 'completed'),
              template_generation_completed: isCompleted,
              template_generation_completed_at: isCompleted ? new Date().toISOString() : undefined,
              template_generation_progress: 100,
              template_generation_error: hasFailures ? `生成失败 ${projectResults.failed_count} 个模板` : undefined
            });
            
            const result = {
              project_id: project.id,
              project_name: project.name,
              project_category: project.primary_category,
              success: isCompleted,
              generated_count: projectResults.generated_count,
              skipped_count: projectResults.skipped_count,
              failed_count: projectResults.failed_count,
              details: projectResults.details,
              execution_time: `${projectTime}s`,
              completed: isCompleted
            };
            
            logger.info(`✅ 项目 ${project.name} 完成：生成${projectResults.generated_count}个，跳过${projectResults.skipped_count}个，失败${projectResults.failed_count}个，耗时 ${projectTime}s`);
            
            return result;
            
          } catch (error: any) {
            logger.error(`❌ 项目 ${project.name} 处理失败:`, error);
            
            // 更新项目状态为失败
            await supabaseService.updateProjectTemplateStatus(project.id, {
              template_generation_status: 'failed',
              template_generation_error: error.message
            });
            
            return {
              project_id: project.id,
              project_name: project.name,
              project_category: project.primary_category,
              success: false,
              error: error.message,
              execution_time: '0s',
              completed: false
            };
          }
        })
      );
      
      // 处理批次结果
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const projectResult = result.value;
          allResults.push(projectResult);
          
          if (projectResult.success) {
            totalGenerated += projectResult.generated_count || 0;
            totalSkipped += projectResult.skipped_count || 0;
          } else {
            totalFailed++;
          }
        } else {
          logger.error(`批次处理失败:`, result.reason);
          totalFailed++;
        }
      });
      
      logger.info(`✅ 第 ${batchIndex + 1} 批处理完成`);
      
      // 批次间短暂休息
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.json({
      success: true,
      message: `可恢复批量模板生成完成！`,
      project_count: projects.length,
      total_templates: templates.length,
      total_generated: totalGenerated,
      total_skipped: totalSkipped,
      total_failed: totalFailed,
      results: allResults,
      execution_time: `${totalTime}s`,
      batches_processed: batches.length,
      start_time: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('可恢复批量模板生成失败:', error);
    res.status(500).json({ 
      success: false,
      error: '可恢复批量模板生成失败', 
      message: error.message,
      stack: error.stack
    });
  }
});

// API路由（需要认证）
app.use('/api/v1/templates', authMiddleware, templateRoutes);
app.use('/api/v1/queue', authMiddleware, queueRoutes);

// 批量生产路由（不需要认证，用于服务器端调用）
app.use('/api/batch', templateRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'ProductMind AI AWS Backend Service',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use(errorHandler);

// 创建HTTP服务器
const server = createServer(app);

// 优雅关闭处理
const gracefulShutdown = (signal: string) => {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
  
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    
    // 关闭Redis连接
    // redisClient.quit();
    
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    logger.error('强制关闭服务器');
    process.exit(1);
  }, 10000);
};

// 监听关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
  process.exit(1);
});

// 启动服务器
async function startServer() {
  try {
    // 尝试连接Redis，但不阻塞服务器启动
    try {
      // await connectRedis();
    } catch (redisError) {
      logger.warn('Redis连接失败，但服务器将继续启动:', redisError);
    }
    
    server.listen(PORT, () => {
      logger.info(`🚀 服务器启动成功！`);
      logger.info(`📍 端口: ${PORT}`);
      logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 健康检查: http://localhost:${PORT}/health`);
      logger.info(`📚 API文档: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app; 