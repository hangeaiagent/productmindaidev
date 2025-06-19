import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 设置 __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟的AI服务
const mockAiService = {
  async generateContent(request) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const content = request.language === 'zh' 
      ? `# ${request.template.name_zh}\n\n## 项目概述\n项目名称：${request.project.name}\n项目描述：${request.project.description}\n\n## 详细内容\n基于AI生成的${request.template.name_zh}内容...`
      : `# ${request.template.name_en}\n\n## Project Overview\nProject Name: ${request.project.name}\nProject Description: ${request.project.description}\n\n## Detailed Content\nAI-generated ${request.template.name_en} content...`;
    
    return {
      content,
      status: 'success',
      model: 'deepseek-chat',
      tokens: Math.floor(Math.random() * 2000) + 500
    };
  }
};

// 模拟的批量生产服务
const mockBatchService = {
  async batchProductionTemplates(options = {}) {
    const {
      batchSize = 3,
      dryRun = false,
      skipExisting = true,
      limitProjects = 5,
      limitTemplates = 5
    } = options;
    
    console.log('📋 开始批量生产，配置：', { batchSize, dryRun, skipExisting, limitProjects, limitTemplates });
    
    const mockProjects = [
      { id: '1', name: 'AI智能客服系统', description: '基于深度学习的智能客服对话系统' },
      { id: '2', name: '区块链数字钱包', description: '安全可靠的数字资产管理工具' },
      { id: '3', name: '在线教育平台', description: '互动式在线学习平台' }
    ];
    
    const mockTemplates = [
      { id: '1', name_zh: '产品需求文档', name_en: 'PRD', prompt_content: '生成产品需求文档' },
      { id: '2', name_zh: '商业计划书', name_en: 'Business Plan', prompt_content: '生成商业计划书' },
      { id: '3', name_zh: '技术架构文档', name_en: 'Tech Architecture', prompt_content: '生成技术架构文档' }
    ];
    
    const tasks = [];
    for (const project of mockProjects.slice(0, limitProjects)) {
      for (const template of mockTemplates.slice(0, limitTemplates)) {
        tasks.push({ project, template });
      }
    }
    
    if (dryRun) {
      return {
        success: true,
        stats: { total: tasks.length, generated: 0, skipped: 0, failed: 0 },
        details: [],
        execution: { startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: '0s' }
      };
    }
    
    const startTime = new Date();
    const result = {
      success: true,
      stats: { total: tasks.length, generated: 0, skipped: 0, failed: 0 },
      details: [],
      execution: { startTime: startTime.toISOString(), endTime: '', duration: '' }
    };
    
    // 处理任务
    for (const task of tasks) {
      try {
        const { project, template } = task;
        
        // 生成英文内容
        const enRequest = {
          prompt: template.prompt_content,
          project: { name: project.name, description: project.description },
          template: { name_zh: template.name_zh, name_en: template.name_en },
          language: 'en'
        };
        
        const enResult = await mockAiService.generateContent(enRequest);
        
        // 生成中文内容
        const zhRequest = { ...enRequest, language: 'zh' };
        const zhResult = await mockAiService.generateContent(zhRequest);
        
        result.stats.generated++;
        result.details.push({
          projectId: project.id,
          projectName: project.name,
          templateId: template.id,
          templateName: template.name_zh,
          status: 'generated',
          versionId: `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentLengths: {
            outputContentEn: enResult.content.length,
            outputContentZh: zhResult.content.length
          }
        });
        
      } catch (error) {
        result.stats.failed++;
        result.details.push({
          projectId: task.project.id,
          projectName: task.project.name,
          templateId: task.template.id,
          templateName: task.template.name_zh,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);
    
    result.execution.endTime = endTime.toISOString();
    result.execution.duration = `${duration}s`;
    
    return result;
  }
};

// API路由

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 单个内容生成
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, project, template, language = 'zh', maxTokens = 4000 } = req.body;
    
    if (!prompt || !project || !template) {
      return res.status(400).json({ error: '缺少必要参数：prompt, project, template' });
    }
    
    console.log(`🤖 生成请求: ${template.name_zh || template.name_en} (${language})`);
    
    const request = { prompt, project, template, language, maxTokens };
    const result = await mockAiService.generateContent(request);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('生成错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 批量生产
app.post('/api/batch-production', async (req, res) => {
  try {
    const options = req.body || {};
    
    console.log('📋 批量生产请求:', options);
    
    const result = await mockBatchService.batchProductionTemplates(options);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('批量生产错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取模板列表（模拟）
app.get('/api/templates', (req, res) => {
  const mockTemplates = [
    {
      id: '1',
      name_zh: '产品需求文档',
      name_en: 'Product Requirements Document',
      description_zh: '详细的产品需求文档模板',
      description_en: 'Detailed product requirements document template',
      category: 'product',
      prompt_content: '请基于项目信息生成详细的产品需求文档...'
    },
    {
      id: '2',
      name_zh: '商业计划书',
      name_en: 'Business Plan',
      description_zh: '完整的商业计划书模板',
      description_en: 'Complete business plan template',
      category: 'business',
      prompt_content: '请基于项目信息生成完整的商业计划书...'
    },
    {
      id: '3',
      name_zh: '技术架构文档',
      name_en: 'Technical Architecture Document',
      description_zh: '系统技术架构文档模板',
      description_en: 'System technical architecture document template',
      category: 'technical',
      prompt_content: '请基于项目信息生成技术架构文档...'
    }
  ];
  
  res.json({
    success: true,
    data: mockTemplates,
    total: mockTemplates.length,
    timestamp: new Date().toISOString()
  });
});

// 获取项目列表（模拟）
app.get('/api/projects', (req, res) => {
  const mockProjects = [
    {
      id: '1',
      name: 'AI智能客服系统',
      description: '基于深度学习的智能客服对话系统，支持多轮对话和情感分析',
      website_url: 'https://example.com/ai-customer-service',
      category: 'AI',
      status: 'active'
    },
    {
      id: '2',
      name: '区块链数字钱包',
      description: '安全可靠的数字资产管理工具，支持多币种存储和交易',
      website_url: 'https://example.com/crypto-wallet',
      category: 'Blockchain',
      status: 'active'
    },
    {
      id: '3',
      name: '在线教育平台',
      description: '互动式在线学习平台，提供个性化学习路径和实时答疑',
      website_url: 'https://example.com/education-platform',
      category: 'Education',
      status: 'active'
    }
  ];
  
  res.json({
    success: true,
    data: mockProjects,
    total: mockProjects.length,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 服务器启动成功！');
  console.log(`📡 地址: http://localhost:${PORT}`);
  console.log('📚 可用接口:');
  console.log(`  GET  /health - 健康检查`);
  console.log(`  GET  /api/templates - 获取模板列表`);
  console.log(`  GET  /api/projects - 获取项目列表`);
  console.log(`  POST /api/generate - 单个内容生成`);
  console.log(`  POST /api/batch-production - 批量生产`);
  console.log('\n🎯 测试命令示例:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl http://localhost:${PORT}/api/templates`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/batch-production -H "Content-Type: application/json" -d '{"limitProjects":2,"limitTemplates":2}'`);
}); 