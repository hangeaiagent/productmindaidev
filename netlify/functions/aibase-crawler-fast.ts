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

// 清理产品名称
function cleanProductName(name: string): string {
  return name
    .replace(/使用入口地址.*$/i, '')
    .replace(/Ai网站最新工具和软件app下载.*$/i, '')
    .replace(/\s*-\s*AIbase.*$/i, '')
    .replace(/\s*\|\s*AIbase.*$/i, '')
    .trim();
}

// 快速产品接口
interface FastProduct {
  name: string;
  url: string;
  category?: string;
}

// 快速获取产品列表
async function fastFetchProducts(): Promise<FastProduct[]> {
  const products: FastProduct[] = [];
  
  try {
    logger.info('🚀 开始快速采集AIbase产品链接...');
    
    // 要采集的页面列表
    const pages = [
      { url: 'https://top.aibase.com/', category: '首页' },
      { url: 'https://top.aibase.com/discover', category: '发现' },
      { url: 'https://top.aibase.com/tools', category: '工具' }
    ];

    const productUrls = new Set<string>();
    
    // 并发获取所有页面
    const pagePromises = pages.map(async (page) => {
      try {
        const response = await fetch(page.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
          }
        });

        if (response.ok) {
          const html = await response.text();
          
          // 提取产品链接
          const productPattern = /\/tool\/([^"'\s]+)/g;
          let match;
          const pageProducts: FastProduct[] = [];
          
          while ((match = productPattern.exec(html)) !== null) {
            const productPath = match[0];
            const productSlug = match[1];
            
            if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
              const fullUrl = `https://top.aibase.com${productPath}`;
              
              if (!productUrls.has(fullUrl)) {
                productUrls.add(fullUrl);
                
                // 从slug生成产品名称
                const productName = productSlug
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                pageProducts.push({
                  name: productName,
                  url: fullUrl,
                  category: page.category
                });
              }
            }
          }
          
          logger.info('📊 页面采集完成', {
            pageUrl: page.url,
            category: page.category,
            newProducts: pageProducts.length,
            totalUnique: productUrls.size
          });
          
          return pageProducts;
        }
        
        return [];
      } catch (error) {
        logger.warn('⚠️ 页面采集失败', {
          pageUrl: page.url,
          error: error instanceof Error ? error.message : String(error)
        });
        return [];
      }
    });

    // 等待所有页面完成
    const allPageResults = await Promise.all(pagePromises);
    
    // 合并结果
    for (const pageProducts of allPageResults) {
      products.push(...pageProducts);
    }

    logger.info('✅ 快速采集完成', {
      totalPages: pages.length,
      totalProducts: products.length,
      uniqueUrls: productUrls.size
    });

    return products;
  } catch (error) {
    logger.error('❌ 快速采集失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    return products;
  }
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

// 快速保存产品
async function fastSaveProduct(product: FastProduct): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const cleanedName = cleanProductName(product.name);
    
    const projectData = {
      user_id: DEFAULT_USER_ID,
      name: cleanedName,
      description: `${cleanedName} - AI工具`,
      official_website: product.url,
      primary_category: product.category || 'AI工具',
      secondary_category: 'AI应用',
      category_path: `${product.category || 'AI工具'}/AI应用`,
      metadata: {
        source: 'aibase_fast_crawler',
        crawled_at: new Date().toISOString(),
        original_name: product.name,
        aibase_url: product.url
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
    logger.info('🚀 开始快速AIbase项目采集');

    // 1. 快速获取产品列表
    const products = await fastFetchProducts();

    if (products.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: '未找到任何产品',
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
      const cleanedName = cleanProductName(product.name).toLowerCase().trim();
      return !existingProjects.has(cleanedName);
    });

    const duplicateProducts = products.filter(product => {
      const cleanedName = cleanProductName(product.name).toLowerCase().trim();
      return existingProjects.has(cleanedName);
    });

    logger.info('📊 重复检查完成', {
      totalProducts: products.length,
      newProducts: newProducts.length,
      duplicateProducts: duplicateProducts.length
    });

    // 4. 保存新产品
    const savedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];

    for (const product of newProducts) {
      try {
        const { success, id, error } = await fastSaveProduct(product);
        if (success && id) {
          savedProjects.push({ id, product });
          logger.info('✅ 产品保存成功', { 
            productName: cleanProductName(product.name),
            category: product.category
          });
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
      }
    }

    logger.info('🎉 快速AIbase采集完成', {
      totalFound: products.length,
      newProducts: newProducts.length,
      duplicateProducts: duplicateProducts.length,
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
        message: `成功采集 ${savedProjects.length} 个新产品`,
        summary: {
          totalFound: products.length,
          newProducts: newProducts.length,
          duplicateProducts: duplicateProducts.length,
          successfullySaved: savedProjects.length,
          errors: errors.length
        },
        details: {
          savedProjects: savedProjects.slice(0, 10).map(p => ({
            name: cleanProductName(p.product.name),
            category: p.product.category,
            url: p.product.url
          })),
          duplicateProducts: duplicateProducts.slice(0, 10).map(p => ({
            name: cleanProductName(p.name),
            category: p.category
          })),
          errors: errors.slice(0, 5)
        }
      })
    };
  } catch (error) {
    logger.error('❌ 快速采集失败', {
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