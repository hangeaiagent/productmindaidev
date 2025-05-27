import { Handler } from '@netlify/functions';
import { logger } from './utils/logger';

// AIbase分类映射表
const AIBASE_CATEGORIES = {
  // AI绘画生成
  'ai-art': {
    primary: 'AI创作工具',
    secondary: 'AI绘画生成',
    keywords: ['绘画', '画图', '艺术', 'art', 'draw', 'paint', 'image', 'picture']
  },
  // AI文案写作
  'ai-writing': {
    primary: 'AI创作工具',
    secondary: 'AI文案写作',
    keywords: ['写作', '文案', '文章', 'writing', 'content', 'text', 'article']
  },
  // AI视频编辑
  'ai-video': {
    primary: 'AI创作工具',
    secondary: 'AI视频编辑',
    keywords: ['视频', '剪辑', 'video', 'edit', 'movie', 'film']
  },
  // AI音频处理
  'ai-audio': {
    primary: 'AI创作工具',
    secondary: 'AI音频处理',
    keywords: ['音频', '音乐', '声音', 'audio', 'music', 'sound', 'voice']
  },
  // AI智能营销
  'ai-marketing': {
    primary: 'AI商业工具',
    secondary: 'AI智能营销',
    keywords: ['营销', '推广', '广告', 'marketing', 'promotion', 'advertising']
  },
  // AI数据分析
  'ai-analytics': {
    primary: 'AI商业工具',
    secondary: 'AI数据分析',
    keywords: ['数据', '分析', '统计', 'data', 'analytics', 'analysis', 'statistics']
  },
  // AI客服助手
  'ai-customer': {
    primary: 'AI商业工具',
    secondary: 'AI客服助手',
    keywords: ['客服', '助手', '聊天', 'customer', 'service', 'chat', 'assistant']
  },
  // AI代码开发
  'ai-coding': {
    primary: 'AI开发工具',
    secondary: 'AI代码开发',
    keywords: ['代码', '编程', '开发', 'code', 'programming', 'development', 'coding']
  },
  // AI模型训练
  'ai-training': {
    primary: 'AI开发工具',
    secondary: 'AI模型训练',
    keywords: ['模型', '训练', '机器学习', 'model', 'training', 'machine learning', 'ml']
  },
  // AI工具平台
  'ai-platform': {
    primary: 'AI平台服务',
    secondary: 'AI工具平台',
    keywords: ['平台', '工具', '服务', 'platform', 'tool', 'service']
  },
  // AI API服务
  'ai-api': {
    primary: 'AI平台服务',
    secondary: 'AI API服务',
    keywords: ['api', '接口', '服务', 'service', 'interface']
  },
  // AI教育培训
  'ai-education': {
    primary: 'AI应用场景',
    secondary: 'AI教育培训',
    keywords: ['教育', '培训', '学习', 'education', 'training', 'learning', 'study']
  },
  // AI医疗健康
  'ai-healthcare': {
    primary: 'AI应用场景',
    secondary: 'AI医疗健康',
    keywords: ['医疗', '健康', '医学', 'healthcare', 'medical', 'health']
  },
  // AI金融科技
  'ai-fintech': {
    primary: 'AI应用场景',
    secondary: 'AI金融科技',
    keywords: ['金融', '财务', '投资', 'finance', 'financial', 'investment']
  },
  // AI游戏娱乐
  'ai-gaming': {
    primary: 'AI应用场景',
    secondary: 'AI游戏娱乐',
    keywords: ['游戏', '娱乐', '互动', 'game', 'gaming', 'entertainment']
  }
};

// 从产品名称和描述中提取分类
function extractCategoryFromContent(name: string, description: string = ''): {
  primary: string;
  secondary: string;
  category_path: string;
} {
  const content = `${name} ${description}`.toLowerCase();
  
  // 遍历所有分类，找到最匹配的
  let bestMatch = {
    category: 'ai-platform',
    score: 0
  };
  
  for (const [categoryKey, categoryInfo] of Object.entries(AIBASE_CATEGORIES)) {
    let score = 0;
    
    // 计算关键词匹配分数
    for (const keyword of categoryInfo.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += keyword.length; // 更长的关键词权重更高
      }
    }
    
    if (score > bestMatch.score) {
      bestMatch = {
        category: categoryKey,
        score
      };
    }
  }
  
  const selectedCategory = AIBASE_CATEGORIES[bestMatch.category as keyof typeof AIBASE_CATEGORIES];
  
  return {
    primary: selectedCategory.primary,
    secondary: selectedCategory.secondary,
    category_path: `${selectedCategory.primary}/${selectedCategory.secondary}`
  };
}

// 从AIbase URL中提取分类信息
function extractCategoryFromUrl(url: string): {
  primary: string;
  secondary: string;
  category_path: string;
} | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // 从URL路径中提取分类信息
    if (pathname.includes('/tool/')) {
      // 大部分工具都是AI工具平台
      return {
        primary: 'AI平台服务',
        secondary: 'AI工具平台',
        category_path: 'AI平台服务/AI工具平台'
      };
    }
    
    if (pathname.includes('/category/')) {
      // 如果URL包含分类信息，可以进一步解析
      const categoryMatch = pathname.match(/\/category\/([^\/]+)/);
      if (categoryMatch) {
        const categorySlug = categoryMatch[1];
        // 根据分类slug映射到具体分类
        // 这里可以根据实际的AIbase分类结构进行扩展
      }
    }
    
    return null;
  } catch (error) {
    logger.warn('URL解析失败', { url, error: error.message });
    return null;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, description, url } = JSON.parse(event.body || '{}');
    
    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '产品名称不能为空' })
      };
    }

    logger.info('🔍 开始提取产品分类', { name, description, url });

    let categories;
    
    // 首先尝试从URL提取分类
    if (url) {
      categories = extractCategoryFromUrl(url);
    }
    
    // 如果URL提取失败，从内容提取分类
    if (!categories) {
      categories = extractCategoryFromContent(name, description);
    }
    
    logger.info('✅ 分类提取完成', { 
      name, 
      categories,
      extractionMethod: url && extractCategoryFromUrl(url) ? 'url' : 'content'
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        categories,
        extractionMethod: url && extractCategoryFromUrl(url) ? 'url' : 'content'
      })
    };

  } catch (error) {
    logger.error('❌ 分类提取失败', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}; 