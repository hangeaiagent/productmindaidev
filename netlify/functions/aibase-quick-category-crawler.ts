import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

interface CategoryInfo {
  id: string;
  name: string;
  url: string;
}

interface ProductInfo {
  name: string;
  description: string;
  url: string;
  officialWebsite: string;
  category: string;
  subcategory: string;
  tags: string[];
}

// 34个分类的完整列表
const CATEGORIES: CategoryInfo[] = [
  // 图像处理 (9个)
  { id: '37-49', name: '图片背景移除', url: '/discover/37-49' },
  { id: '37-50', name: '图片无损放大', url: '/discover/37-50' },
  { id: '37-51', name: '图片AI修复', url: '/discover/37-51' },
  { id: '37-52', name: '图像生成', url: '/discover/37-52' },
  { id: '37-53', name: 'Ai图片拓展', url: '/discover/37-53' },
  { id: '37-54', name: 'Ai漫画生成', url: '/discover/37-54' },
  { id: '37-55', name: 'Ai生成写真', url: '/discover/37-55' },
  { id: '37-83', name: '电商图片制作', url: '/discover/37-83' },
  { id: '37-86', name: 'Ai图像转视频', url: '/discover/37-86' },
  
  // 视频创作 (4个)
  { id: '38-56', name: '视频剪辑', url: '/discover/38-56' },
  { id: '38-57', name: '生成视频', url: '/discover/38-57' },
  { id: '38-58', name: 'Ai动画制作', url: '/discover/38-58' },
  { id: '38-84', name: '字幕生成', url: '/discover/38-84' },
  
  // 效率助手 (5个)
  { id: '39-59', name: 'AI文档工具', url: '/discover/39-59' },
  { id: '39-60', name: 'PPT', url: '/discover/39-60' },
  { id: '39-61', name: '思维导图', url: '/discover/39-61' },
  { id: '39-62', name: '表格处理', url: '/discover/39-62' },
  { id: '39-63', name: 'Ai办公助手', url: '/discover/39-63' },
  
  // 写作灵感 (2个)
  { id: '40-64', name: '文案写作', url: '/discover/40-64' },
  { id: '40-88', name: '论文写作', url: '/discover/40-88' },
  
  // 艺术灵感 (3个)
  { id: '41-65', name: '语音克隆', url: '/discover/41-65' },
  { id: '41-66', name: '设计创作', url: '/discover/41-66' },
  { id: '41-67', name: 'Ai图标生成', url: '/discover/41-67' },
  
  // 趣味 (3个)
  { id: '42-68', name: 'Ai名字生成器', url: '/discover/42-68' },
  { id: '42-71', name: '游戏娱乐', url: '/discover/42-71' },
  { id: '42-72', name: '其他', url: '/discover/42-72' },
  
  // 开发编程 (3个)
  { id: '43-73', name: '开发编程', url: '/discover/43-73' },
  { id: '43-74', name: 'Ai开放平台', url: '/discover/43-74' },
  { id: '43-75', name: 'Ai算力平台', url: '/discover/43-75' },
  
  // 聊天机器人 (2个)
  { id: '44-76', name: '智能聊天', url: '/discover/44-76' },
  { id: '44-77', name: '智能客服', url: '/discover/44-77' },
  
  // 翻译 (1个)
  { id: '46-79', name: '翻译', url: '/discover/46-79' },
  
  // 教育学习 (1个)
  { id: '47-80', name: '教育学习', url: '/discover/47-80' },
  
  // 智能营销 (1个)
  { id: '48-81', name: '智能营销', url: '/discover/48-81' }
];

async function fetchCategoryProducts(categoryUrl: string, maxProducts: number = 10): Promise<ProductInfo[]> {
  console.log(`🔍 获取分类产品: ${categoryUrl}`);
  
  try {
    const fullUrl = `https://top.aibase.com${categoryUrl}`;
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const productLinks = extractProductLinks(html);
    
    console.log(`📊 发现 ${productLinks.length} 个产品链接`);
    
    // 限制产品数量
    const limitedLinks = productLinks.slice(0, maxProducts);
    const products: ProductInfo[] = [];
    
    // 获取当前分类信息
    const currentCategory = CATEGORIES.find(c => c.url === categoryUrl);
    const categoryName = currentCategory?.name || '未知分类';
    const categoryId = currentCategory?.id || 'unknown';
    
    // 根据分类ID确定一级分类
    const primaryCategory = getPrimaryCategoryFromId(categoryId);
    
    // 并发获取产品详情
    const productPromises = limitedLinks.map(link => 
      fetchProductDetails(link, primaryCategory, categoryName)
    );
    
    const productResults = await Promise.all(productPromises);
    
    for (const product of productResults) {
      if (product) {
        products.push(product);
      }
    }
    
    console.log(`✅ 成功获取 ${products.length} 个产品`);
    return products;
  } catch (error) {
    console.error(`❌ 分类产品获取失败: ${categoryUrl}`, error);
    return [];
  }
}

// 新增函数：根据分类ID获取一级分类
function getPrimaryCategoryFromId(categoryId: string): string {
  const primaryId = categoryId.split('-')[0];
  const categoryMap: { [key: string]: string } = {
    '37': '图像处理',
    '38': '视频创作', 
    '39': '效率助手',
    '40': '写作灵感',
    '41': '艺术灵感',
    '42': '趣味',
    '43': '开发编程',
    '44': '聊天机器人',
    '45': '翻译',
    '46': '教育学习',
    '47': '智能营销'
  };
  
  return categoryMap[primaryId] || '未知分类';
}

function extractProductLinks(html: string): string[] {
  const linkPattern = /href="(\/tool\/[^"]+)"/g;
  const links: string[] = [];
  let match;
  
  while ((match = linkPattern.exec(html)) !== null) {
    const link = match[1];
    if (!links.includes(link)) {
      links.push(link);
    }
  }
  
  return links;
}

async function fetchProductDetails(productPath: string, primaryCategory: string, subcategory: string): Promise<ProductInfo | null> {
  const fullUrl = `https://top.aibase.com${productPath}`;
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    return {
      name: extractProductName(html),
      description: extractProductDescription(html),
      url: fullUrl,
      officialWebsite: extractOfficialWebsite(html),
      category: primaryCategory,
      subcategory: subcategory,
      tags: extractProductTags(html)
    };
  } catch (error) {
    console.error(`❌ 产品详情获取失败: ${productPath}`, error);
    return null;
  }
}

function extractProductName(html: string): string {
  // 尝试多种模式提取产品名称
  const patterns = [
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title>([^<]+)<\/title>/i,
    /<h2[^>]*>([^<]+)<\/h2>/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  return '未知产品';
}

function extractProductDescription(html: string): string {
  // 尝试多种模式提取描述
  const patterns = [
    /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i,
    /<div[^>]*class="[^"]*intro[^"]*"[^>]*>([^<]+)<\/div>/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  return '暂无描述';
}

function extractOfficialWebsite(html: string): string {
  // 尝试提取官方网站
  const patterns = [
    /官方网站[^>]*href="([^"]+)"/i,
    /官网[^>]*href="([^"]+)"/i,
    /website[^>]*href="([^"]+)"/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return '';
}

function extractProductTags(html: string): string[] {
  const tags: string[] = [];
  
  // 提取标签
  const tagPattern = /<span[^>]*class="[^"]*tag[^"]*"[^>]*>([^<]+)<\/span>/gi;
  let match;
  
  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

async function saveProductToDatabase(product: ProductInfo): Promise<boolean> {
  try {
    console.log(`💾 保存产品: ${product.name}`);
    
    // 检查产品是否已存在（基于名称去重）
    const { data: existingProduct, error: checkError } = await supabase
      .from('user_projects')
      .select('id')
      .eq('name', product.name)
      .limit(1);
    
    if (checkError) {
      console.error('❌ 检查重复产品失败:', checkError);
      return false;
    }
    
    if (existingProduct && existingProduct.length > 0) {
      console.log(`⚠️ 产品已存在，跳过: ${product.name}`);
      return false;
    }
    
    // 使用指定的用户ID
    const userId = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
    
    // 保存新产品
    const { data, error } = await supabase
      .from('user_projects')
      .insert({
        user_id: userId,
        name: product.name,
        description: product.description,
        primary_category: product.category,
        secondary_category: product.subcategory,
        category_path: `${product.category}/${product.subcategory}`,
        is_open_source: false,
        model_locked: false,
        is_default: false
      })
      .select();
    
    if (error) {
      console.error('❌ 保存产品失败:', error);
      return false;
    }
    
    console.log(`✅ 产品保存成功: ${product.name}`);
    return true;
  } catch (error) {
    console.error('❌ 保存产品异常:', error);
    return false;
  }
}

export const handler: Handler = async (event) => {
  console.log('🚀 开始AIbase快速分类采集');
  
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { categoryId, maxProducts = 5 } = body;
    
    if (categoryId) {
      // 采集单个分类
      const category = CATEGORIES.find(c => c.id === categoryId);
      if (!category) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: `分类 ${categoryId} 不存在`
          })
        };
      }
      
      console.log(`📂 采集分类: ${category.name} (${category.id})`);
      const products = await fetchCategoryProducts(category.url, maxProducts);
      
      // 保存到数据库
      let savedCount = 0;
      for (const product of products) {
        const saved = await saveProductToDatabase(product);
        if (saved) savedCount++;
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          category: category.name,
          categoryId: category.id,
          totalFound: products.length,
          totalSaved: savedCount,
          products: products.map(p => ({
            name: p.name,
            description: p.description.substring(0, 100) + '...',
            url: p.url
          }))
        })
      };
    } else {
      // 返回所有分类列表
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'AIbase分类列表',
          totalCategories: CATEGORIES.length,
          categories: CATEGORIES.map(c => ({
            id: c.id,
            name: c.name,
            url: `https://top.aibase.com${c.url}`
          }))
        })
      };
    }
  } catch (error) {
    console.error('❌ 采集失败:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    };
  }
}; 