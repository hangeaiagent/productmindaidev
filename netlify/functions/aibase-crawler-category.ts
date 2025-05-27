import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 默认用户ID
const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

// 简化的日志记录器
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [info] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [warn] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [error] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// 分类产品接口
interface CategoryProduct {
  name: string;
  url: string;
  category: string;
  description?: string;
  tags?: string[];
}

// 增强的分类关键词映射
const CATEGORY_KEYWORDS = {
  'AI图片生成器': [
    'image', 'picture', 'photo', 'art', 'draw', 'paint', 'generate', 'create',
    '图片', '绘画', '画', '图像', '生成', '创作', 'midjourney', 'dalle', 'stable',
    'diffusion', 'flux', 'firefly', 'leonardo', 'runway', 'canva'
  ],
  '视频AI': [
    'video', 'movie', 'film', 'clip', 'motion', 'animation', 'edit',
    '视频', '影片', '电影', '动画', '剪辑', 'sora', 'runway', 'pika', 'veo',
    'luma', 'kling', 'gen', 'synthesia', 'heygen'
  ],
  'AI写作': [
    'write', 'text', 'content', 'article', 'blog', 'copy', 'essay', 'paper',
    '写作', '文案', '文章', '内容', '论文', '博客', 'jasper', 'copy.ai',
    'writesonic', 'grammarly', 'notion', 'longwriter'
  ],
  'AI聊天机器人': [
    'chat', 'bot', 'conversation', 'talk', 'dialogue', 'assistant',
    '聊天', '对话', '机器人', '助手', 'chatgpt', 'claude', 'gemini',
    'character', 'replika', 'pi', 'perplexity'
  ],
  '创意设计': [
    'design', 'creative', 'ui', 'ux', 'layout', 'template', 'logo', 'brand',
    '设计', '创意', '界面', '模板', '标志', '品牌', 'figma', 'canva',
    'adobe', 'sketch', 'framer'
  ],
  '自动化': [
    'auto', 'workflow', 'process', 'automation', 'rpa', 'zapier', 'flow',
    '自动', '流程', '自动化', '工作流', 'make', 'ifttt', 'microsoft',
    'power', 'automate'
  ],
  '智能代理': [
    'agent', 'ai', 'smart', 'intelligent', 'virtual', 'digital',
    '智能', '代理', '助手', '虚拟', '数字', 'gpt', 'claude', 'assistant',
    'copilot', 'playground'
  ],
  '面部识别': [
    'face', 'facial', 'recognition', 'detect', 'identify', 'biometric',
    '面部', '人脸', '识别', '检测', '生物识别', 'faceage', 'deepface',
    'face++', 'amazon', 'rekognition'
  ],
  'AI音乐': [
    'music', 'audio', 'sound', 'song', 'melody', 'compose', 'generate',
    '音乐', '音频', '声音', '歌曲', '旋律', '作曲', 'suno', 'udio',
    'mubert', 'amper', 'aiva'
  ],
  'AI语音': [
    'voice', 'speech', 'speak', 'tts', 'synthesis', 'clone', 'convert',
    '语音', '说话', '合成', '克隆', '转换', 'elevenlabs', 'murf',
    'speechify', 'descript', 'resemble'
  ],
  '编程助手': [
    'code', 'programming', 'dev', 'developer', 'coding', 'github', 'git',
    '编程', '代码', '开发', '程序', 'copilot', 'cursor', 'replit',
    'tabnine', 'codeium', 'sourcegraph'
  ],
  '办公效率': [
    'office', 'productivity', 'work', 'excel', 'document', 'pdf', 'note',
    '办公', '效率', '工作', '文档', '笔记', 'notion', 'obsidian',
    'roam', 'logseq', 'craft'
  ],
  'AI搜索': [
    'search', 'find', 'query', 'discover', 'explore', 'browse',
    '搜索', '查找', '检索', '发现', '浏览', 'perplexity', 'you.com',
    'phind', 'bing', 'bard'
  ],
  'AI翻译': [
    'translate', 'translation', 'language', 'multilingual', 'interpret',
    '翻译', '语言', '多语言', '口译', 'deepl', 'google', 'translate',
    'microsoft', 'translator'
  ],
  'AI客服': [
    'customer', 'service', 'support', 'help', 'ticket', 'chat',
    '客服', '服务', '支持', '帮助', '工单', 'zendesk', 'intercom',
    'drift', 'crisp', 'eloquent'
  ],
  'AI营销': [
    'marketing', 'promotion', 'ads', 'advertising', 'campaign', 'social',
    '营销', '推广', '广告', '宣传', '活动', '社交', 'hubspot', 'mailchimp',
    'hootsuite', 'buffer'
  ],
  '数据分析': [
    'data', 'analytics', 'analysis', 'insight', 'dashboard', 'report',
    '数据', '分析', '洞察', '仪表板', '报告', 'tableau', 'powerbi',
    'looker', 'mixpanel', 'amplitude'
  ],
  'AI教育': [
    'education', 'learning', 'teach', 'tutor', 'course', 'training',
    '教育', '学习', '教学', '辅导', '课程', '培训', 'coursera', 'udemy',
    'khan', 'duolingo', 'quizlet'
  ]
};

// 从主页获取所有工具链接
async function fetchAllToolsFromHomepage(): Promise<CategoryProduct[]> {
  const products: CategoryProduct[] = [];
  
  try {
    logger.info('🔍 开始从AIbase主页获取所有工具');

    const response = await fetch('https://top.aibase.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://top.aibase.com/'
      }
    });

    if (!response.ok) {
      logger.warn('⚠️ 主页获取失败', { status: response.status });
      return products;
    }

    const html = await response.text();
    
    // 使用多种模式提取工具链接
    const toolPatterns = [
      // href属性中的工具链接
      /href="([^"]*\/tool\/[^"]*)"[^>]*>/g,
      // 更宽松的工具路径匹配
      /["']([^"']*\/tool\/[^"']*?)["']/g
    ];

    const foundUrls = new Set<string>();
    const foundSlugs = new Set<string>();
    
    // 使用多个模式提取
    toolPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const toolPath = match[1];
        if (toolPath && toolPath.includes('/tool/')) {
          // 提取slug
          const slugMatch = toolPath.match(/\/tool\/([^"'\s<>\/]+)/);
          if (slugMatch && slugMatch[1]) {
            const slug = slugMatch[1];
            const fullUrl = `https://top.aibase.com/tool/${slug}`;
            
            if (!foundUrls.has(fullUrl) && !slug.includes('undefined') && !slug.includes('null')) {
              foundUrls.add(fullUrl);
              foundSlugs.add(slug);
              
              // 从slug生成产品名称
              const productName = slug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .replace(/\s+/g, ' ')
                .trim();
              
              // 基于关键词分类
              const category = categorizeProduct(productName, slug);
              
              products.push({
                name: productName,
                url: fullUrl,
                category: category,
                description: `${productName} - ${category}工具`,
                tags: CATEGORY_KEYWORDS[category] || []
              });
            }
          }
        }
      }
    });

    logger.info('✅ 主页工具采集完成', {
      totalUrls: foundUrls.size,
      totalSlugs: foundSlugs.size,
      totalProducts: products.length,
      categoryBreakdown: getCategoryBreakdown(products),
      sampleSlugs: Array.from(foundSlugs).slice(0, 10)
    });

    return products;
  } catch (error) {
    logger.error('❌ 主页工具采集失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    return products;
  }
}

// 增强的产品分类函数
function categorizeProduct(productName: string, slug: string): string {
  const searchText = `${productName} ${slug}`.toLowerCase();
  
  // 计算每个分类的匹配分数
  const categoryScores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        // 根据关键词重要性给不同权重
        if (keyword.length > 6) {
          score += 3; // 长关键词权重更高
        } else if (keyword.length > 3) {
          score += 2; // 中等关键词
        } else {
          score += 1; // 短关键词
        }
      }
    }
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // 找到得分最高的分类
  if (Object.keys(categoryScores).length > 0) {
    const bestCategory = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)[0][0];
    return bestCategory;
  }
  
  // 默认分类
  return 'AI工具';
}

// 获取分类统计
function getCategoryBreakdown(products: CategoryProduct[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const product of products) {
    breakdown[product.category] = (breakdown[product.category] || 0) + 1;
  }
  return breakdown;
}

// 获取用户现有项目
async function getUserExistingProjects(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('user_projects')
      .select('name')
      .eq('user_id', userId);

    if (error) {
      logger.error('❌ 获取现有项目失败', { error: error.message });
      return new Set();
    }

    const existingNames = new Set(data.map(project => project.name.toLowerCase().trim()));
    logger.info('📋 获取现有项目', { count: existingNames.size });
    
    return existingNames;
  } catch (error) {
    logger.error('❌ 获取现有项目异常', { error: error.message });
    return new Set();
  }
}

// 保存分类产品
async function saveCategoryProduct(product: CategoryProduct): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const projectData = {
      user_id: DEFAULT_USER_ID,
      name: product.name,
      description: product.description || `${product.name} - AI工具`,
      official_website: product.url,
      primary_category: product.category,
      secondary_category: 'AI应用',
      category_path: `${product.category}/AI应用`,
      metadata: {
        source: 'aibase_homepage_crawler',
        crawled_at: new Date().toISOString(),
        aibase_url: product.url,
        category: product.category,
        extraction_method: 'homepage_tool_links_enhanced',
        tags: product.tags || [],
        category_confidence: 'high'
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

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
    logger.info('🎯 开始AIbase主页工具采集（增强版，无数量限制）');

    // 1. 从主页采集所有工具
    const products = await fetchAllToolsFromHomepage();

    if (products.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: '未找到任何工具',
          summary: {
            totalFound: 0,
            newProducts: 0,
            duplicateProducts: 0,
            successfullySaved: 0
          }
        })
      };
    }

    // 2. 获取现有项目
    const existingProjects = await getUserExistingProjects(DEFAULT_USER_ID);

    // 3. 过滤重复产品
    const newProducts = products.filter(product => {
      const cleanedName = product.name.toLowerCase().trim();
      return !existingProjects.has(cleanedName);
    });

    const duplicateProducts = products.filter(product => {
      const cleanedName = product.name.toLowerCase().trim();
      return existingProjects.has(cleanedName);
    });

    logger.info('📊 重复检查完成', {
      totalProducts: products.length,
      newProducts: newProducts.length,
      duplicateProducts: duplicateProducts.length
    });

    // 4. 优化保存数量和批次处理（避免超时）
    const maxSaveCount = 100; // 减少到100个
    const productsToSave = newProducts.slice(0, maxSaveCount);

    // 5. 优化批量保存新产品
    const savedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];
    const batchSize = 5; // 减少批次大小到5个

    for (let i = 0; i < productsToSave.length; i += batchSize) {
      const batch = productsToSave.slice(i, i + batchSize);
      
      logger.info('📦 处理批次', {
        batchIndex: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(productsToSave.length / batchSize),
        batchSize: batch.length,
        processedSoFar: savedProjects.length
      });

      // 并发处理批次中的产品
      const batchPromises = batch.map(async (product) => {
        try {
          const { success, id, error } = await saveCategoryProduct(product);
          if (success && id) {
            return { success: true, id, product };
          } else {
            return { success: false, product, error: error || 'Unknown error' };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { success: false, product, error: errorMessage };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // 处理批次结果
      for (const result of batchResults) {
        if (result.success && result.id) {
          savedProjects.push({ id: result.id, product: result.product });
          logger.info('✅ 产品保存成功', { 
            productName: result.product.name,
            category: result.product.category
          });
        } else {
          errors.push({
            project: result.product.name,
            error: result.error || 'Save failed'
          });
        }
      }

      // 减少批次间延迟
      if (i + batchSize < productsToSave.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    logger.info('🎉 AIbase主页采集完成', {
      totalFound: products.length,
      newProducts: newProducts.length,
      duplicateProducts: duplicateProducts.length,
      successfullySaved: savedProjects.length,
      errors: errors.length,
      skippedDueToLimit: Math.max(0, newProducts.length - maxSaveCount),
      categoryBreakdown: getCategoryBreakdown(savedProjects.map(p => p.product))
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `主页采集完成，成功保存 ${savedProjects.length} 个新工具`,
        summary: {
          totalFound: products.length,
          newProducts: newProducts.length,
          duplicateProducts: duplicateProducts.length,
          successfullySaved: savedProjects.length,
          errors: errors.length,
          skippedDueToLimit: Math.max(0, newProducts.length - maxSaveCount),
          extractionMethod: 'homepage_tool_links_enhanced_no_limit'
        },
        details: {
          savedProjects: savedProjects.slice(0, 20).map(p => ({
            name: p.product.name,
            category: p.product.category,
            description: p.product.description,
            url: p.product.url,
            tags: p.product.tags?.slice(0, 3)
          })),
          duplicateProducts: duplicateProducts.slice(0, 15).map(p => ({
            name: p.name,
            category: p.category
          })),
          errors: errors.slice(0, 10),
          categoryBreakdown: Object.entries(
            savedProjects.reduce((acc, p) => {
              acc[p.product.category] = (acc[p.product.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([category, count]) => ({ category, count }))
        }
      })
    };
  } catch (error) {
    logger.error('❌ 主页采集失败', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 