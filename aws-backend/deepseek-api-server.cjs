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
    console.log('🤖 调用DeepSeek R1 API...');
    
    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: language === 'zh' ? 
              '你是一个专业的AI产品分析师和技术架构师。请根据用户提供的产品需求，生成详细的产品分析报告，包括最小可行产品(MVP)建议、AI技术解决方案和开发模块分解。请严格按照JSON格式返回结果，确保结果可以直接解析。回复要简洁但完整。' :
              'You are a professional AI product analyst and technical architect. Generate detailed product analysis reports based on user requirements, including MVP recommendations, AI technical solutions, and development module breakdown. Return results in strict JSON format. Keep responses concise but complete.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000, // 减少token数量以提高响应速度
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
    console.log('✅ DeepSeek API响应成功');
    return data.choices[0].message.content;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ DeepSeek API调用超时（5分钟）');
    } else {
      console.error('❌ DeepSeek API调用失败:', error.message);
    }
    return null;
  }
}

// 生成DeepSeek提示词
function generateDeepSeekPrompt(inputText, language = 'zh') {
  if (language === 'zh') {
    return `
请分析以下AI产品需求，并生成详细的产品分析报告：

【产品需求】：
${inputText}

请按照以下JSON格式返回分析结果（必须是有效的JSON格式）：

{
  "minimumViableProduct": {
    "title": "产品标题",
    "description": "产品详细描述（100-200字）",
    "coreFeatures": ["核心功能1", "核心功能2", "核心功能3", "核心功能4", "核心功能5"],
    "targetUsers": ["目标用户群体1", "目标用户群体2", "目标用户群体3"],
    "businessModel": "商业模式描述"
  },
  "technicalSolution": {
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
  },
  "developmentModules": [
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
}

要求：
1. 根据产品需求的具体内容进行个性化分析
2. 推荐最适合的AI模型和技术栈
3. 提供实用的开发指导和Cursor提示词
4. 结果必须是有效的JSON格式，不要包含任何其他文本
`;
  } else {
    return `
Please analyze the following AI product requirements and generate a detailed product analysis report:

【Product Requirements】：
${inputText}

Please return the analysis results in the following JSON format (must be valid JSON):

{
  "minimumViableProduct": {
    "title": "Product Title",
    "description": "Detailed product description (100-200 words)",
    "coreFeatures": ["Core Feature 1", "Core Feature 2", "Core Feature 3", "Core Feature 4", "Core Feature 5"],
    "targetUsers": ["Target User Group 1", "Target User Group 2", "Target User Group 3"],
    "businessModel": "Business model description"
  },
  "technicalSolution": {
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
  },
  "developmentModules": [
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
}

Requirements:
1. Personalized analysis based on specific product requirements
2. Recommend the most suitable AI models and tech stack
3. Provide practical development guidance and Cursor prompts
4. Results must be in valid JSON format only
`;
  }
}

// AI产品分析API
app.post('/api/ai-product-analysis', async (req, res) => {
  try {
    const { requirement, description, language = 'zh' } = req.body;
    
    // 兼容两种参数名称
    const inputText = requirement || description;

    console.log('🔍 收到AI产品分析请求:', { 
      requirement: inputText?.substring(0, 100) + '...', 
      language,
      timestamp: new Date().toISOString()
    });

    if (!inputText || inputText.trim().length < 10) {
      return res.status(400).json({
        error: language === 'zh' ? '请输入至少10个字符的产品需求' : 'Please enter at least 10 characters for product requirement'
      });
    }

    // 生成DeepSeek提示词
    const prompt = generateDeepSeekPrompt(inputText, language);
    
    // 调用DeepSeek API
    const deepseekResponse = await callDeepSeekAPI(prompt, language);
    
    let analysis;
    if (deepseekResponse) {
      try {
        console.log('📝 解析DeepSeek响应...');
        analysis = JSON.parse(deepseekResponse);
        console.log('✅ DeepSeek分析完成:', { title: analysis.minimumViableProduct?.title });
      } catch (parseError) {
        console.error('❌ JSON解析失败:', parseError.message);
        console.log('🔄 使用备用分析逻辑...');
        analysis = generateFallbackAnalysis(inputText, language);
      }
    } else {
      console.log('🔄 DeepSeek API不可用，使用备用分析逻辑...');
      analysis = generateFallbackAnalysis(inputText, language);
    }

    res.json(analysis);
  } catch (error) {
    console.error('💥 AI产品分析错误:', error);
    res.status(500).json({
      error: language === 'zh' ? '分析过程中发生错误，请重试' : 'Error occurred during analysis, please try again'
    });
  }
});

// 生成备用分析结果
function generateFallbackAnalysis(inputText, language = 'zh') {
  const inputLower = inputText.toLowerCase();
  const isMeditation = inputLower.includes('冥想') || inputLower.includes('显化') || inputLower.includes('meditation');
  const isHealthFitness = inputLower.includes('健身') || inputLower.includes('运动') || inputLower.includes('fitness');
  const isEducation = inputLower.includes('教育') || inputLower.includes('学习') || inputLower.includes('education');

  if (isMeditation) {
    return {
      minimumViableProduct: {
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
      },
      technicalSolution: {
        recommendedModels: [
          {
            name: 'DeepSeek-V2.5',
            provider: 'DeepSeek',
            reason: language === 'zh' ? '成本效益最优，中文支持优秀，适合生成冥想引导词和个性化内容' : 'Most cost-effective with excellent Chinese support for meditation guidance generation',
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
          ['大语言模型文本生成', '语音合成技术(TTS)', 'AI绘图算法(Stable Diffusion)', '个性化推荐算法', '情感分析算法', '音频处理算法'] :
          ['Large Language Model Text Generation', 'Text-to-Speech (TTS)', 'AI Image Generation (Stable Diffusion)', 'Personalized Recommendation', 'Sentiment Analysis', 'Audio Processing'],
        mcpTools: [
          {
            name: 'Audio Processing MCP',
            purpose: language === 'zh' ? '音频生成、处理和格式转换' : 'Audio generation, processing and format conversion',
            implementation: language === 'zh' ? '集成TTS服务，支持多种音色和语速调节，实现实时语音生成' : 'Integrate TTS services with multiple voice options and speed control'
          },
          {
            name: 'Image Generation MCP',
            purpose: language === 'zh' ? 'AI绘图和场景生成' : 'AI image and scene generation',
            implementation: language === 'zh' ? '集成Stable Diffusion或DALL-E，为不同显化类型生成对应的背景场景' : 'Integrate Stable Diffusion or DALL-E for manifestation scene generation'
          }
        ],
        architecture: language === 'zh' ? 
          ['前端应用层 (React Native + Expo)', '语音服务层 (TTS + 音频处理)', 'AI内容生成层 (LLM + 图像生成)', 'API网关层 (Express + 路由管理)', '数据存储层 (PostgreSQL + Redis)', '媒体存储 (AWS S3 + CDN)'] :
          ['Frontend App Layer (React Native + Expo)', 'Voice Service Layer (TTS + Audio Processing)', 'AI Content Generation Layer (LLM + Image Generation)', 'API Gateway (Express + Routing)', 'Data Storage (PostgreSQL + Redis)', 'Media Storage (AWS S3 + CDN)']
      },
      developmentModules: [
        {
          moduleName: language === 'zh' ? '冥想引导语音生成模块' : 'Meditation Voice Guidance Module',
          functionality: language === 'zh' ? '核心AI语音生成功能，根据用户选择的显化类型、时长和个人偏好，实时生成个性化的冥想引导词，并转换为自然流畅的语音' : 'Core AI voice generation feature that creates personalized meditation guidance based on user preferences',
          priority: 'High',
          estimatedTime: language === 'zh' ? '4-5周' : '4-5 weeks',
          cursorPrompts: [
            {
              fileName: 'meditation-voice-generator.md',
              content: `# 冥想语音生成模块开发指南

## 功能概述
开发AI驱动的冥想引导语音生成系统，支持实时生成个性化冥想内容并转换为自然语音。

## 技术要求
- DeepSeek API集成用于内容生成
- Azure Speech Services或Google Cloud TTS
- 支持多种音色选择和语速调节
- 实时音频流处理

## 核心功能
1. 个性化冥想脚本生成
2. 语音合成和音频处理
3. 背景音乐混合
4. 实时流式传输

## 开发步骤
1. 设计冥想脚本模板系统
2. 集成DeepSeek API进行内容生成
3. 实现TTS语音合成功能
4. 开发音频混合和处理
5. 优化生成速度和质量`
            }
          ]
        }
      ]
    };
  } else {
    // 通用分析
    return {
      minimumViableProduct: {
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
      },
      technicalSolution: {
        recommendedModels: [
          {
            name: 'DeepSeek-V2.5',
            provider: 'DeepSeek',
            reason: language === 'zh' ? '成本效益最优，中文支持优秀，推理能力突出' : 'Most cost-effective with excellent Chinese support and reasoning capabilities',
            pricing: '¥0.0014/1K tokens'
          }
        ],
        keyAlgorithms: language === 'zh' ? 
          ['大语言模型', '机器学习', '数据分析', '个性化推荐'] :
          ['Large Language Models', 'Machine Learning', 'Data Analytics', 'Personalized Recommendation'],
        mcpTools: [
          {
            name: 'Database MCP',
            purpose: language === 'zh' ? '数据管理和存储' : 'Data management and storage',
            implementation: language === 'zh' ? '统一数据库操作接口' : 'Unified database operation interface'
          }
        ],
        architecture: language === 'zh' ? 
          ['前端应用层', 'API服务层', '数据存储层', 'AI模型层'] :
          ['Frontend Layer', 'API Service Layer', 'Data Storage Layer', 'AI Model Layer']
      },
      developmentModules: [
        {
          moduleName: language === 'zh' ? '核心AI功能模块' : 'Core AI Feature Module',
          functionality: language === 'zh' ? '实现主要的AI功能和用户交互' : 'Implement main AI features and user interaction',
          priority: 'High',
          estimatedTime: language === 'zh' ? '4-6周' : '4-6 weeks',
          cursorPrompts: [
            {
              fileName: 'ai-core-development.md',
              content: `# AI核心功能开发指南

## 项目概述
开发基于AI的核心功能模块，提供智能化的用户服务。

## 技术要求
- 集成DeepSeek API
- 实现用户交互界面
- 数据处理和分析
- 性能优化

## 开发步骤
1. 设计系统架构
2. 实现AI接口集成
3. 开发用户界面
4. 测试和优化`
            }
          ]
        }
      ]
    };
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 DeepSeek AI Analysis Server 运行在 http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/health`);
  console.log(`🤖 AI产品分析: POST http://localhost:${PORT}/api/ai-product-analysis`);
  console.log(`🔑 DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('🎯 将使用DeepSeek R1大模型进行真实AI分析');
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