import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { logger } from './utils/logger';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

// 需要清理的文本模式
const CLEANUP_PATTERNS = [
  '使用入口地址 Ai网站最新工具和软件app下载',
  '使用入口地址 Ai模型最新工具和软件app下载',
  '- 智能匹配最适合您的AI产品和网站',
  ' - 智能匹配最适合您的AI产品和网站',
  '智能匹配最适合您的AI产品和网站'
];

// 清理产品名称函数
function cleanProductName(name: string): string {
  let cleanedName = name;
  
  // 移除所有匹配的模式
  for (const pattern of CLEANUP_PATTERNS) {
    cleanedName = cleanedName.replace(pattern, '');
  }
  
  // 清理多余的空格和特殊字符
  cleanedName = cleanedName.trim();
  
  return cleanedName;
}

// 智能分类系统
function categorizeProduct(productName: string, description: string = ''): {
  primary_category: string;
  secondary_category: string;
  category_path: string;
} {
  const name = productName.toLowerCase();
  const desc = description.toLowerCase();
  const combined = `${name} ${desc}`;

  // 分类关键词映射
  const categoryMappings = [
    {
      primary: 'AI图片生成',
      secondary: '图像生成器',
      keywords: ['image', 'picture', 'photo', '图片', '图像', '绘画', 'draw', 'paint', 'art', 'midjourney', 'dall-e', 'stable diffusion', 'leonardo', 'firefly']
    },
    {
      primary: '视频AI',
      secondary: '视频生成',
      keywords: ['video', '视频', 'movie', 'film', 'animation', '动画', 'runway', 'pika', 'gen-2', 'luma', 'veo', 'sora']
    },
    {
      primary: 'AI聊天机器人',
      secondary: '对话助手',
      keywords: ['chat', 'gpt', 'bot', '聊天', '对话', 'assistant', '助手', 'claude', 'gemini', 'character', 'chatgpt']
    },
    {
      primary: 'AI写作',
      secondary: '文本生成',
      keywords: ['write', 'writing', '写作', '文案', 'text', 'content', '内容', 'copy', 'jasper', 'grammarly', 'notion']
    },
    {
      primary: '编程助手',
      secondary: '代码生成',
      keywords: ['code', 'coding', '编程', '代码', 'github', 'copilot', 'cursor', 'replit', 'programming', 'developer']
    },
    {
      primary: 'AI搜索',
      secondary: '智能搜索',
      keywords: ['search', '搜索', 'perplexity', 'you.com', 'phind', 'bing', 'google']
    },
    {
      primary: 'AI音乐',
      secondary: '音频生成',
      keywords: ['music', '音乐', 'audio', '音频', 'sound', '声音', 'suno', 'udio', 'mubert']
    },
    {
      primary: 'AI语音',
      secondary: '语音合成',
      keywords: ['voice', '语音', 'speech', 'tts', 'elevenlabs', 'murf', 'speechify']
    },
    {
      primary: '创意设计',
      secondary: '设计工具',
      keywords: ['design', '设计', 'creative', '创意', 'canva', 'figma', 'adobe', 'logo', 'ui', 'ux']
    },
    {
      primary: '办公效率',
      secondary: '生产力工具',
      keywords: ['office', '办公', 'productivity', '效率', 'excel', 'powerpoint', 'document', '文档']
    },
    {
      primary: '自动化',
      secondary: '工作流程',
      keywords: ['automation', '自动化', 'workflow', '工作流', 'zapier', 'make', 'ifttt']
    },
    {
      primary: '数据分析',
      secondary: 'AI分析',
      keywords: ['data', '数据', 'analysis', '分析', 'analytics', 'chart', '图表', 'dashboard']
    },
    {
      primary: 'AI教育',
      secondary: '学习助手',
      keywords: ['education', '教育', 'learning', '学习', 'study', '学习', 'tutor', '导师', 'course']
    },
    {
      primary: '智能代理',
      secondary: 'AI代理',
      keywords: ['agent', '代理', 'ai agent', 'intelligent', '智能', 'autonomous', '自主']
    }
  ];

  // 计算每个分类的匹配分数
  let bestMatch = {
    primary: 'AI工具',
    secondary: '通用工具',
    score: 0
  };

  for (const category of categoryMappings) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (combined.includes(keyword)) {
        score += keyword.length; // 更长的关键词权重更高
      }
    }
    
    if (score > bestMatch.score) {
      bestMatch = {
        primary: category.primary,
        secondary: category.secondary,
        score
      };
    }
  }

  return {
    primary_category: bestMatch.primary,
    secondary_category: bestMatch.secondary,
    category_path: `${bestMatch.primary}/${bestMatch.secondary}`
  };
}

// AIbase产品接口
interface AIBaseProduct {
  name: string;
  description: string;
  official_website: string;
  category?: string;
  primary_category?: string;
  secondary_category?: string;
  aibase_url?: string;
  tags?: string[];
}

// 获取用户所有现有项目名称（用于批量重复检查）
async function getUserExistingProjects(userId: string): Promise<Set<string>> {
  try {
    logger.info('📋 获取用户现有项目列表', { userId });
    
    const { data, error } = await supabase
      .from('user_projects')
      .select('name')
      .eq('user_id', userId);
    
    if (error) {
      logger.warn('获取现有项目列表时出错', { error: error.message });
      return new Set();
    }
    
    const existingNames = new Set<string>();
    if (data) {
      data.forEach(project => {
        if (project.name) {
          existingNames.add(project.name.toLowerCase());
        }
      });
    }
    
    logger.info('✅ 获取现有项目列表完成', { 
      userId, 
      existingCount: existingNames.size 
    });
    
    return existingNames;
  } catch (error) {
    logger.warn('获取现有项目列表时出错', { error: error.message });
    return new Set();
  }
}

// 检查产品是否已存在
function checkProductExistsInSet(name: string, existingProjects: Set<string>): boolean {
  const cleanedName = cleanProductName(name);
  const normalizedName = cleanedName.toLowerCase();
  return existingProjects.has(normalizedName);
}

// 解析产品HTML页面
async function parseProductFromHtml(html: string, url: string): Promise<AIBaseProduct | null> {
  try {
    // 提取产品名称
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let name = titleMatch ? titleMatch[1].trim() : '';
    
    // 清理标题中的网站后缀
    name = name.replace(/\s*-\s*AIbase.*$/i, '').trim();
    
    if (!name) {
      return null;
    }

    // 提取描述
    const descriptionPatterns = [
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      /<p[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]+)<\/p>/i
    ];
    
    let description = '';
    for (const pattern of descriptionPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        description = match[1].trim();
        break;
      }
    }

    // 提取官方网站
    const websitePatterns = [
      /官方网站[^>]*href=["']([^"']+)["']/i,
      /official[^>]*href=["']([^"']+)["']/i,
      /website[^>]*href=["']([^"']+)["']/i,
      /<a[^>]*href=["']([^"']+)["'][^>]*>.*?官方.*?<\/a>/i
    ];
    
    let official_website = '';
    for (const pattern of websitePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].includes('aibase.com')) {
        official_website = match[1].trim();
        break;
      }
    }

    return {
      name,
      description,
      official_website,
      aibase_url: url
    };
  } catch (error) {
    logger.warn('解析产品HTML失败', { 
      url, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

// 无限制获取所有AIbase产品
async function fetchAllAIBaseProducts(): Promise<AIBaseProduct[]> {
  const products: AIBaseProduct[] = [];
  
  try {
    logger.info('🚀 开始无限制AIbase产品采集...');
    
    // 1. 获取主页面
    const mainResponse = await fetch('https://top.aibase.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    if (!mainResponse.ok) {
      throw new Error(`Failed to fetch main page: ${mainResponse.status}`);
    }

    const mainHtml = await mainResponse.text();
    logger.info('📄 获取AIbase主页成功', {
      htmlLength: mainHtml.length
    });

    // 2. 提取所有产品链接
    const productUrlPattern = /\/tool\/([^"'\s]+)/g;
    const productUrls = new Set<string>();
    let match;
    
    while ((match = productUrlPattern.exec(mainHtml)) !== null) {
      const productPath = match[0];
      if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
        productUrls.add(`https://top.aibase.com${productPath}`);
      }
    }

    logger.info('🔍 找到产品链接，开始采集产品详情', {
      totalUrls: productUrls.size,
      willCrawl: productUrls.size // 不限制数量
    });

    // 3. 分批处理所有产品（增大批次大小）
    const urlsToProcess = Array.from(productUrls);
    const batchSize = 15; // 增加批次大小
    
    for (let i = 0; i < urlsToProcess.length; i += batchSize) {
      const batch = urlsToProcess.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          const productResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'Referer': 'https://top.aibase.com/'
            },
            signal: AbortSignal.timeout(2000) // 2秒超时
          });

          if (!productResponse.ok) {
            return null;
          }

          const productHtml = await productResponse.text();
          const product = await parseProductFromHtml(productHtml, url);
          return product;
        } catch (error) {
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const product of batchResults) {
        if (product) {
          products.push(product);
        }
      }

      const currentBatch = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(urlsToProcess.length / batchSize);
      const progress = Math.round(((i + batchSize) / urlsToProcess.length) * 100);
      
      logger.info('📊 批次处理进度', {
        currentBatch,
        totalBatches,
        progress: `${progress}%`,
        successCount: batchResults.filter(p => p !== null).length,
        totalProducts: products.length
      });

      // 短暂延迟避免过载
      if (i + batchSize < urlsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    logger.info('📊 AIbase产品采集完成', {
      totalProducts: products.length
    });

    return products;
  } catch (error) {
    logger.error('❌ AIbase产品采集失败', {
      error: error instanceof Error ? error.message : String(error),
      productsCollected: products.length
    });
    return products;
  }
}

// 保存项目到数据库
async function saveProjectToDatabase(product: AIBaseProduct): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const cleanedName = cleanProductName(product.name);
    const categories = categorizeProduct(cleanedName, product.description);
    
    const projectData = {
      user_id: DEFAULT_USER_ID,
      name: cleanedName,
      description: product.description || null,
      official_website: product.official_website || null,
      primary_category: categories.primary_category,
      secondary_category: categories.secondary_category,
      category_path: categories.category_path,
      metadata: {
        source: 'aibase_crawler_unlimited',
        crawled_at: new Date().toISOString(),
        original_name: product.name,
        aibase_url: product.aibase_url
      }
    };

    const { data, error } = await supabase
      .from('user_projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info('✅ 项目保存成功', { 
      projectName: cleanedName, 
      projectId: data.id
    });
    
    return { success: true, id: data.id };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
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
    logger.info('🚀 开始无限制AIbase项目采集');

    // 步骤1: 获取所有AIbase产品
    const products = await fetchAllAIBaseProducts();

    if (products.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: '未找到任何产品',
          summary: { totalFound: 0, successfullySaved: 0 }
        })
      };
    }

    // 步骤2: 过滤重复产品
    const existingProjects = await getUserExistingProjects(DEFAULT_USER_ID);
    const newProducts = products.filter(product => 
      !checkProductExistsInSet(product.name, existingProjects)
    );

    logger.info('📋 开始保存项目到数据库', {
      totalFound: products.length,
      newProducts: newProducts.length,
      duplicates: products.length - newProducts.length
    });

    // 步骤3: 批量保存到数据库
    const savedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];

    // 分批保存，避免数据库压力
    const saveBatchSize = 5;
    for (let i = 0; i < newProducts.length; i += saveBatchSize) {
      const batch = newProducts.slice(i, i + saveBatchSize);
      
      for (const product of batch) {
        try {
          const result = await saveProjectToDatabase(product);
          if (result.success && result.id) {
            savedProjects.push({ id: result.id, product });
          } else {
            errors.push({
              project: product.name,
              error: result.error || 'Unknown error'
            });
          }
        } catch (error) {
          errors.push({
            project: product.name,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 批次间短暂延迟
      if (i + saveBatchSize < newProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('🎉 无限制AIbase项目采集完成', {
      totalFound: products.length,
      newProducts: newProducts.length,
      successfullySaved: savedProjects.length,
      errors: errors.length
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        summary: {
          totalFound: products.length,
          newProducts: newProducts.length,
          duplicates: products.length - newProducts.length,
          successfullySaved: savedProjects.length,
          errors: errors.length
        },
        savedProjects: savedProjects.slice(0, 10).map(p => ({
          id: p.id,
          name: cleanProductName(p.product.name),
          description: p.product.description?.substring(0, 100) + '...'
        })),
        errors: errors.slice(0, 5)
      })
    };

  } catch (error) {
    logger.error('❌ 无限制AIbase项目采集失败', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 