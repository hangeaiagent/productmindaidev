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
  
  for (const pattern of CLEANUP_PATTERNS) {
    cleanedName = cleanedName.replace(pattern, '');
  }
  
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

  let bestMatch = {
    primary: 'AI工具',
    secondary: '通用工具',
    score: 0
  };

  for (const category of categoryMappings) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (combined.includes(keyword)) {
        score += keyword.length;
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

interface AIBaseProduct {
  name: string;
  description: string;
  official_website: string;
  aibase_url?: string;
}

// 获取所有产品链接（快速操作）
async function getAllProductUrls(): Promise<string[]> {
  try {
    logger.info('🔍 获取所有AIbase产品链接...');
    
    const response = await fetch('https://top.aibase.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch main page: ${response.status}`);
    }

    const html = await response.text();
    
    // 提取所有产品链接
    const productUrlPattern = /\/tool\/([^"'\s]+)/g;
    const productUrls = new Set<string>();
    let match;
    
    while ((match = productUrlPattern.exec(html)) !== null) {
      const productPath = match[0];
      if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
        productUrls.add(`https://top.aibase.com${productPath}`);
      }
    }

    const urls = Array.from(productUrls);
    logger.info('✅ 获取产品链接完成', {
      totalUrls: urls.length
    });

    return urls;
  } catch (error) {
    logger.error('❌ 获取产品链接失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
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
    return null;
  }
}

// 批量处理产品详情
async function processBatchProducts(urls: string[], startIndex: number, batchSize: number): Promise<AIBaseProduct[]> {
  const products: AIBaseProduct[] = [];
  const endIndex = Math.min(startIndex + batchSize, urls.length);
  const batchUrls = urls.slice(startIndex, endIndex);
  
  logger.info('📊 开始处理批次', {
    startIndex,
    endIndex,
    batchSize: batchUrls.length,
    totalUrls: urls.length
  });

  // 并发处理批次中的产品
  const concurrentSize = 8; // 并发数量
  for (let i = 0; i < batchUrls.length; i += concurrentSize) {
    const concurrentBatch = batchUrls.slice(i, i + concurrentSize);
    
    const promises = concurrentBatch.map(async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://top.aibase.com/'
          },
          signal: AbortSignal.timeout(2000)
        });

        if (!response.ok) {
          return null;
        }

        const html = await response.text();
        return await parseProductFromHtml(html, url);
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    
    for (const product of results) {
      if (product) {
        products.push(product);
      }
    }

    // 短暂延迟
    if (i + concurrentSize < batchUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info('✅ 批次处理完成', {
    startIndex,
    endIndex,
    successCount: products.length,
    totalProcessed: batchUrls.length
  });

  return products;
}

// 检查产品是否已存在
async function checkProductExists(name: string): Promise<boolean> {
  try {
    const cleanedName = cleanProductName(name);
    
    const { data, error } = await supabase
      .from('user_projects')
      .select('id')
      .eq('user_id', DEFAULT_USER_ID)
      .ilike('name', cleanedName)
      .limit(1);

    if (error) {
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    return false;
  }
}

// 保存项目到数据库
async function saveProjectToDatabase(product: AIBaseProduct): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const cleanedName = cleanProductName(product.name);
    
    // 检查是否已存在
    const exists = await checkProductExists(cleanedName);
    if (exists) {
      return { success: false, error: 'Product already exists' };
    }
    
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
        source: 'aibase_crawler_batch',
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
    // 解析请求参数
    const body = event.body ? JSON.parse(event.body) : {};
    const startIndex = body.startIndex || 0;
    const batchSize = body.batchSize || 30; // 每批处理30个产品
    const mode = body.mode || 'process'; // 'urls' 或 'process'

    logger.info('🚀 开始分批AIbase项目采集', {
      startIndex,
      batchSize,
      mode
    });

    if (mode === 'urls') {
      // 模式1: 只获取所有产品链接
      const urls = await getAllProductUrls();
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          mode: 'urls',
          totalUrls: urls.length,
          urls: urls,
          nextBatch: {
            startIndex: 0,
            batchSize: 30,
            mode: 'process'
          }
        })
      };
    }

    // 模式2: 处理指定批次的产品
    const urls = body.urls || [];
    
    if (!urls || urls.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'No URLs provided for processing'
        })
      };
    }

    // 处理当前批次
    const products = await processBatchProducts(urls, startIndex, batchSize);
    
    // 保存产品到数据库
    const savedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];

    for (const product of products) {
      try {
        const result = await saveProjectToDatabase(product);
        if (result.success && result.id) {
          savedProjects.push({ id: result.id, product });
        } else if (result.error !== 'Product already exists') {
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

    const nextStartIndex = startIndex + batchSize;
    const hasMore = nextStartIndex < urls.length;

    logger.info('🎉 分批AIbase项目采集完成', {
      currentBatch: Math.floor(startIndex / batchSize) + 1,
      totalBatches: Math.ceil(urls.length / batchSize),
      processed: products.length,
      saved: savedProjects.length,
      errors: errors.length,
      hasMore
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        mode: 'process',
        batch: {
          startIndex,
          endIndex: Math.min(startIndex + batchSize, urls.length),
          processed: products.length,
          saved: savedProjects.length,
          errors: errors.length
        },
        progress: {
          currentBatch: Math.floor(startIndex / batchSize) + 1,
          totalBatches: Math.ceil(urls.length / batchSize),
          percentage: Math.round(((startIndex + batchSize) / urls.length) * 100)
        },
        hasMore,
        nextBatch: hasMore ? {
          startIndex: nextStartIndex,
          batchSize,
          mode: 'process',
          urls
        } : null,
        savedProjects: savedProjects.slice(0, 5).map(p => ({
          id: p.id,
          name: cleanProductName(p.product.name),
          description: p.product.description?.substring(0, 100) + '...'
        })),
        errors: errors.slice(0, 3)
      })
    };

  } catch (error) {
    logger.error('❌ 分批AIbase项目采集失败', {
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