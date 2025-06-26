import { Handler } from '@netlify/functions';

interface RequestBody {
  requirement: string;
  language: 'en' | 'zh';
}

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

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-567abb67b99d4a65acaa2d9ed06c3782';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { requirement, language } = JSON.parse(event.body || '{}');

    if (!requirement || requirement.trim().length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: language === 'zh' ? '请输入至少10个字符的产品需求' : 'Please enter at least 10 characters for product requirement' 
        })
      };
    }

    // 模拟分析过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 根据需求生成智能分析
    const analysis = generateProductAnalysis(requirement, language);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis)
    };

  } catch (error) {
    console.error('Analysis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: language === 'zh' ? '分析失败，请重试' : 'Analysis failed, please try again' 
      })
    };
  }
};

function generateProductAnalysis(requirement: string, language: 'en' | 'zh') {
  const isZh = language === 'zh';
  
  // 检测产品类型
  const req = requirement.toLowerCase();
  let productType = 'general';
  
  if (req.includes('健身') || req.includes('fitness') || req.includes('运动')) {
    productType = 'fitness';
  } else if (req.includes('教育') || req.includes('education') || req.includes('学习')) {
    productType = 'education';
  } else if (req.includes('电商') || req.includes('购物') || req.includes('ecommerce')) {
    productType = 'ecommerce';
  }

  return {
    minimumViableProduct: {
      title: isZh ? getZhProductTitle(productType) : getEnProductTitle(productType),
      description: isZh ? getZhProductDesc(productType) : getEnProductDesc(productType),
      coreFeatures: isZh ? getZhCoreFeatures(productType) : getEnCoreFeatures(productType),
      targetUsers: isZh ? ['目标用户群体1', '目标用户群体2', '目标用户群体3'] : ['Target User Group 1', 'Target User Group 2', 'Target User Group 3'],
      businessModel: isZh ? '订阅制 + 增值服务模式' : 'Subscription + Value-added Services Model'
    },
    technicalSolution: {
      recommendedModels: [
        {
          name: 'GPT-4',
          provider: 'OpenAI',
          reason: isZh ? '强大的语言理解能力，适合复杂对话场景' : 'Powerful language understanding for complex conversations',
          pricing: '$0.03/1K tokens'
        },
        {
          name: 'Claude-3.5',
          provider: 'Anthropic',
          reason: isZh ? '安全性高，推理能力强' : 'High safety and strong reasoning capabilities',
          pricing: '$0.015/1K tokens'
        }
      ],
      keyAlgorithms: isZh ? 
        ['自然语言处理', '机器学习', '深度学习', '推荐算法'] : 
        ['Natural Language Processing', 'Machine Learning', 'Deep Learning', 'Recommendation Algorithms'],
      mcpTools: [
        {
          name: 'Database MCP',
          purpose: isZh ? '数据存储和管理' : 'Data storage and management',
          implementation: isZh ? '支持多种数据库操作' : 'Support various database operations'
        },
        {
          name: 'Web Scraper MCP',
          purpose: isZh ? '网络数据抓取' : 'Web data scraping',
          implementation: isZh ? '自动化数据收集' : 'Automated data collection'
        }
      ],
      architecture: isZh ? 
        ['前端React应用', '后端Node.js API', 'AI模型集成层', '数据库系统', '缓存服务'] :
        ['Frontend React App', 'Backend Node.js API', 'AI Model Integration', 'Database System', 'Cache Service']
    },
    developmentModules: [
      {
        moduleName: isZh ? '用户界面模块' : 'User Interface Module',
        functionality: isZh ? '负责前端界面设计和用户交互实现' : 'Frontend interface design and user interaction implementation',
        priority: 'High',
        estimatedTime: isZh ? '2-3周' : '2-3 weeks',
        cursorPrompts: [
          {
            fileName: 'ui-components.md',
            content: isZh ? 
              '# React组件开发\n\n创建现代化的React组件，使用TypeScript和Tailwind CSS。包含响应式设计、主题支持和可访问性功能。' :
              '# React Component Development\n\nCreate modern React components using TypeScript and Tailwind CSS. Include responsive design, theme support, and accessibility features.'
          }
        ]
      },
      {
        moduleName: isZh ? 'AI核心服务模块' : 'AI Core Service Module',
        functionality: isZh ? '实现AI模型调用和智能分析功能' : 'Implement AI model calls and intelligent analysis features',
        priority: 'High',
        estimatedTime: isZh ? '3-4周' : '3-4 weeks',
        cursorPrompts: [
          {
            fileName: 'ai-service.md',
            content: isZh ?
              '# AI服务实现\n\n创建统一的AI服务接口，支持多种模型调用、错误处理和结果优化。包含缓存机制和性能监控。' :
              '# AI Service Implementation\n\nCreate unified AI service interface supporting multiple model calls, error handling, and result optimization. Include caching and performance monitoring.'
          }
        ]
      }
    ]
  };
}

function getZhProductTitle(type: string): string {
  const titles = {
    fitness: 'AI智能健身助手',
    education: 'AI个性化学习平台',
    ecommerce: 'AI智能购物助手',
    general: 'AI智能产品助手'
  };
  return titles[type] || titles.general;
}

function getEnProductTitle(type: string): string {
  const titles = {
    fitness: 'AI Smart Fitness Coach',
    education: 'AI Personalized Learning Platform', 
    ecommerce: 'AI Smart Shopping Assistant',
    general: 'AI Smart Product Assistant'
  };
  return titles[type] || titles.general;
}

function getZhProductDesc(type: string): string {
  const descriptions = {
    fitness: '基于AI技术的个性化健身指导和训练计划定制平台',
    education: '利用人工智能提供个性化学习路径和智能辅导的教育平台',
    ecommerce: '智能购物推荐和用户体验优化的电商解决方案',
    general: '基于用户需求提供智能化解决方案的AI产品'
  };
  return descriptions[type] || descriptions.general;
}

function getEnProductDesc(type: string): string {
  const descriptions = {
    fitness: 'AI-powered personalized fitness guidance and training plan customization platform',
    education: 'Education platform utilizing AI for personalized learning paths and intelligent tutoring',
    ecommerce: 'E-commerce solution with smart shopping recommendations and user experience optimization',
    general: 'AI product providing intelligent solutions based on user requirements'
  };
  return descriptions[type] || descriptions.general;
}

function getZhCoreFeatures(type: string): string[] {
  const features = {
    fitness: ['个性化训练计划', 'AI动作识别', '健康数据分析', '社区互动功能'],
    education: ['智能课程推荐', '学习进度跟踪', 'AI答疑助手', '互动练习'],
    ecommerce: ['智能商品推荐', '价格对比分析', '用户行为分析', '个性化界面'],
    general: ['智能分析', '个性化推荐', '数据洞察', '自动化处理']
  };
  return features[type] || features.general;
}

function getEnCoreFeatures(type: string): string[] {
  const features = {
    fitness: ['Personalized Training Plans', 'AI Motion Recognition', 'Health Data Analysis', 'Community Features'],
    education: ['Smart Course Recommendations', 'Learning Progress Tracking', 'AI Q&A Assistant', 'Interactive Exercises'],
    ecommerce: ['Smart Product Recommendations', 'Price Comparison Analysis', 'User Behavior Analytics', 'Personalized Interface'],
    general: ['Smart Analysis', 'Personalized Recommendations', 'Data Insights', 'Automated Processing']
  };
  return features[type] || features.general;
} 