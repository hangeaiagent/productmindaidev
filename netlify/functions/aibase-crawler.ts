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

// 提取产品分类
async function extractProductCategories(name: string, description: string, url: string): Promise<{
  primary_category: string;
  secondary_category: string;
  category_path: string;
}> {
  try {
    // 调用分类提取函数
    const response = await fetch('/.netlify/functions/extract-product-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        url
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.categories) {
        return {
          primary_category: result.categories.primary,
          secondary_category: result.categories.secondary,
          category_path: result.categories.category_path
        };
      }
    }
  } catch (error) {
    logger.warn('分类提取失败，使用默认分类', { error: error.message });
  }
  
  // 默认分类
  return {
    primary_category: 'AI平台服务',
    secondary_category: 'AI工具平台',
    category_path: 'AI平台服务/AI工具平台'
  };
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
          // 将名称转换为小写进行比较（忽略大小写）
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

// 检查产品是否已存在（使用预加载的项目列表）
function checkProductExistsInSet(name: string, existingProjects: Set<string>): boolean {
  const cleanedName = cleanProductName(name);
  const normalizedName = cleanedName.toLowerCase();
  return existingProjects.has(normalizedName);
}

// 过滤重复产品（在导入过程开始时进行批量过滤）
async function filterDuplicateProducts(products: AIBaseProduct[], userId: string): Promise<{
  newProducts: AIBaseProduct[];
  duplicateProducts: AIBaseProduct[];
  existingProjects: Set<string>;
}> {
  logger.info('🔍 开始重复产品过滤', { 
    totalProducts: products.length,
    userId 
  });
  
  // 获取用户所有现有项目
  const existingProjects = await getUserExistingProjects(userId);
  
  const newProducts: AIBaseProduct[] = [];
  const duplicateProducts: AIBaseProduct[] = [];
  
  for (const product of products) {
    const isDuplicate = checkProductExistsInSet(product.name, existingProjects);
    
    if (isDuplicate) {
      duplicateProducts.push(product);
      logger.info('⏭️ 发现重复产品，跳过', { 
        productName: cleanProductName(product.name),
        originalName: product.name
      });
    } else {
      newProducts.push(product);
      // 将新产品名称添加到现有项目集合中，避免同批次内的重复
      const cleanedName = cleanProductName(product.name);
      existingProjects.add(cleanedName.toLowerCase());
    }
  }
  
  logger.info('✅ 重复产品过滤完成', {
    totalProducts: products.length,
    newProducts: newProducts.length,
    duplicateProducts: duplicateProducts.length,
    userId
  });
  
  return {
    newProducts,
    duplicateProducts,
    existingProjects
  };
}

// AIbase分类结构
interface AIBaseCategory {
  name: string;
  url: string;
  subcategories?: AIBaseCategory[];
}

// 增强的AIbase产品接口
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

// 获取AIbase分类列表
async function fetchAIBaseCategories(): Promise<AIBaseCategory[]> {
  const categories: AIBaseCategory[] = [];
  
  try {
    logger.info('🔍 开始获取AIbase分类列表...');
    
    const response = await fetch('https://top.aibase.com/discover', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AIbase discover page: ${response.status}`);
    }

    const html = await response.text();
    logger.info('📄 获取AIbase发现页面成功', {
      htmlLength: html.length
    });

    // 预定义的主要分类（基于AIbase实际分类）
    const predefinedCategories: AIBaseCategory[] = [
      {
        name: '视频AI',
        url: 'https://top.aibase.com/category/video-ai',
        subcategories: [
          { name: 'AI视频生成', url: 'https://top.aibase.com/tag/video-generation' },
          { name: 'AI视频编辑', url: 'https://top.aibase.com/tag/video-editing' },
          { name: 'AI动画制作', url: 'https://top.aibase.com/tag/animation' }
        ]
      },
      {
        name: 'AI图片生成器',
        url: 'https://top.aibase.com/category/image-ai',
        subcategories: [
          { name: 'AI绘画', url: 'https://top.aibase.com/tag/ai-painting' },
          { name: 'AI头像生成', url: 'https://top.aibase.com/tag/avatar-generation' },
          { name: 'AI图片编辑', url: 'https://top.aibase.com/tag/image-editing' }
        ]
      },
      {
        name: '创意设计',
        url: 'https://top.aibase.com/category/design',
        subcategories: [
          { name: 'Logo设计', url: 'https://top.aibase.com/tag/logo-design' },
          { name: 'UI设计', url: 'https://top.aibase.com/tag/ui-design' },
          { name: '平面设计', url: 'https://top.aibase.com/tag/graphic-design' }
        ]
      },
      {
        name: '自动化',
        url: 'https://top.aibase.com/category/automation',
        subcategories: [
          { name: '工作流自动化', url: 'https://top.aibase.com/tag/workflow' },
          { name: 'RPA机器人', url: 'https://top.aibase.com/tag/rpa' },
          { name: '智能助手', url: 'https://top.aibase.com/tag/assistant' }
        ]
      },
      {
        name: '智能代理',
        url: 'https://top.aibase.com/category/ai-agent',
        subcategories: [
          { name: 'AI客服', url: 'https://top.aibase.com/tag/customer-service' },
          { name: 'AI销售助手', url: 'https://top.aibase.com/tag/sales-assistant' },
          { name: 'AI分析师', url: 'https://top.aibase.com/tag/analyst' }
        ]
      },
      {
        name: '人工智能',
        url: 'https://top.aibase.com/category/artificial-intelligence',
        subcategories: [
          { name: '机器学习', url: 'https://top.aibase.com/tag/machine-learning' },
          { name: '深度学习', url: 'https://top.aibase.com/tag/deep-learning' },
          { name: '自然语言处理', url: 'https://top.aibase.com/tag/nlp' }
        ]
      },
      {
        name: '面部识别',
        url: 'https://top.aibase.com/category/face-recognition',
        subcategories: [
          { name: '人脸检测', url: 'https://top.aibase.com/tag/face-detection' },
          { name: '表情识别', url: 'https://top.aibase.com/tag/emotion-recognition' },
          { name: '年龄识别', url: 'https://top.aibase.com/tag/age-recognition' }
        ]
      },
      {
        name: 'AI心理健康',
        url: 'https://top.aibase.com/category/mental-health',
        subcategories: [
          { name: '心理咨询', url: 'https://top.aibase.com/tag/counseling' },
          { name: '情绪分析', url: 'https://top.aibase.com/tag/emotion-analysis' },
          { name: '压力管理', url: 'https://top.aibase.com/tag/stress-management' }
        ]
      },
      {
        name: '认知行为疗法',
        url: 'https://top.aibase.com/category/cbt',
        subcategories: [
          { name: 'CBT工具', url: 'https://top.aibase.com/tag/cbt-tools' },
          { name: '心理治疗', url: 'https://top.aibase.com/tag/therapy' },
          { name: '行为改变', url: 'https://top.aibase.com/tag/behavior-change' }
        ]
      },
      {
        name: '社交媒体',
        url: 'https://top.aibase.com/category/social-media',
        subcategories: [
          { name: '内容创作', url: 'https://top.aibase.com/tag/content-creation' },
          { name: '社交管理', url: 'https://top.aibase.com/tag/social-management' },
          { name: '营销自动化', url: 'https://top.aibase.com/tag/marketing-automation' }
        ]
      }
    ];

    logger.info('🔧 使用预定义分类列表');
    categories.push(...predefinedCategories);

    return categories;
  } catch (error) {
    logger.error('❌ 获取AIbase分类失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    // 返回基础分类作为备选
    return [
      {
        name: '视频AI',
        url: 'https://top.aibase.com/category/video-ai'
      },
      {
        name: 'AI图片生成器',
        url: 'https://top.aibase.com/category/image-ai'
      },
      {
        name: '创意设计',
        url: 'https://top.aibase.com/category/design'
      }
    ];
  }
}

// 从发现页面获取产品（真正的动态采集）
async function fetchProductsFromDiscoverPage(): Promise<AIBaseProduct[]> {
  const products: AIBaseProduct[] = [];
  
  try {
    logger.info('🔍 开始动态采集AIbase产品...');
    
    // 1. 首先获取主页面，分析结构
    const mainResponse = await fetch('https://top.aibase.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!mainResponse.ok) {
      throw new Error(`Failed to fetch main page: ${mainResponse.status}`);
    }

    const mainHtml = await mainResponse.text();
    logger.info('📄 获取AIbase主页成功', {
      htmlLength: mainHtml.length
    });

    // 2. 解析主页中的产品链接
    const productUrlPattern = /\/tool\/([^"'\s]+)/g;
    const productUrls = new Set<string>();
    let match;
    
    while ((match = productUrlPattern.exec(mainHtml)) !== null) {
      const productPath = match[0];
      if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
        productUrls.add(`https://top.aibase.com${productPath}`);
      }
    }

    logger.info('🔗 从主页发现产品链接', {
      uniqueUrls: productUrls.size
    });

    // 3. 尝试获取更多页面的产品
    const additionalPages = [
      'https://top.aibase.com/discover',
      'https://top.aibase.com/tools',
      'https://top.aibase.com/category/ai-image-generator',
      'https://top.aibase.com/category/video-ai',
      'https://top.aibase.com/category/ai-writing',
      'https://top.aibase.com/category/ai-chatbot',
      'https://top.aibase.com/category/ai-assistant',
      'https://top.aibase.com/category/automation',
      'https://top.aibase.com/category/creative-design',
      'https://top.aibase.com/category/face-recognition',
      'https://top.aibase.com/category/ai-mental-health',
      'https://top.aibase.com/category/social-media'
    ];

    for (const pageUrl of additionalPages) {
      try {
        logger.info('🔍 采集分类页面', { pageUrl });
        
        const pageResponse = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://top.aibase.com/'
          }
        });

        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text();
          
          // 解析这个页面的产品链接
          let pageMatch;
          const pageProductPattern = /\/tool\/([^"'\s]+)/g;
          
          while ((pageMatch = pageProductPattern.exec(pageHtml)) !== null) {
            const productPath = pageMatch[0];
            if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
              productUrls.add(`https://top.aibase.com${productPath}`);
            }
          }

          // 也尝试查找API调用或JSON数据
          const jsonDataPattern = /"tools":\s*\[(.*?)\]/g;
          const jsonMatch = jsonDataPattern.exec(pageHtml);
          if (jsonMatch) {
            try {
              const toolsData = JSON.parse(`[${jsonMatch[1]}]`);
              for (const tool of toolsData) {
                if (tool.slug) {
                  productUrls.add(`https://top.aibase.com/tool/${tool.slug}`);
                }
              }
            } catch (e) {
              // JSON解析失败，继续其他方法
            }
          }

          logger.info('📊 分类页面采集结果', {
            pageUrl,
            htmlLength: pageHtml.length,
            totalUrls: productUrls.size
          });
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        logger.warn('⚠️ 分类页面采集失败', {
          pageUrl,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('🎯 总共发现产品链接', {
      totalUrls: productUrls.size
    });

    // 4. 移除数量限制，处理所有发现的产品链接
    const urlsToProcess = Array.from(productUrls); // 移除 .slice(0, 50) 限制
    
    logger.info('🚀 开始采集产品详情', {
      totalDiscovered: productUrls.size,
      willProcess: urlsToProcess.length,
      processingStrategy: 'unlimited_batch_processing'
    });

    // 5. 优化并发采集产品详情（增加批处理大小和并发度）
    const batchSize = 10; // 增加批次大小到10个
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
            signal: AbortSignal.timeout(3000) // 减少超时时间到3秒
          });

          if (!productResponse.ok) {
            return null;
          }

          const productHtml = await productResponse.text();
          
          // 解析产品信息
          const product = await parseProductFromHtml(productHtml, url);
          return product;
        } catch (error) {
          logger.warn('⚠️ 产品详情获取失败', {
            url,
            error: error instanceof Error ? error.message : String(error)
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const product of batchResults) {
        if (product) {
          products.push(product);
        }
      }

      logger.info('📊 批次处理完成', {
        batchIndex: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(urlsToProcess.length / batchSize),
        batchSize: batch.length,
        successCount: batchResults.filter(p => p !== null).length,
        totalProducts: products.length,
        remainingBatches: Math.ceil((urlsToProcess.length - i - batchSize) / batchSize),
        progressPercentage: Math.round(((i + batchSize) / urlsToProcess.length) * 100)
      });

      // 减少批次间延迟
      if (i + batchSize < urlsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('✅ 动态采集完成', {
      totalDiscovered: productUrls.size,
      totalProcessed: urlsToProcess.length,
      successfullyParsed: products.length,
      successRate: `${Math.round((products.length / urlsToProcess.length) * 100)}%`
    });

    return products;
  } catch (error) {
    logger.error('❌ 动态采集失败', {
      error: error instanceof Error ? error.message : String(error),
      productsCollectedSoFar: products.length
    });
    
    // 即使出错也返回已采集的产品
    return products;
  }
}

// 新增：从HTML解析产品信息的函数
async function parseProductFromHtml(html: string, url: string): Promise<AIBaseProduct | null> {
  try {
    // 提取产品名称
    let name = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
    if (titleMatch) {
      name = titleMatch[1].replace(/\s*-\s*AIbase.*$/i, '').trim();
    }

    // 如果标题提取失败，尝试其他方法
    if (!name) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)</i);
      if (h1Match) {
        name = h1Match[1].trim();
      }
    }

    // 提取描述
    let description = '';
    const descriptionPatterns = [
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      /<p[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]+)</i,
      /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]+)</i
    ];

    for (const pattern of descriptionPatterns) {
      const match = html.match(pattern);
      if (match) {
        description = match[1].trim();
        break;
      }
    }

    // 提取官方网站
    let officialWebsite = '';
    const websitePatterns = [
      /官方网站[^:：]*[:：]\s*<[^>]*href=["']([^"']+)["']/i,
      /official[^:：]*[:：]\s*<[^>]*href=["']([^"']+)["']/i,
      /website[^:：]*[:：]\s*<[^>]*href=["']([^"']+)["']/i,
      /<a[^>]*href=["']([^"']+)["'][^>]*>.*?官方.*?</i,
      /<a[^>]*href=["']([^"']+)["'][^>]*>.*?official.*?</i
    ];

    for (const pattern of websitePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].includes('aibase.com')) {
        officialWebsite = match[1];
        break;
      }
    }

    // 智能分类识别
    const categories = await extractProductCategories(name, description, url);

    if (!name) {
      return null;
    }

    return {
      name: cleanProductName(name),
      description: description || `${name} - AI工具`,
      official_website: officialWebsite || '',
      category: `${categories.primary_category}/${categories.secondary_category}`,
      primary_category: categories.primary_category,
      secondary_category: categories.secondary_category,
      aibase_url: url,
      tags: [categories.primary_category, categories.secondary_category]
    };
  } catch (error) {
    logger.warn('⚠️ HTML解析失败', {
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

// 主要的产品获取函数
async function fetchAIBaseProducts(): Promise<AIBaseProduct[]> {
  try {
    logger.info('🚀 开始全面采集AIbase产品...');
    
    // 1. 获取所有分类
    const categories = await fetchAIBaseCategories();
    logger.info('📋 获取到分类列表', {
      categoryCount: categories.length,
      categories: categories.map(c => c.name)
    });

    // 2. 从发现页面获取产品（基于实际网站内容）
    const allProducts = await fetchProductsFromDiscoverPage();

    // 3. 去重处理
    const uniqueProducts = new Map<string, AIBaseProduct>();
    for (const product of allProducts) {
      const key = product.name.toLowerCase().trim();
      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, product);
      }
    }

    const finalProducts = Array.from(uniqueProducts.values());
    
    logger.info('🎉 AIbase产品采集完成', {
      totalCategories: categories.length,
      totalProducts: allProducts.length,
      uniqueProducts: finalProducts.length,
      categoriesBreakdown: categories.reduce((acc, cat) => {
        const categoryProducts = finalProducts.filter(p => p.primary_category === cat.name);
        acc[cat.name] = categoryProducts.length;
        return acc;
      }, {} as Record<string, number>),
      sampleProducts: finalProducts.slice(0, 5).map(p => ({
        name: p.name,
        primary_category: p.primary_category,
        secondary_category: p.secondary_category,
        category_path: `${p.primary_category}/${p.secondary_category}`
      }))
    });

    return finalProducts;
  } catch (error) {
    logger.error('❌ AIbase产品采集失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    // 返回空数组而不是预定义产品，确保不会重复保存
    return [];
  }
}

// 修改保存项目到数据库的函数
async function saveProjectToDatabase(project: any): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // 清理产品名称
    const cleanedName = cleanProductName(project.name);
    
    // 提取产品分类
    const categories = await extractProductCategories(
      cleanedName,
      project.description || '',
      project.official_website || ''
    );
    
    logger.info('📊 准备保存项目', { 
      originalName: project.name,
      cleanedName,
      categories
    });

    const projectData = {
      user_id: DEFAULT_USER_ID,
      name: cleanedName,
      description: project.description || null,
      official_website: project.official_website || null,
      primary_category: categories.primary_category,
      secondary_category: categories.secondary_category,
      category_path: categories.category_path,
      metadata: {
        source: 'aibase_crawler',
        crawled_at: new Date().toISOString(),
        original_name: project.name,
        cleaned_patterns: CLEANUP_PATTERNS.filter(pattern => 
          project.name.includes(pattern)
        )
      }
    };

    const { data, error } = await supabase
      .from('user_projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      logger.error('❌ 项目保存失败', { 
        projectName: cleanedName, 
        error: error.message 
      });
      return { success: false, error: error.message };
    }

    logger.info('✅ 项目保存成功', { 
      projectName: cleanedName, 
      projectId: data.id,
      categories
    });
    
    return { success: true, id: data.id };

  } catch (error) {
    logger.error('❌ 项目保存异常', { 
      projectName: project.name, 
      error: error.message 
    });
    return { success: false, error: error.message };
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
    logger.info('🚀 开始AIbase项目采集', {
      timestamp: new Date().toISOString(),
      targetUrl: 'https://top.aibase.com/'
    });

    // 步骤1: 获取AIbase产品列表
    const products = await fetchAIBaseProducts();

    if (products.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: '未找到任何产品',
          summary: {
            totalFound: 0,
            totalCrawled: 0,
            successfullySaved: 0,
            errors: 0
          }
        })
      };
    }

    // 步骤2: 过滤重复产品
    const { newProducts, duplicateProducts, existingProjects } = await filterDuplicateProducts(products, DEFAULT_USER_ID);

    // 步骤3: 保存到数据库
    const savedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];

    logger.info('📋 开始保存项目到数据库', {
      projectCount: newProducts.length
    });

    for (const product of newProducts) {
      try {
        const { success, id, error } = await saveProjectToDatabase(product);
        if (success && id) {
          savedProjects.push({ id, product });
        } else {
          errors.push({
            project: product.name,
            error: error || 'Unknown error'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          project: product.name,
          error: errorMessage
        });
        logger.error('❌ 项目保存失败', {
          projectName: product.name,
          error: errorMessage
        });
      }
    }

    logger.info('🎉 AIbase项目采集完成', {
      totalFound: products.length,
      totalCrawled: products.length,
      newProducts: newProducts.length,
      duplicateProducts: duplicateProducts.length,
      successfullySaved: savedProjects.length,
      errors: errors.length
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
        summary: {
          totalFound: products.length,
          totalCrawled: products.length,
          newProducts: newProducts.length,
          duplicateProducts: duplicateProducts.length,
          successfullySaved: savedProjects.length,
          errors: errors.length
        },
        savedProjects: savedProjects.map(p => ({
          id: p.id,
          name: p.product.name,
          description: p.product.description?.substring(0, 100) + '...',
          official_website: p.product.official_website,
          primary_category: p.product.primary_category,
          secondary_category: p.product.secondary_category,
          category_path: p.product.category_path
        })),
        duplicateProducts: duplicateProducts.map(p => ({
          name: cleanProductName(p.name),
          originalName: p.name,
          description: p.description?.substring(0, 100) + '...'
        })),
        errors
      })
    };

  } catch (error) {
    logger.error('❌ AIbase项目采集失败', {
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