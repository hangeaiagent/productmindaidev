import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import JSZip from 'jszip';

// 导入路由
import templateRoutes from './routes/templateRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import * as supabaseService from './services/supabaseService.js';

// 导入中间件
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/authMiddleware.js';

// 导入服务
import { logger } from './utils/logger.js';
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

// CommonJS 不需要 __dirname 替代方案
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

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
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'https://productmindai.com',
    'https://www.productmindai.com'
  ],
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

// 模板路由（不需要认证）
app.use('/api/templates', templateRoutes);

// AI产品分析路由（不需要认证）
app.post('/api/ai-product-analysis', async (req, res) => {
  try {
    const { requirement, language = 'zh' } = req.body;

    logger.info('收到AI产品分析请求', { 
      requirement: requirement?.substring(0, 50) + '...', 
      language 
    });

    if (!requirement || requirement.trim().length < 10) {
      return res.status(400).json({
        error: language === 'zh' ? '请输入至少10个字符的产品需求' : 'Please enter at least 10 characters for product requirement'
      });
    }

    // 根据需求生成智能分析
    const analysis = await generateProductAnalysis(requirement, language);

    logger.info('AI产品分析完成', { 
      title: analysis.minimumViableProduct.title,
      modulesCount: analysis.developmentModules.length
    });

    res.json(analysis);

  } catch (error: any) {
    logger.error('AI产品分析失败:', error);
    res.status(500).json({
      error: req.body.language === 'zh' ? '分析失败，请重试' : 'Analysis failed, please try again'
    });
  }
});

// AI产品分析流式路由（不需要认证）
app.post('/api/ai-product-analysis-stream', async (req, res) => {
  try {
    const { requirement, language = 'zh' } = req.body;

    logger.info('收到AI产品分析流式请求', { 
      requirement: requirement?.substring(0, 50) + '...', 
      language 
    });

    if (!requirement || requirement.trim().length < 10) {
      return res.status(400).json({
        error: language === 'zh' ? '请输入至少10个字符的产品需求' : 'Please enter at least 10 characters for product requirement'
      });
    }

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 发送流式数据的辅助函数
    const sendStreamData = (step: string, message: string, progress: number, data?: any) => {
      const streamData = {
        type: 'progress',
        step,
        message,
        progress,
        data,
        timestamp: new Date().toISOString()
      };
      res.write(`data: ${JSON.stringify(streamData)}\n\n`);
    };

    try {
      // 开始分析
      sendStreamData('start', language === 'zh' ? '开始分析您的产品需求...' : 'Starting analysis of your product requirements...', 0);

      // MVP分析阶段
      sendStreamData('mvp_start', language === 'zh' ? '正在生成最小可行产品方案...' : 'Generating minimum viable product solution...', 20);
      
      // 生成完整分析
      const analysis = await generateProductAnalysis(requirement, language);
      
      // 发送MVP结果
      sendStreamData('mvp_complete', language === 'zh' ? 'MVP方案生成完成' : 'MVP solution completed', 40, {
        minimumViableProduct: analysis.minimumViableProduct
      });

      // 技术方案分析阶段
      sendStreamData('tech_start', language === 'zh' ? '正在分析技术方案...' : 'Analyzing technical solution...', 50);
      
      // 发送技术方案结果
      sendStreamData('tech_complete', language === 'zh' ? '技术方案分析完成' : 'Technical solution analysis completed', 70, {
        technicalSolution: analysis.technicalSolution
      });

      // 开发模块分析阶段
      sendStreamData('modules_start', language === 'zh' ? '正在生成开发模块...' : 'Generating development modules...', 80);
      
      // 发送开发模块结果
      sendStreamData('modules_complete', language === 'zh' ? '开发模块生成完成' : 'Development modules completed', 95, {
        developmentModules: analysis.developmentModules
      });

      // 完成
      sendStreamData('complete', language === 'zh' ? '分析完成！' : 'Analysis completed!', 100, analysis);

      // 发送结束标记
      res.write('data: [DONE]\n\n');
      res.end();

      logger.info('AI产品分析流式完成', { 
        title: analysis.minimumViableProduct.title,
        modulesCount: analysis.developmentModules.length
      });

    } catch (analysisError: any) {
      logger.error('流式分析过程中出错:', analysisError);
      sendStreamData('error', language === 'zh' ? '分析过程中出错' : 'Error during analysis', 0, {
        error: analysisError.message
      });
      res.write('data: [DONE]\n\n');
      res.end();
    }

  } catch (error: any) {
    logger.error('AI产品分析流式失败:', error);
    res.status(500).json({
      error: req.body.language === 'zh' ? '分析失败，请重试' : 'Analysis failed, please try again'
    });
  }
});

// AI产品创意保存路由（不需要认证）
app.post('/api/save-ai-product-idea', async (req, res) => {
  try {
    logger.info('[AWS API] 收到AI产品创意保存请求', {
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    const { tempUserId, requirement, analysisResult, language } = req.body;
    
    logger.info('[AWS API] 请求参数解析:', {
      tempUserId,
      requirementLength: requirement?.length,
      hasAnalysisResult: !!analysisResult,
      language,
      analysisKeys: analysisResult ? Object.keys(analysisResult) : []
    });

    if (!tempUserId || !requirement || !analysisResult) {
      logger.info('[AWS API] 缺少必要字段:', {
        hasTempUserId: !!tempUserId,
        hasRequirement: !!requirement,
        hasAnalysisResult: !!analysisResult
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tempUserId, requirement, or analysisResult'
      });
    }

    logger.info('[AWS API] 开始保存AI产品创意...');
    
    // 保存到数据库
    const savedIdea = await supabaseService.saveAIProductIdea({
      tempUserId,
      requirement,
      analysisResult,
      language: language || 'zh'
    });

    logger.info('[AWS API] 数据库保存成功，开始生成SEO页面...');
    
    // 生成静态SEO页面
    try {
      const staticFilePath = await supabaseService.generateAndSaveSEOPage(savedIdea);
      logger.info('[AWS API] ✅ SEO页面生成成功:', staticFilePath);
    } catch (seoError) {
      logger.error('[AWS API] ❌ SEO页面生成失败，但不影响数据保存:', seoError);
    }

    logger.info('[AWS API] ✅ AI产品创意保存完成:', {
      id: savedIdea.id,
      tempUserId: savedIdea.temp_user_id
    });

    res.json({
      success: true,
      id: savedIdea.id,
      message: 'AI product idea saved successfully',
      operation: 'saved'
    });

  } catch (error: any) {
    logger.error('[AWS API] ❌ AI产品创意保存失败:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      error: 'Failed to save AI product idea',
      details: error.message
    });
  }
});

// AI产品创意获取路由（不需要认证）
app.get('/api/get-ai-product-idea', async (req, res) => {
  try {
    const { id } = req.query;
    
    logger.info('[AWS API] 收到AI产品创意获取请求:', { id });

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: id'
      });
    }

    // 从数据库获取
    const productIdea = await supabaseService.getAIProductIdeaById(id as string);
    
    if (!productIdea) {
      logger.info('[AWS API] AI产品创意不存在:', { id });
      return res.status(404).json({
        success: false,
        error: 'AI product idea not found'
      });
    }

    logger.info('[AWS API] ✅ AI产品创意获取成功:', { 
      id: productIdea.id,
      language: productIdea.language 
    });

    // 生成SEO页面内容用于显示
    const htmlContent = supabaseService.generateSEOPage(productIdea);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);

  } catch (error: any) {
    logger.error('[AWS API] ❌ AI产品创意获取失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI product idea',
      details: error.message
    });
  }
});

// 分析函数实现
interface AIProductAnalysis {
  minimumViableProduct: {
    title: string;
    description: string;
    coreFeatures: string[];
    targetUsers: string[];
    businessModel: string;
  };
  technicalSolution: {
    recommendedModels: Array<{
      name: string;
      provider: string;
      reason: string;
      pricing: string;
    }>;
    keyAlgorithms: string[];
    mcpTools: Array<{
      name: string;
      purpose: string;
      implementation: string;
    }>;
    architecture: string[];
  };
  developmentModules: Array<{
    moduleName: string;
    functionality: string;
    priority: 'High' | 'Medium' | 'Low';
    estimatedTime: string;
    cursorPrompts: {
      fileName: string;
      content: string;
    }[];
  }>;
}

async function generateProductAnalysis(requirement: string, language: 'en' | 'zh'): Promise<AIProductAnalysis> {
  // 检测产品类型
  const productType = detectProductType(requirement, language);
  
  // 如果配置了DEEPSEEK_API_KEY，尝试调用AI API
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith('sk-')) {
    try {
      const aiAnalysis = await callDeepSeekAPI(requirement, language);
      if (aiAnalysis) {
        return aiAnalysis;
      }
    } catch (error) {
      logger.error('AI API调用失败，使用模板分析:', error);
    }
  }
  
  // 使用智能模板生成
  return generateTemplateAnalysis(requirement, productType, language);
}

function detectProductType(requirement: string, language: 'en' | 'zh'): string {
  const req = requirement.toLowerCase();
  
  // 检测关键词
  if (req.includes('健身') || req.includes('fitness') || req.includes('运动') || req.includes('workout')) {
    return 'fitness';
  }
  if (req.includes('教育') || req.includes('education') || req.includes('学习') || req.includes('learning')) {
    return 'education';
  }
  if (req.includes('电商') || req.includes('商城') || req.includes('ecommerce') || req.includes('shopping')) {
    return 'ecommerce';
  }
  if (req.includes('社交') || req.includes('social') || req.includes('聊天') || req.includes('chat')) {
    return 'social';
  }
  if (req.includes('金融') || req.includes('finance') || req.includes('支付') || req.includes('payment')) {
    return 'finance';
  }
  if (req.includes('医疗') || req.includes('health') || req.includes('医院') || req.includes('doctor')) {
    return 'healthcare';
  }
  
  return 'general';
}

async function callDeepSeekAPI(requirement: string, language: 'en' | 'zh'): Promise<AIProductAnalysis | null> {
  try {
    const prompt = buildPrompt(requirement, language);
    
    logger.info('调用DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 尝试解析JSON响应
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      logger.info('DeepSeek API响应解析成功');
      return parsed;
    }
    
    return null;
  } catch (error) {
    logger.error('DeepSeek API调用失败:', error);
    return null;
  }
}

function buildPrompt(requirement: string, language: 'en' | 'zh'): string {
  if (language === 'zh') {
    return `
作为专业的AI产品经理，请分析以下产品需求并以JSON格式返回详细分析：

需求：${requirement}

请返回包含以下结构的JSON：
{
  "minimumViableProduct": {
    "title": "产品标题",
    "description": "产品描述",
    "coreFeatures": ["功能1", "功能2", "功能3", "功能4"],
    "targetUsers": ["用户群1", "用户群2", "用户群3"],
    "businessModel": "商业模式描述"
  },
  "technicalSolution": {
    "recommendedModels": [{"name": "模型名", "provider": "提供商", "reason": "选择理由", "pricing": "价格"}],
    "keyAlgorithms": ["算法1", "算法2", "算法3", "算法4"],
    "mcpTools": [{"name": "工具名", "purpose": "用途", "implementation": "实现方式"}],
    "architecture": ["架构组件1", "架构组件2", "架构组件3", "架构组件4"]
  },
  "developmentModules": [
    {
      "moduleName": "模块名",
      "functionality": "功能描述",
      "priority": "High",
      "estimatedTime": "开发时间",
      "cursorPrompts": [{"fileName": "文件名.md", "content": "详细的Cursor提示词内容，包含具体的开发指导"}]
    }
  ]
}`;
  } else {
    return `
As a professional AI product manager, please analyze the following product requirement and return detailed analysis in JSON format:

Requirement: ${requirement}

Please return JSON with the following structure:
{
  "minimumViableProduct": {
    "title": "Product Title",
    "description": "Product Description", 
    "coreFeatures": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
    "targetUsers": ["User Group 1", "User Group 2", "User Group 3"],
    "businessModel": "Business Model Description"
  },
  "technicalSolution": {
    "recommendedModels": [{"name": "Model Name", "provider": "Provider", "reason": "Selection Reason", "pricing": "Pricing"}],
    "keyAlgorithms": ["Algorithm 1", "Algorithm 2", "Algorithm 3", "Algorithm 4"],
    "mcpTools": [{"name": "Tool Name", "purpose": "Purpose", "implementation": "Implementation"}],
    "architecture": ["Architecture Component 1", "Architecture Component 2", "Architecture Component 3", "Architecture Component 4"]
  },
  "developmentModules": [
    {
      "moduleName": "Module Name",
      "functionality": "Functionality Description",
      "priority": "High",
      "estimatedTime": "Development Time",
      "cursorPrompts": [{"fileName": "filename.md", "content": "Detailed Cursor prompt content with specific development guidance"}]
    }
  ]
}`;
  }
}

function generateTemplateAnalysis(requirement: string, productType: string, language: 'en' | 'zh'): AIProductAnalysis {
  // 获取产品类型相关的模板
  const template = getProductTemplate(productType, language);
  
  // 基于需求定制化模板
  return customizeTemplate(template, requirement, language);
}

function getProductTemplate(productType: string, language: 'en' | 'zh') {
  const templates = {
    fitness: language === 'zh' ? {
      title: 'AI智能健身助手',
      description: '基于人工智能的个性化健身指导平台，通过用户数据分析提供定制化训练方案',
      features: ['个性化训练计划生成', 'AI动作识别与纠正', '健康数据智能分析', '社区互动与挑战', '营养建议系统'],
      users: ['健身爱好者', '健身初学者', '专业运动员', '健身教练'],
      businessModel: '免费基础版 + 高级订阅制 + 个人教练服务'
    } : {
      title: 'AI Smart Fitness Coach',
      description: 'AI-powered personalized fitness guidance platform with data-driven training recommendations',
      features: ['Personalized Training Plans', 'AI Motion Recognition', 'Health Data Analytics', 'Community Challenges', 'Nutrition Guidance'],
      users: ['Fitness Enthusiasts', 'Beginners', 'Professional Athletes', 'Fitness Trainers'],
      businessModel: 'Freemium + Premium Subscription + Personal Training Services'
    },
    
    education: language === 'zh' ? {
      title: 'AI智能学习平台',
      description: '个性化AI教育解决方案，提供智能化学习路径和个性化教学内容',
      features: ['智能课程推荐', '学习进度实时跟踪', 'AI答疑助手', '互动式练习', '学习效果评估'],
      users: ['在校学生', '教师', '终身学习者', '企业培训'],
      businessModel: '按课程付费 + 订阅制 + 企业定制服务'
    } : {
      title: 'AI Smart Learning Platform',
      description: 'Personalized AI education solution with intelligent learning paths and adaptive content',
      features: ['Smart Course Recommendations', 'Real-time Progress Tracking', 'AI Q&A Assistant', 'Interactive Exercises', 'Learning Analytics'],
      users: ['Students', 'Teachers', 'Lifelong Learners', 'Corporate Training'],
      businessModel: 'Pay-per-Course + Subscription + Enterprise Solutions'
    },
    
    general: language === 'zh' ? {
      title: 'AI智能产品助手',
      description: '基于用户需求的智能解决方案，提供全方位的AI驱动功能',
      features: ['智能需求分析', '个性化推荐引擎', '数据洞察面板', '自动化流程处理', '多模态交互'],
      users: ['普通消费者', '专业用户', '企业客户', '开发者'],
      businessModel: '免费试用 + 高级订阅 + 企业定制'
    } : {
      title: 'AI Smart Product Assistant',
      description: 'Intelligent solution based on user requirements with comprehensive AI-driven features',
      features: ['Smart Requirements Analysis', 'Personalized Recommendations', 'Data Insights Dashboard', 'Automated Processing', 'Multi-modal Interaction'],
      users: ['General Consumers', 'Professional Users', 'Enterprise Clients', 'Developers'],
      businessModel: 'Free Trial + Premium Subscription + Enterprise Custom'
    }
  };
  
  return templates[productType as keyof typeof templates] || templates.general;
}

function customizeTemplate(template: any, requirement: string, language: 'en' | 'zh'): AIProductAnalysis {
  const isZh = language === 'zh';
  
  return {
    minimumViableProduct: {
      title: template.title,
      description: template.description,
      coreFeatures: template.features,
      targetUsers: template.users,
      businessModel: template.businessModel
    },
    technicalSolution: {
      recommendedModels: [
        {
          name: 'GPT-4o',
          provider: 'OpenAI',
          reason: isZh ? '最新一代多模态模型，支持文本、图像、音频处理，推理能力强' : 'Latest multimodal model supporting text, image, audio with strong reasoning',
          pricing: '$0.0025/1K input tokens, $0.01/1K output tokens'
        },
        {
          name: 'Claude-3.5 Sonnet',
          provider: 'Anthropic',
          reason: isZh ? '安全性高，长上下文处理能力强，适合复杂业务逻辑' : 'High safety, excellent long context handling, suitable for complex business logic',
          pricing: '$0.003/1K input tokens, $0.015/1K output tokens'
        },
        {
          name: 'DeepSeek-V2.5',
          provider: 'DeepSeek',
          reason: isZh ? '成本效益最优，中文支持优秀，推理能力突出' : 'Most cost-effective, excellent Chinese support, outstanding reasoning',
          pricing: '¥0.0014/1K tokens (约$0.0002)'
        }
      ],
      keyAlgorithms: [
        isZh ? '大语言模型 (LLM)' : 'Large Language Models (LLM)',
        isZh ? '强化学习 (RLHF)' : 'Reinforcement Learning (RLHF)',
        isZh ? '向量相似度检索 (RAG)' : 'Retrieval Augmented Generation (RAG)',
        isZh ? '多模态融合算法' : 'Multimodal Fusion Algorithms',
        isZh ? '个性化推荐算法' : 'Personalized Recommendation Algorithms'
      ],
      mcpTools: [
        {
          name: 'Database MCP',
          purpose: isZh ? '数据库操作和数据管理' : 'Database operations and data management',
          implementation: isZh ? '支持MySQL, PostgreSQL, Redis等多种数据库的统一操作接口' : 'Unified interface for MySQL, PostgreSQL, Redis and other databases'
        },
        {
          name: 'Web Search MCP',
          purpose: isZh ? '实时网络信息搜索' : 'Real-time web information search',
          implementation: isZh ? '集成多个搜索引擎API，提供实时信息检索能力' : 'Integrate multiple search engine APIs for real-time information retrieval'
        },
        {
          name: 'File Processing MCP',
          purpose: isZh ? '文件处理和格式转换' : 'File processing and format conversion',
          implementation: isZh ? '支持PDF、Word、Excel等多种格式的读取、编辑和转换' : 'Support reading, editing and converting PDF, Word, Excel and other formats'
        }
      ],
      architecture: [
        isZh ? '前端应用层 (React + TypeScript + Tailwind)' : 'Frontend Layer (React + TypeScript + Tailwind)',
        isZh ? '网关和负载均衡 (Nginx + PM2)' : 'Gateway & Load Balancer (Nginx + PM2)',
        isZh ? 'API服务层 (Node.js + Express)' : 'API Service Layer (Node.js + Express)',
        isZh ? 'AI模型接入层 (多模型管理)' : 'AI Model Integration Layer (Multi-model Management)',
        isZh ? '数据存储层 (PostgreSQL + Redis)' : 'Data Storage Layer (PostgreSQL + Redis)',
        isZh ? '消息队列 (RabbitMQ/Bull)' : 'Message Queue (RabbitMQ/Bull)',
        isZh ? '监控和日志系统 (Winston + Prometheus)' : 'Monitoring & Logging (Winston + Prometheus)'
      ]
    },
    developmentModules: [
      {
        moduleName: isZh ? '前端用户界面模块' : 'Frontend UI Module',
        functionality: isZh ? '负责用户界面设计、交互逻辑和用户体验优化，包含响应式设计和多设备适配' : 'Responsible for UI design, interaction logic and UX optimization, including responsive design and multi-device adaptation',
        priority: 'High',
        estimatedTime: isZh ? '3-4周' : '3-4 weeks',
        cursorPrompts: [
          {
            fileName: 'react-components-development.md',
            content: isZh ? 
              `# React组件开发指南\n\n## 项目概述\n创建现代化的React应用，使用TypeScript确保类型安全，Tailwind CSS实现响应式设计。\n\n## 技术栈要求\n- **框架**: React 18+ with TypeScript\n- **样式**: Tailwind CSS + HeadlessUI\n- **状态管理**: React Context + useReducer\n- **路由**: React Router v6\n- **表单**: React Hook Form + Zod验证\n- **HTTP客户端**: Axios with interceptors\n\n## 具体实现要求\n\n### 1. 基础组件库\n\`\`\`typescript\n// components/ui/Button.tsx\ninterface ButtonProps {\n  variant: 'primary' | 'secondary' | 'danger';\n  size: 'sm' | 'md' | 'lg';\n  loading?: boolean;\n  children: React.ReactNode;\n  onClick?: () => void;\n}\n\`\`\`\n\n### 2. 主题系统\n- 支持深色/浅色主题切换\n- 使用CSS变量管理颜色\n- 响应式断点配置\n\n### 3. 性能优化\n- 组件懒加载\n- 图片懒加载\n- 虚拟滚动（长列表）\n- React.memo优化重渲染` :
              `# React Components Development Guide\n\n## Project Overview\nCreate a modern React application using TypeScript for type safety and Tailwind CSS for responsive design.\n\n## Tech Stack Requirements\n- **Framework**: React 18+ with TypeScript\n- **Styling**: Tailwind CSS + HeadlessUI\n- **State Management**: React Context + useReducer\n- **Routing**: React Router v6\n- **Forms**: React Hook Form + Zod validation\n- **HTTP Client**: Axios with interceptors\n\n## Implementation Requirements\n\n### 1. Base Component Library\n\`\`\`typescript\n// components/ui/Button.tsx\ninterface ButtonProps {\n  variant: 'primary' | 'secondary' | 'danger';\n  size: 'sm' | 'md' | 'lg';\n  loading?: boolean;\n  children: React.ReactNode;\n  onClick?: () => void;\n}\n\`\`\`\n\n### 2. Theme System\n- Support dark/light theme switching\n- Use CSS variables for color management\n- Responsive breakpoint configuration\n\n### 3. Performance Optimization\n- Component lazy loading\n- Image lazy loading\n- Virtual scrolling (long lists)\n- React.memo optimization`
          }
        ]
      },
      {
        moduleName: isZh ? 'AI服务集成模块' : 'AI Service Integration Module',
        functionality: isZh ? '实现与多种AI模型的集成，包括API调用管理、错误处理、结果缓存和智能路由' : 'Implement integration with multiple AI models, including API call management, error handling, result caching and intelligent routing',
        priority: 'High',
        estimatedTime: isZh ? '4-5周' : '4-5 weeks',
        cursorPrompts: [
          {
            fileName: 'ai-service-architecture.md',
            content: isZh ?
              `# AI服务架构实现\n\n## 服务目标\n构建一个健壮、可扩展的AI服务管理系统，支持多模型接入和智能调度。\n\n## 核心功能\n\n### 1. 多模型管理器\n\`\`\`typescript\ninterface AIModelConfig {\n  name: string;\n  provider: 'openai' | 'anthropic' | 'deepseek';\n  apiKey: string;\n  baseURL: string;\n  maxTokens: number;\n  costPerToken: number;\n}\n\nclass AIModelManager {\n  private models: Map<string, AIModelConfig>;\n  \n  async callModel(modelName: string, prompt: string): Promise<string>;\n  async selectBestModel(task: AITask): Promise<string>;\n  async loadBalance(): Promise<string>;\n}\n\`\`\`\n\n### 2. 智能路由策略\n- **成本优化**: 根据token价格选择模型\n- **性能优化**: 根据响应时间选择\n- **功能匹配**: 根据任务类型选择最适合模型\n- **负载均衡**: 避免单一模型过载` :
              `# AI Service Architecture Implementation\n\n## Service Goals\nBuild a robust, scalable AI service management system supporting multi-model integration and intelligent scheduling.\n\n## Core Features\n\n### 1. Multi-Model Manager\n\`\`\`typescript\ninterface AIModelConfig {\n  name: string;\n  provider: 'openai' | 'anthropic' | 'deepseek';\n  apiKey: string;\n  baseURL: string;\n  maxTokens: number;\n  costPerToken: number;\n}\n\nclass AIModelManager {\n  private models: Map<string, AIModelConfig>;\n  \n  async callModel(modelName: string, prompt: string): Promise<string>;\n  async selectBestModel(task: AITask): Promise<string>;\n  async loadBalance(): Promise<string>;\n}\n\`\`\`\n\n### 2. Intelligent Routing Strategy\n- **Cost Optimization**: Select model based on token pricing\n- **Performance Optimization**: Select based on response time\n- **Feature Matching**: Select most suitable model for task type\n- **Load Balancing**: Avoid single model overload`
          }
        ]
      },
      {
        moduleName: isZh ? '数据管理与存储模块' : 'Data Management & Storage Module',
        functionality: isZh ? '处理数据存储、查询优化、备份恢复和数据安全，确保系统的数据可靠性' : 'Handle data storage, query optimization, backup recovery and data security to ensure system data reliability',
        priority: 'Medium',
        estimatedTime: isZh ? '3-4周' : '3-4 weeks',
        cursorPrompts: [
          {
            fileName: 'database-design-implementation.md',
            content: isZh ?
              `# 数据库设计与实现\n\n## 数据库架构设计\n\n### 1. 核心表结构设计\n\`\`\`sql\n-- 用户表\nCREATE TABLE users (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  email VARCHAR(255) UNIQUE NOT NULL,\n  password_hash VARCHAR(255),\n  name VARCHAR(100),\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\n-- 产品分析记录表\nCREATE TABLE product_analyses (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id),\n  requirement TEXT NOT NULL,\n  analysis_result JSONB NOT NULL,\n  language VARCHAR(5) DEFAULT 'zh',\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\`\`\`\n\n### 2. 索引优化策略\n\`\`\`sql\n-- 性能优化索引\nCREATE INDEX idx_users_email ON users(email);\nCREATE INDEX idx_product_analyses_user_id ON product_analyses(user_id);\nCREATE INDEX idx_analysis_result_gin ON product_analyses USING GIN(analysis_result);\n\`\`\`` :
              `# Database Design & Implementation\n\n## Database Architecture Design\n\n### 1. Core Table Structure Design\n\`\`\`sql\n-- Users table\nCREATE TABLE users (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  email VARCHAR(255) UNIQUE NOT NULL,\n  password_hash VARCHAR(255),\n  name VARCHAR(100),\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\n-- Product analysis records table\nCREATE TABLE product_analyses (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id),\n  requirement TEXT NOT NULL,\n  analysis_result JSONB NOT NULL,\n  language VARCHAR(5) DEFAULT 'zh',\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\`\`\`\n\n### 2. Index Optimization Strategy\n\`\`\`sql\n-- Performance optimization indexes\nCREATE INDEX idx_users_email ON users(email);\nCREATE INDEX idx_product_analyses_user_id ON product_analyses(user_id);\nCREATE INDEX idx_analysis_result_gin ON product_analyses USING GIN(analysis_result);\n\`\`\``
          }
        ]
      }
    ]
  };
}

// 错误处理中间件
app.use(errorHandler);

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

// 项目下载路由（无需认证，用于静态页面调用）
app.get('/api/projects/:projectId/templates/download-all', async (req, res) => {
  try {
    const { projectId } = req.params;
    const language = req.query.language || 'zh';
    
    logger.info(`📦 开始下载项目 ${projectId} 的所有模板，语言: ${language}`);
    
    // 获取项目信息
    const project = await supabaseService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // 获取项目的所有模板版本
    const { data: versions, error } = await supabaseService.supabase
      .from('template_versions')
      .select(`
        id,
        template_id,
        output_content_zh,
        output_content_en,
        created_at,
        templates:template_id (
          id,
          name_zh,
          name_en
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true);
    
    if (error) {
      logger.error('获取模板版本失败:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch template versions'
      });
    }
    
    if (!versions || versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No templates found for this project'
      });
    }
    
    // 使用JSZip创建压缩包
    const zip = new JSZip();
    
    // 添加项目信息文件
    const readmeContent = `# ${project.name || '未命名项目'}

${project.description || ''}

## 生成信息
- 生成时间：${new Date().toLocaleString('zh-CN')}
- 模板数量：${versions.length}
- 语言：${language === 'zh' ? '中文' : 'English'}

---
*由ProductMind AI自动生成*`;
    
    zip.file('README.md', readmeContent);
    
    // 添加每个模板文件
    for (const version of versions) {
      try {
        const template = version.templates;
        const templateName = language === 'zh' 
          ? (template?.name_zh || template?.name_en || 'Unknown Template')
          : (template?.name_en || template?.name_zh || 'Unknown Template');
        
        // 获取内容
        let content = '';
        if (language === 'zh' && version.output_content_zh) {
          const parsed = typeof version.output_content_zh === 'string' 
            ? JSON.parse(version.output_content_zh) 
            : version.output_content_zh;
          content = parsed.content || '';
        } else if (language === 'en' && version.output_content_en) {
          const parsed = typeof version.output_content_en === 'string'
            ? JSON.parse(version.output_content_en)
            : version.output_content_en;
          content = parsed.content || '';
        }
        
        if (!content) {
          content = `# ${templateName}

## 项目信息
- 项目名称: ${project.name}
- 项目描述: ${project.description || '暂无描述'}

## 模板内容
暂无内容，请重新生成模板。

---
*生成时间: ${new Date().toLocaleString('zh-CN')}*`;
        }
        
        // 生成安全的文件名
        const safeFileName = templateName
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        
        zip.file(`${safeFileName}.md`, content);
        
      } catch (error) {
        logger.error(`处理模板 ${version.id} 失败:`, error);
      }
    }
    
    // 生成并返回ZIP文件
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    
    const safeProjectName = project.name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Templates_${new Date().toISOString().slice(0, 10)}.zip"`);
    res.send(zipContent);
    
    logger.info(`✅ 项目 ${projectId} 模板下载完成，共 ${versions.length} 个文件`);
    
  } catch (error) {
    logger.error('模板下载失败:', error);
    res.status(500).json({
      success: false,
      error: 'Template download failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// MDC文件下载路由
app.get('/api/projects/:projectId/mdc/download-all', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    logger.info(`📦 开始下载项目 ${projectId} 的MDC文件`);
    
    // 获取项目信息
    const project = await supabaseService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // 获取项目的MDC内容
    const { data: versions, error } = await supabaseService.supabase
      .from('template_versions')
      .select(`
        id,
        template_id,
        mdcpromptcontent_en,
        mdcpromptcontent_zh,
        templates:template_id (
          id,
          name_zh,
          name_en
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .not('mdcpromptcontent_en', 'is', null);
    
    if (error) {
      logger.error('获取MDC内容失败:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch MDC content'
      });
    }
    
    if (!versions || versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No MDC content found for this project'
      });
    }
    
    // 使用JSZip创建压缩包
    const zip = new JSZip();
    
    // 添加项目信息文件
    const readmeContent = `# ${project.name || '未命名项目'} - Cursor Rules

${project.description || ''}

## 生成信息
- 生成时间：${new Date().toLocaleString('zh-CN')}
- MDC文件数量：${versions.length}

## 使用说明
1. 将.mdc文件放入项目根目录
2. 在Cursor中打开项目
3. 文件将自动生效，为您的编程提供智能提示

---
*由ProductMind AI智能生成*`;
    
    zip.file('README.md', readmeContent);
    
    // 添加每个MDC文件
    for (const version of versions) {
      try {
        const template = version.templates;
        const templateName = template?.name_en || template?.name_zh || 'Unknown Template';
        
        // 获取MDC内容（优先使用英文）
        const mdcContent = version.mdcpromptcontent_en || version.mdcpromptcontent_zh || '';
        
        if (!mdcContent) continue;
        
        // 生成安全的文件名
        const safeFileName = templateName
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        
        zip.file(`${safeFileName}.mdc`, mdcContent);
        
      } catch (error) {
        logger.error(`处理MDC文件 ${version.id} 失败:`, error);
      }
    }
    
    // 生成并返回ZIP文件
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    
    const safeProjectName = project.name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Cursor_Rules_${new Date().toISOString().slice(0, 10)}.zip"`);
    res.send(zipContent);
    
    logger.info(`✅ 项目 ${projectId} MDC文件下载完成，共 ${versions.length} 个文件`);
    
  } catch (error) {
    logger.error('MDC文件下载失败:', error);
    res.status(500).json({
      success: false,
      error: 'MDC download failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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