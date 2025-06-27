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
  res.json({ status: 'ok', message: 'AWS Backend Test Server Running' });
});

// DeepSeek API调用函数
async function callDeepSeekAPI(prompt, language = 'zh') {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  
  if (!DEEPSEEK_API_KEY) {
    console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟数据');
    return null;
  }

  try {
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
              '你是一个专业的AI产品分析师。请根据用户提供的产品需求，生成详细的产品分析报告，包括最小可行产品(MVP)建议、技术解决方案和开发模块分解。请以JSON格式返回结果。' :
              'You are a professional AI product analyst. Please generate a detailed product analysis report based on user requirements, including MVP recommendations, technical solutions, and development module breakdown. Return results in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
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

请按照以下JSON格式返回分析结果：

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
      "priority": "High/Medium/Low",
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

请确保：
1. 根据产品需求的具体内容进行个性化分析
2. 推荐最适合的AI模型和技术栈
3. 提供实用的开发指导和Cursor提示词
4. 结果必须是有效的JSON格式
`;
  } else {
    return `
Please analyze the following AI product requirements and generate a detailed product analysis report:

【Product Requirements】：
${inputText}

Please return the analysis results in the following JSON format:

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
      "priority": "High/Medium/Low",
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

Please ensure:
1. Personalized analysis based on specific product requirements
2. Recommend the most suitable AI models and tech stack
3. Provide practical development guidance and Cursor prompts
4. Results must be in valid JSON format
`;
  }
}

// 解析DeepSeek响应
function parseDeepSeekResponse(response, language = 'zh') {
  try {
    // 尝试直接解析JSON
    const parsed = JSON.parse(response);
    return parsed;
  } catch (error) {
    console.log('直接JSON解析失败，尝试提取JSON部分...');
    
    // 尝试从响应中提取JSON部分
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch (innerError) {
        console.log('提取的JSON解析失败');
      }
    }
    
    // 如果解析失败，返回基于输入的智能分析
    return generateFallbackAnalysis(response, language);
  }
}

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
          },
          {
            name: 'Claude-3.5 Sonnet',
            provider: 'Anthropic',
            reason: language === 'zh' ? '安全性高，适合心理健康相关内容生成' : 'High safety standards for mental health content generation',
            pricing: '$0.003/1K input tokens'
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
          },
          {
            name: 'Database MCP',
            purpose: language === 'zh' ? '用户数据和冥想记录管理' : 'User data and meditation record management',
            implementation: language === 'zh' ? '存储用户偏好、冥想历史、进度跟踪等数据' : 'Store user preferences, meditation history, and progress tracking'
          }
        ],
        architecture: language === 'zh' ? 
          ['前端应用层 (React Native + Expo)', '语音服务层 (TTS + 音频处理)', 'AI内容生成层 (LLM + 图像生成)', 'API网关层 (Express + 路由管理)', '数据存储层 (PostgreSQL + Redis)', '媒体存储 (AWS S3 + CDN)', '推送通知服务', '用户认证系统'] :
          ['Frontend App Layer (React Native + Expo)', 'Voice Service Layer (TTS + Audio Processing)', 'AI Content Generation Layer (LLM + Image Generation)', 'API Gateway (Express + Routing)', 'Data Storage (PostgreSQL + Redis)', 'Media Storage (AWS S3 + CDN)', 'Push Notification Service', 'User Authentication System']
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
              content: language === 'zh' ? 
                `# 冥想语音生成模块开发指南

## 功能概述
开发AI驱动的冥想引导语音生成系统，支持实时生成个性化冥想内容并转换为自然语音。

## 技术要求

### 1. AI文本生成
\`\`\`typescript
interface MeditationRequest {
  type: 'relaxation' | 'work' | 'study' | 'wealth' | 'health';
  duration: 10 | 15 | 20 | 30; // 分钟
  posture: 'sitting' | 'lying' | 'lotus';
  userProfile: {
    experience: 'beginner' | 'intermediate' | 'advanced';
    preferences: string[];
    language: 'zh' | 'en';
  };
}

interface MeditationScript {
  introduction: string;
  breathingGuide: string[];
  visualizationSteps: string[];
  affirmations: string[];
  conclusion: string;
  backgroundMusic: string;
  estimatedDuration: number;
}
\`\`\`

### 2. 语音合成集成
- 使用Azure Speech Services或Google Cloud TTS
- 支持多种音色选择（男声/女声/中性）
- 可调节语速和音调
- 支持SSML标记语言

### 3. 实时生成流程
1. 接收用户参数
2. 调用DeepSeek API生成引导词
3. 分段处理文本内容
4. 转换为语音文件
5. 与背景音乐混合
6. 返回完整音频

## 实现步骤
1. 设计冥想脚本模板系统
2. 集成DeepSeek API进行内容生成
3. 实现TTS语音合成功能
4. 开发音频混合和处理
5. 优化生成速度和质量
6. 添加缓存机制

## 性能优化
- 预生成常用冥想模板
- 实现音频流式传输
- 使用CDN加速音频分发
- 添加本地缓存机制` :
                `# Meditation Voice Generator Development Guide

## Overview
Develop an AI-driven meditation voice guidance system that generates personalized content in real-time.

## Technical Requirements

### 1. AI Text Generation
\`\`\`typescript
interface MeditationRequest {
  type: 'relaxation' | 'work' | 'study' | 'wealth' | 'health';
  duration: 10 | 15 | 20 | 30; // minutes
  posture: 'sitting' | 'lying' | 'lotus';
  userProfile: {
    experience: 'beginner' | 'intermediate' | 'advanced';
    preferences: string[];
    language: 'zh' | 'en';
  };
}
\`\`\`

### 2. Voice Synthesis Integration
- Use Azure Speech Services or Google Cloud TTS
- Support multiple voice options
- Adjustable speed and tone
- SSML markup support

### 3. Real-time Generation Flow
1. Receive user parameters
2. Call DeepSeek API for content generation
3. Process text in segments
4. Convert to audio files
5. Mix with background music
6. Return complete audio

## Implementation Steps
1. Design meditation script template system
2. Integrate DeepSeek API
3. Implement TTS functionality
4. Develop audio mixing
5. Optimize generation speed
6. Add caching mechanism`
            }
          ]
        },
        {
          moduleName: language === 'zh' ? '显化场景可视化模块' : 'Manifestation Scene Visualization Module',
          functionality: language === 'zh' ? '使用AI绘图技术为不同的显化类型生成对应的背景场景，包括自然风光、抽象图案、能量流动等视觉元素，增强用户的沉浸式体验' : 'Generate corresponding background scenes for different manifestation types using AI image generation',
          priority: 'Medium',
          estimatedTime: language === 'zh' ? '3-4周' : '3-4 weeks',
          cursorPrompts: [
            {
              fileName: 'scene-visualization-generator.md',
              content: language === 'zh' ? 
                `# 显化场景可视化开发指南

## 功能目标
为冥想应用开发AI驱动的场景生成系统，根据不同显化类型创建相应的视觉背景。

## 场景类型映射

### 1. 财富显化场景
- 金色光芒、丰盛花园、流水瀑布
- 温暖色调：金色、绿色、橙色

### 2. 工作显化场景  
- 现代办公空间、山顶视野、成功象征
- 专业色调：蓝色、灰色、白色

### 3. 学业显化场景
- 图书馆、知识殿堂、智慧之光
- 清新色调：蓝色、紫色、白色

### 4. 健康显化场景
- 自然森林、清澈湖水、生命之树
- 自然色调：绿色、蓝色、白色

## 技术实现

### 1. AI图像生成
\`\`\`typescript
interface SceneGenerationRequest {
  manifestationType: string;
  style: 'realistic' | 'abstract' | 'artistic';
  colorPalette: string[];
  resolution: '1080p' | '4K';
  aspectRatio: '16:9' | '9:16' | '1:1';
}

async function generateScene(request: SceneGenerationRequest): Promise<string> {
  const prompt = buildPrompt(request);
  const imageUrl = await callStableDiffusion(prompt);
  return imageUrl;
}
\`\`\`

### 2. 提示词模板
- 基础场景描述 + 情感关键词 + 艺术风格
- 确保输出适合冥想环境
- 避免过于刺激或分散注意力的元素

### 3. 缓存策略
- 预生成常用场景组合
- 本地存储高频使用的图像
- CDN分发优化加载速度

## 开发流程
1. 设计场景分类和风格系统
2. 集成Stable Diffusion API
3. 开发提示词生成引擎
4. 实现图像缓存和管理
5. 优化生成质量和速度
6. 添加用户自定义选项` :
                `# Scene Visualization Development Guide

## Objective
Develop AI-driven scene generation for meditation app with manifestation-specific backgrounds.

## Scene Type Mapping

### 1. Wealth Manifestation
- Golden light, abundant gardens, flowing water
- Warm tones: gold, green, orange

### 2. Career Manifestation  
- Modern office spaces, mountain views, success symbols
- Professional tones: blue, gray, white

### 3. Study Manifestation
- Libraries, halls of knowledge, wisdom light
- Fresh tones: blue, purple, white

## Technical Implementation

\`\`\`typescript
interface SceneGenerationRequest {
  manifestationType: string;
  style: 'realistic' | 'abstract' | 'artistic';
  colorPalette: string[];
  resolution: '1080p' | '4K';
}
\`\`\`

## Development Process
1. Design scene classification system
2. Integrate Stable Diffusion API
3. Develop prompt generation engine
4. Implement image caching
5. Optimize generation quality
6. Add user customization options`
            }
          ]
        }
      ]
    };
  } else if (isHealthFitness) {
    // 健身类产品分析...
    return {
      minimumViableProduct: {
        title: language === 'zh' ? 'AI智能健身助手' : 'AI Smart Fitness Coach',
        description: language === 'zh' ? 
          '基于人工智能的个性化健身指导平台，通过用户数据分析提供定制化训练方案，包含AI动作识别、健康数据分析、社区互动等功能。' :
          'AI-powered personalized fitness guidance platform with data-driven training recommendations.',
        coreFeatures: language === 'zh' ? 
          ['个性化训练计划生成', 'AI动作识别与纠正', '健康数据智能分析', '社区互动与挑战', '营养建议系统'] :
          ['Personalized Training Plans', 'AI Motion Recognition', 'Health Data Analytics', 'Community Challenges', 'Nutrition Guidance'],
        targetUsers: language === 'zh' ? 
          ['健身爱好者', '健身初学者', '专业运动员', '健身教练'] :
          ['Fitness Enthusiasts', 'Beginners', 'Professional Athletes', 'Fitness Trainers'],
        businessModel: language === 'zh' ? 
          '免费基础版 + 高级订阅制 + 个人教练服务' :
          'Freemium + Premium Subscription + Personal Training Services'
      },
      technicalSolution: {
        recommendedModels: [
          {
            name: 'GPT-4o',
            provider: 'OpenAI',
            reason: language === 'zh' ? '多模态支持，适合处理运动视频和图像分析' : 'Multimodal support for exercise video and image analysis',
            pricing: '$0.0025/1K input tokens'
          }
        ],
        keyAlgorithms: language === 'zh' ? 
          ['计算机视觉', '姿态估计', '动作识别', '个性化推荐', '数据分析'] :
          ['Computer Vision', 'Pose Estimation', 'Motion Recognition', 'Personalized Recommendation', 'Data Analytics'],
        mcpTools: [
          {
            name: 'Computer Vision MCP',
            purpose: language === 'zh' ? '运动姿态分析和动作识别' : 'Exercise pose analysis and motion recognition',
            implementation: language === 'zh' ? '使用OpenCV和MediaPipe进行实时姿态检测' : 'Use OpenCV and MediaPipe for real-time pose detection'
          }
        ],
        architecture: language === 'zh' ? 
          ['移动应用层', 'AI分析服务', '数据存储层', '社区服务', '推荐引擎'] :
          ['Mobile App Layer', 'AI Analysis Service', 'Data Storage Layer', 'Community Service', 'Recommendation Engine']
      },
      developmentModules: [
        {
          moduleName: language === 'zh' ? 'AI动作识别模块' : 'AI Motion Recognition Module',
          functionality: language === 'zh' ? '实时分析用户运动姿态，提供动作纠正建议' : 'Real-time analysis of user exercise posture with correction suggestions',
          priority: 'High',
          estimatedTime: language === 'zh' ? '5-6周' : '5-6 weeks',
          cursorPrompts: [
            {
              fileName: 'motion-recognition-system.md',
              content: language === 'zh' ? 
                `# AI动作识别系统开发指南

## 功能概述
开发基于计算机视觉的运动动作识别和分析系统，实时监测用户健身动作并提供专业指导。

## 技术栈
- **计算机视觉**: OpenCV, MediaPipe
- **深度学习**: TensorFlow, PyTorch
- **姿态估计**: PoseNet, BlazePose
- **移动端**: React Native, TensorFlow Lite

## 核心功能
1. 实时姿态检测
2. 动作标准度评分
3. 错误动作识别
4. 改进建议生成
5. 运动数据统计

## 实现步骤
1. 集成MediaPipe姿态估计
2. 训练动作分类模型
3. 开发实时分析引擎
4. 设计评分算法
5. 实现反馈系统` :
                `# AI Motion Recognition System Development Guide

## Overview
Develop computer vision-based exercise motion recognition and analysis system.

## Tech Stack
- **Computer Vision**: OpenCV, MediaPipe
- **Deep Learning**: TensorFlow, PyTorch
- **Pose Estimation**: PoseNet, BlazePose
- **Mobile**: React Native, TensorFlow Lite

## Core Features
1. Real-time pose detection
2. Motion accuracy scoring
3. Error detection
4. Improvement suggestions
5. Exercise data statistics

## Implementation Steps
1. Integrate MediaPipe pose estimation
2. Train motion classification model
3. Develop real-time analysis engine
4. Design scoring algorithm
5. Implement feedback system`
            }
          ]
        }
      ]
    };
  } else {
    // 通用产品分析
    return {
      minimumViableProduct: {
        title: language === 'zh' ? 'AI智能应用平台' : 'AI Smart Application Platform',
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
            reason: language === 'zh' ? '成本效益最优，中文支持优秀' : 'Most cost-effective with excellent Chinese support',
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
              content: language === 'zh' ? 
                `# AI核心功能开发指南

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
4. 测试和优化` :
                `# AI Core Development Guide

## Project Overview
Develop AI-based core functionality module for intelligent user services.

## Technical Requirements
- Integrate DeepSeek API
- Implement user interface
- Data processing and analysis
- Performance optimization

## Development Steps
1. Design system architecture
2. Implement AI API integration
3. Develop user interface
4. Testing and optimization`
            }
          ]
        }
      ]
    };
  }
}

// AI产品分析API
app.post('/api/ai-product-analysis', async (req, res) => {
  try {
    const { requirement, description, language = 'zh' } = req.body;
    
    // 兼容两种参数名称
    const inputText = requirement || description;

    console.log('收到AI产品分析请求:', { 
      requirement: inputText?.substring(0, 50) + '...', 
      language,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置'
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
      console.log('DeepSeek API响应成功，解析结果...');
      analysis = parseDeepSeekResponse(deepseekResponse, language);
    } else {
      console.log('使用备用分析逻辑...');
      analysis = generateFallbackAnalysis(inputText, language);
    }

    console.log('AI产品分析完成:', { title: analysis.minimumViableProduct?.title });

    res.json(analysis);
  } catch (error) {
    console.error('AI产品分析错误:', error);
    res.status(500).json({
      error: language === 'zh' ? '分析过程中发生错误，请重试' : 'Error occurred during analysis, please try again'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 AWS Backend Test Server 运行在 http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/health`);
  console.log(`🤖 AI产品分析: POST http://localhost:${PORT}/api/ai-product-analysis`);
  console.log(`🔑 DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
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