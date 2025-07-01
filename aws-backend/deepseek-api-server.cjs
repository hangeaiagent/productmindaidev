const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DeepSeek AI Analysis Server Running',
    deepseekApiConfigured: !!process.env.DEEPSEEK_API_KEY
  });
});

// DeepSeek API调用函数（优化版本，带超时控制）
async function callDeepSeekAPI(prompt, language = 'zh') {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  
  if (!DEEPSEEK_API_KEY) {
    console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟数据');
    return null;
  }

  try {
    console.log('🤖 调用DeepSeek Chat API...');
    
    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 改为更稳定的deepseek-chat
        messages: [
          {
            role: 'system',
            content: language === 'zh' ? 
              '你是一个专业的AI产品分析师和技术架构师。请根据用户提供的产品需求，生成详细的产品分析报告。请严格按照JSON格式返回结果，确保结果可以直接解析。回复要简洁但完整。' :
              'You are a professional AI product analyst and technical architect. Generate detailed product analysis reports based on user requirements. Return results in strict JSON format. Keep responses concise but complete.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // 降低随机性提高JSON格式稳定性
        max_tokens: 1500, // 减少token数量以提高响应速度和稳定性
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ DeepSeek Chat API响应成功');
    return data.choices[0].message.content;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ DeepSeek API调用超时（2分钟）');
    } else {
      console.error('❌ DeepSeek API调用失败:', error.message);
    }
    return null;
  }
}

// 生成分步骤DeepSeek提示词
function generateMVPPrompt(inputText, language = 'zh') {
  if (language === 'zh') {
    return `
请分析以下AI产品需求，并生成最小可行产品(MVP)建议：

【产品需求】：
${inputText}

请按照以下JSON格式返回MVP分析结果：

{
  "title": "产品标题",
  "description": "产品详细描述（100-200字）",
  "coreFeatures": ["核心功能1", "核心功能2", "核心功能3", "核心功能4", "核心功能5"],
  "targetUsers": ["目标用户群体1", "目标用户群体2", "目标用户群体3"],
  "businessModel": "商业模式描述"
}

要求：
1. 根据产品需求的具体内容进行个性化分析
2. 结果必须是有效的JSON格式，不要包含任何其他文本
`;
  } else {
    return `
Please analyze the following AI product requirements and generate Minimum Viable Product (MVP) recommendations:

【Product Requirements】：
${inputText}

Please return the MVP analysis results in the following JSON format:

{
  "title": "Product Title",
  "description": "Detailed product description (100-200 words)",
  "coreFeatures": ["Core Feature 1", "Core Feature 2", "Core Feature 3", "Core Feature 4", "Core Feature 5"],
  "targetUsers": ["Target User Group 1", "Target User Group 2", "Target User Group 3"],
  "businessModel": "Business model description"
}

Requirements:
1. Personalized analysis based on specific product requirements
2. Results must be in valid JSON format only
`;
  }
}

function generateTechPrompt(inputText, language = 'zh') {
  if (language === 'zh') {
    return `
请为以下AI产品需求分析技术解决方案：

【产品需求】：
${inputText}

请按照以下JSON格式返回技术方案分析结果：

{
  "recommendedModels": [
    {
      "name": "推荐的AI模型名称",
      "provider": "提供商",
      "reason": "推荐理由",
      "pricing": "定价信息"
    }
  ],
  "keyAlgorithms": ["关键算法1", "关键算法2", "关键算法3"],
  "mcpTools": [
    {
      "name": "MCP工具名称",
      "purpose": "用途说明",
      "implementation": "实现方式"
    }
  ],
  "architecture": ["架构组件1", "架构组件2", "架构组件3"]
}

要求：
1. 推荐最适合的AI模型和技术栈
2. 结果必须是有效的JSON格式，不要包含任何其他文本
`;
  } else {
    return `
Please analyze the technical solution for the following AI product requirements:

【Product Requirements】：
${inputText}

Please return the technical solution analysis results in the following JSON format:

{
  "recommendedModels": [
    {
      "name": "Recommended AI Model Name",
      "provider": "Provider",
      "reason": "Recommendation reason",
      "pricing": "Pricing information"
    }
  ],
  "keyAlgorithms": ["Key Algorithm 1", "Key Algorithm 2", "Key Algorithm 3"],
  "mcpTools": [
    {
      "name": "MCP Tool Name",
      "purpose": "Purpose description",
      "implementation": "Implementation approach"
    }
  ],
  "architecture": ["Architecture Component 1", "Architecture Component 2", "Architecture Component 3"]
}

Requirements:
1. Recommend the most suitable AI models and tech stack
2. Results must be in valid JSON format only
`;
  }
}

function generateModulesPrompt(inputText, language = 'zh') {
  if (language === 'zh') {
    return `
请为以下AI产品需求生成开发模块分解：

【产品需求】：
${inputText}

请按照以下JSON格式返回开发模块分析结果：

[
  {
    "moduleName": "模块名称",
    "functionality": "功能描述",
    "priority": "High",
    "estimatedTime": "预估开发时间",
    "cursorPrompts": [
      {
        "fileName": "文件名.md",
        "content": "详细的Cursor开发提示词内容"
      }
    ]
  }
]

要求：
1. 提供实用的开发指导和Cursor提示词
2. priority必须是"High"、"Medium"或"Low"之一
3. 结果必须是有效的JSON格式，不要包含任何其他文本
`;
  } else {
    return `
Please generate development module breakdown for the following AI product requirements:

【Product Requirements】：
${inputText}

Please return the development modules analysis results in the following JSON format:

[
  {
    "moduleName": "Module Name",
    "functionality": "Functionality description",
    "priority": "High",
    "estimatedTime": "Estimated development time",
    "cursorPrompts": [
      {
        "fileName": "filename.md",
        "content": "Detailed Cursor development prompt content"
      }
    ]
  }
]

Requirements:
1. Provide practical development guidance and Cursor prompts
2. priority must be one of "High", "Medium", or "Low"
3. Results must be in valid JSON format only
`;
  }
}

// 生成MVP分析的辅助函数
function generateMVPAnalysis(inputText, language = 'zh') {
  const inputLower = inputText.toLowerCase();
  const isMeditation = inputLower.includes('冥想') || inputLower.includes('显化') || inputLower.includes('meditation') || inputLower.includes('manifesta');
  const isHealthFitness = inputLower.includes('健身') || inputLower.includes('运动') || inputLower.includes('fitness');

  if (isMeditation) {
    return {
      title: language === 'zh' ? '冥想显化AI助手' : 'AI Meditation & Manifestation Coach',
      description: language === 'zh' ? 
        '基于人工智能的个性化冥想引导平台，通过AI语音生成技术提供定制化冥想体验，帮助用户实现内心平静与目标显化。支持多种显化类型选择、个性化时长设置、不同冥想姿势指导，配合AI生成的引导语音、背景音乐和可视化场景，为用户打造沉浸式的冥想体验。' :
        'AI-powered personalized meditation guidance platform with dynamic voice generation for customized mindfulness experiences and manifestation practices.',
      coreFeatures: language === 'zh' ? 
        ['AI语音引导生成', '显化类型选择（工作、学业、财富、健康）', '个性化时长设置（10-30分钟）', '多种冥想姿势指导', '呼吸节奏同步', '背景音乐库', 'AI绘图场景生成', '冥想进度跟踪'] :
        ['AI Voice Guidance Generation', 'Manifestation Type Selection', 'Personalized Duration Settings', 'Multiple Meditation Postures', 'Breathing Rhythm Sync', 'Background Music Library', 'AI-Generated Scenes', 'Progress Tracking'],
      targetUsers: language === 'zh' ? 
        ['压力管理需求者', '目标显化实践者', '冥想初学者', '心理健康关注者', '灵性成长爱好者'] :
        ['Stress Management Seekers', 'Manifestation Practitioners', 'Meditation Beginners', 'Mental Health Enthusiasts', 'Spiritual Growth Seekers'],
      businessModel: language === 'zh' ? 
        '免费基础冥想内容 + 高级显化课程订阅（月费/年费）+ 个人定制引导服务 + 企业冥想培训' :
        'Free Basic Meditation + Premium Manifestation Subscription + Personal Customized Guidance + Corporate Training'
    };
  } else if (isHealthFitness) {
    return {
      title: language === 'zh' ? '智能健身AI教练' : 'Smart AI Fitness Coach',
      description: language === 'zh' ?
        '基于人工智能的个性化健身指导平台，通过分析用户身体状况、健身目标和运动偏好，提供定制化的训练计划和实时指导。' :
        'AI-powered personalized fitness guidance platform that analyzes user fitness levels, goals, and preferences to provide customized workout plans.',
      coreFeatures: language === 'zh' ?
        ['个性化训练计划', 'AI动作识别与纠正', '实时健身指导', '进度跟踪分析', '营养建议推荐'] :
        ['Personalized Workout Plans', 'AI Motion Recognition', 'Real-time Guidance', 'Progress Tracking', 'Nutrition Recommendations'],
      targetUsers: language === 'zh' ?
        ['健身初学者', '居家健身爱好者', '专业运动员', '康复训练人群'] :
        ['Fitness Beginners', 'Home Workout Enthusiasts', 'Professional Athletes', 'Rehabilitation Users'],
      businessModel: language === 'zh' ?
        '免费基础训练 + 高级功能订阅 + 私人教练服务 + 企业健身方案' :
        'Free Basic Training + Premium Subscription + Personal Training + Corporate Fitness'
    };
  } else {
    return {
      title: language === 'zh' ? '智能AI应用平台' : 'Smart AI Application Platform',
      description: language === 'zh' ? 
        '基于人工智能技术的创新应用平台，通过智能算法为用户提供个性化服务体验。' :
        'Innovative AI-powered application platform providing personalized service experiences.',
      coreFeatures: language === 'zh' ? 
        ['AI核心功能', '用户个性化服务', '数据智能分析', '多平台支持', '实时交互体验'] :
        ['AI Core Features', 'Personalized Services', 'Data Analytics', 'Multi-platform Support', 'Real-time Interaction'],
      targetUsers: language === 'zh' ? 
        ['普通用户', '专业用户', '企业客户'] :
        ['General Users', 'Professional Users', 'Enterprise Clients'],
      businessModel: language === 'zh' ? 
        '免费基础功能 + 高级功能订阅 + 企业定制服务' :
        'Free Basic Features + Premium Subscription + Enterprise Services'
    };
  }
}

// 生成技术方案的辅助函数
function generateTechSolution(inputText, language = 'zh') {
  return {
    recommendedModels: [
      {
        name: 'DeepSeek-V2.5',
        provider: 'DeepSeek',
        reason: language === 'zh' ? '成本效益最优，中文支持优秀，推理能力突出' : 'Most cost-effective with excellent Chinese support and reasoning capabilities',
        pricing: '¥0.0014/1K tokens'
      },
      {
        name: 'GPT-4o',
        provider: 'OpenAI',
        reason: language === 'zh' ? '多模态支持，可处理音频生成和图像创作需求' : 'Multimodal support for audio generation and image creation',
        pricing: '$0.0025/1K input tokens'
      }
    ],
    keyAlgorithms: language === 'zh' ? 
      ['大语言模型文本生成', '机器学习算法', '数据分析处理', '个性化推荐算法', '自然语言处理', '深度学习模型'] :
      ['Large Language Model Generation', 'Machine Learning Algorithms', 'Data Analytics Processing', 'Personalized Recommendation', 'Natural Language Processing', 'Deep Learning Models'],
    mcpTools: [
      {
        name: 'Database MCP',
        purpose: language === 'zh' ? '数据管理和存储操作' : 'Data management and storage operations',
        implementation: language === 'zh' ? '统一数据库操作接口，支持多种数据库类型' : 'Unified database operation interface supporting multiple database types'
      },
      {
        name: 'API Integration MCP',
        purpose: language === 'zh' ? '第三方服务集成' : 'Third-party service integration',
        implementation: language === 'zh' ? '标准化API调用接口，支持多种外部服务' : 'Standardized API calling interface for various external services'
      }
    ],
    architecture: language === 'zh' ? 
      ['前端应用层 (React/Vue.js)', 'API网关层 (Express/FastAPI)', 'AI服务层 (模型推理)', '数据存储层 (PostgreSQL/MongoDB)', '缓存层 (Redis)', '部署层 (Docker/K8s)'] :
      ['Frontend Layer (React/Vue.js)', 'API Gateway (Express/FastAPI)', 'AI Service Layer (Model Inference)', 'Data Storage (PostgreSQL/MongoDB)', 'Cache Layer (Redis)', 'Deployment (Docker/K8s)']
  };
}

// 生成开发模块的辅助函数
function generateDevelopmentModules(inputText, language = 'zh') {
  const inputLower = inputText.toLowerCase();
  const isMeditation = inputLower.includes('冥想') || inputLower.includes('显化') || inputLower.includes('meditation') || inputLower.includes('manifesta');
  
  if (isMeditation) {
    return [
      {
        moduleName: language === 'zh' ? '冥想引导语音生成模块' : 'Meditation Voice Guidance Module',
        functionality: language === 'zh' ? '核心AI语音生成功能，根据用户选择的显化类型、时长和个人偏好，实时生成个性化的冥想引导词，并转换为自然流畅的语音' : 'Core AI voice generation feature that creates personalized meditation guidance based on user preferences',
        priority: 'High',
        estimatedTime: language === 'zh' ? '4-5周' : '4-5 weeks',
        cursorPrompts: [
          {
            fileName: 'meditation-voice-generator.md',
            content: language === 'zh' ? 
              '# 冥想语音生成模块开发指南\n\n## 功能概述\n开发AI驱动的冥想引导语音生成系统，支持实时生成个性化冥想内容并转换为自然语音。\n\n## 技术要求\n- DeepSeek API集成用于内容生成\n- Azure Speech Services或Google Cloud TTS\n- 支持多种音色选择和语速调节\n- 实时音频流处理\n\n## 核心功能\n1. 个性化冥想脚本生成\n2. 语音合成和音频处理\n3. 背景音乐混合\n4. 实时流式传输\n\n## 开发步骤\n1. 设计冥想脚本模板系统\n2. 集成DeepSeek API进行内容生成\n3. 实现TTS语音合成功能\n4. 开发音频混合和处理\n5. 优化生成速度和质量' :
              '# Meditation Voice Generation Module Development Guide\n\n## Overview\nDevelop AI-driven meditation guidance voice generation system with real-time personalized content creation and natural speech conversion.\n\n## Technical Requirements\n- DeepSeek API integration for content generation\n- Azure Speech Services or Google Cloud TTS\n- Multiple voice options and speed control\n- Real-time audio streaming\n\n## Core Features\n1. Personalized meditation script generation\n2. Speech synthesis and audio processing\n3. Background music mixing\n4. Real-time streaming\n\n## Development Steps\n1. Design meditation script template system\n2. Integrate DeepSeek API for content generation\n3. Implement TTS speech synthesis\n4. Develop audio mixing and processing\n5. Optimize generation speed and quality'
          }
        ]
      }
    ];
  } else {
    return [
      {
        moduleName: language === 'zh' ? '核心AI功能模块' : 'Core AI Feature Module',
        functionality: language === 'zh' ? '实现主要的AI功能和用户交互' : 'Implement main AI features and user interaction',
        priority: 'High',
        estimatedTime: language === 'zh' ? '4-6周' : '4-6 weeks',
        cursorPrompts: [
          {
            fileName: 'ai-core-development.md',
            content: language === 'zh' ?
              '# AI核心功能开发指南\n\n## 项目概述\n开发基于AI的核心功能模块，提供智能化的用户服务。\n\n## 技术要求\n- 集成DeepSeek API\n- 实现用户交互界面\n- 数据处理和分析\n- 性能优化\n\n## 开发步骤\n1. 设计系统架构\n2. 实现AI接口集成\n3. 开发用户界面\n4. 测试和优化' :
              '# AI Core Feature Development Guide\n\n## Project Overview\nDevelop AI-based core feature modules providing intelligent user services.\n\n## Technical Requirements\n- DeepSeek API integration\n- User interaction interface implementation\n- Data processing and analysis\n- Performance optimization\n\n## Development Steps\n1. Design system architecture\n2. Implement AI interface integration\n3. Develop user interface\n4. Testing and optimization'
          }
        ]
      }
    ];
  }
}

// 流式AI产品分析API
app.post('/api/ai-product-analysis-stream', async (req, res) => {
  try {
    const { requirement, language = 'zh' } = req.body;
    
    if (!requirement || requirement.trim().length === 0) {
      return res.status(400).json({ 
        error: language === 'zh' ? '请提供产品需求描述' : 'Please provide product requirement description' 
      });
    }

    const inputText = requirement.trim();
    console.log('🔍 收到流式AI产品分析请求:', {
      requirement: inputText.substring(0, 100) + '...',
      language,
      timestamp: new Date().toISOString()
    });

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 发送数据的辅助函数
    const sendData = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 步骤1: 开始分析 (10%)
      sendData({
        type: 'progress',
        step: 'start',
        progress: 10,
        message: language === 'zh' ? '开始AI产品分析...' : 'Starting AI product analysis...'
      });

      // 步骤2: MVP分析 (25% -> 40%)
      sendData({
        type: 'progress',
        step: 'mvp_start',
        progress: 25,
        message: language === 'zh' ? '正在分析最小可行产品...' : 'Analyzing Minimum Viable Product...'
      });

      // 调用DeepSeek API生成MVP分析
      const mvpPrompt = generateMVPPrompt(inputText, language);
      const mvpResult = await callDeepSeekAPI(mvpPrompt, language);
      
      let mvpData;
      if (mvpResult) {
        try {
          mvpData = JSON.parse(mvpResult);
          console.log('✅ MVP分析：DeepSeek API成功');
        } catch (parseError) {
          console.log('❌ MVP分析：JSON解析失败，使用备用逻辑');
          mvpData = generateMVPAnalysis(inputText, language);
        }
      } else {
        console.log('❌ MVP分析：API调用失败，使用备用逻辑');
        mvpData = generateMVPAnalysis(inputText, language);
      }

      sendData({
        type: 'result',
        step: 'mvp_complete',
        progress: 40,
        data: { minimumViableProduct: mvpData }
      });

      // 步骤3: 技术方案分析 (50% -> 70%)
      sendData({
        type: 'progress',
        step: 'tech_start',
        progress: 50,
        message: language === 'zh' ? '正在分析技术解决方案...' : 'Analyzing technical solutions...'
      });

      // 调用DeepSeek API生成技术方案
      const techPrompt = generateTechPrompt(inputText, language);
      const techResult = await callDeepSeekAPI(techPrompt, language);
      
      let techData;
      if (techResult) {
        try {
          techData = JSON.parse(techResult);
          console.log('✅ 技术方案：DeepSeek API成功');
        } catch (parseError) {
          console.log('❌ 技术方案：JSON解析失败，使用备用逻辑');
          techData = generateTechSolution(inputText, language);
        }
      } else {
        console.log('❌ 技术方案：API调用失败，使用备用逻辑');
        techData = generateTechSolution(inputText, language);
      }

      sendData({
        type: 'result',
        step: 'tech_complete',
        progress: 70,
        data: { technicalSolution: techData }
      });

      // 步骤4: 开发模块分析 (80% -> 95%)
      sendData({
        type: 'progress',
        step: 'modules_start',
        progress: 80,
        message: language === 'zh' ? '正在生成开发模块...' : 'Generating development modules...'
      });

      // 调用DeepSeek API生成开发模块
      const modulesPrompt = generateModulesPrompt(inputText, language);
      const modulesResult = await callDeepSeekAPI(modulesPrompt, language);
      
      let modulesData;
      if (modulesResult) {
        try {
          modulesData = JSON.parse(modulesResult);
          console.log('✅ 开发模块：DeepSeek API成功');
        } catch (parseError) {
          console.log('❌ 开发模块：JSON解析失败，使用备用逻辑');
          modulesData = generateDevelopmentModules(inputText, language);
        }
      } else {
        console.log('❌ 开发模块：API调用失败，使用备用逻辑');
        modulesData = generateDevelopmentModules(inputText, language);
      }

      sendData({
        type: 'result',
        step: 'modules_complete',
        progress: 95,
        data: { developmentModules: modulesData }
      });

      // 步骤5: 完成 (100%)
      sendData({
        type: 'complete',
        step: 'complete',
        progress: 100,
        message: language === 'zh' ? '分析完成！' : 'Analysis completed!'
      });

    } catch (error) {
      console.error('❌ 流式分析过程出错:', error);
      sendData({
        type: 'error',
        message: language === 'zh' ? '分析过程中出现错误，请稍后重试' : 'Error occurred during analysis, please try again later'
      });
    }

    res.end();
  } catch (error) {
    console.error('❌ 流式API错误:', error);
    res.status(500).json({ 
      error: language === 'zh' ? '服务器内部错误' : 'Internal server error' 
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 DeepSeek AI Analysis Server 运行在 http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/health`);
  console.log(`🤖 流式AI产品分析: POST http://localhost:${PORT}/api/ai-product-analysis-stream`);
  console.log(`🔑 DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('🎯 将使用DeepSeek Chat大模型进行真实AI分析');
  } else {
    console.log('⚠️ 未配置DeepSeek API密钥，将使用备用分析逻辑');
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});
