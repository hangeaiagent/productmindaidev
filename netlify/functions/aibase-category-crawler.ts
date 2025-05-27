import { Handler } from '@netlify/functions';

interface CategoryInfo {
  id: string;
  name: string;
  url: string;
  subcategories: SubcategoryInfo[];
}

interface SubcategoryInfo {
  id: string;
  name: string;
  url: string;
  parentCategory: string;
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

// AIbase分类结构（从HTML中提取）
const AIBASE_CATEGORIES: CategoryInfo[] = [
  {
    id: '37',
    name: '图像处理',
    url: '/discover/37',
    subcategories: [
      { id: '37-49', name: '图片背景移除', url: '/discover/37-49', parentCategory: '图像处理' },
      { id: '37-50', name: '图片无损放大', url: '/discover/37-50', parentCategory: '图像处理' },
      { id: '37-51', name: '图片AI修复', url: '/discover/37-51', parentCategory: '图像处理' },
      { id: '37-52', name: '图像生成', url: '/discover/37-52', parentCategory: '图像处理' },
      { id: '37-53', name: 'Ai图片拓展', url: '/discover/37-53', parentCategory: '图像处理' },
      { id: '37-54', name: 'Ai漫画生成', url: '/discover/37-54', parentCategory: '图像处理' },
      { id: '37-55', name: 'Ai生成写真', url: '/discover/37-55', parentCategory: '图像处理' },
      { id: '37-83', name: '电商图片制作', url: '/discover/37-83', parentCategory: '图像处理' },
      { id: '37-86', name: 'Ai图像转视频', url: '/discover/37-86', parentCategory: '图像处理' }
    ]
  },
  {
    id: '38',
    name: '视频创作',
    url: '/discover/38',
    subcategories: [
      { id: '38-56', name: '视频剪辑', url: '/discover/38-56', parentCategory: '视频创作' },
      { id: '38-57', name: '生成视频', url: '/discover/38-57', parentCategory: '视频创作' },
      { id: '38-58', name: 'Ai动画制作', url: '/discover/38-58', parentCategory: '视频创作' },
      { id: '38-84', name: '字幕生成', url: '/discover/38-84', parentCategory: '视频创作' }
    ]
  },
  {
    id: '39',
    name: '效率助手',
    url: '/discover/39',
    subcategories: [
      { id: '39-59', name: 'AI文档工具', url: '/discover/39-59', parentCategory: '效率助手' },
      { id: '39-60', name: 'PPT', url: '/discover/39-60', parentCategory: '效率助手' },
      { id: '39-61', name: '思维导图', url: '/discover/39-61', parentCategory: '效率助手' },
      { id: '39-62', name: '表格处理', url: '/discover/39-62', parentCategory: '效率助手' },
      { id: '39-63', name: 'Ai办公助手', url: '/discover/39-63', parentCategory: '效率助手' }
    ]
  },
  {
    id: '40',
    name: '写作灵感',
    url: '/discover/40',
    subcategories: [
      { id: '40-64', name: '文案写作', url: '/discover/40-64', parentCategory: '写作灵感' },
      { id: '40-88', name: '论文写作', url: '/discover/40-88', parentCategory: '写作灵感' }
    ]
  },
  {
    id: '41',
    name: '艺术灵感',
    url: '/discover/41',
    subcategories: [
      { id: '41-65', name: '语音克隆', url: '/discover/41-65', parentCategory: '艺术灵感' },
      { id: '41-66', name: '设计创作', url: '/discover/41-66', parentCategory: '艺术灵感' },
      { id: '41-67', name: 'Ai图标生成', url: '/discover/41-67', parentCategory: '艺术灵感' }
    ]
  },
  {
    id: '42',
    name: '趣味',
    url: '/discover/42',
    subcategories: [
      { id: '42-68', name: 'Ai名字生成器', url: '/discover/42-68', parentCategory: '趣味' },
      { id: '42-71', name: '游戏娱乐', url: '/discover/42-71', parentCategory: '趣味' },
      { id: '42-72', name: '其他', url: '/discover/42-72', parentCategory: '趣味' }
    ]
  },
  {
    id: '43',
    name: '开发编程',
    url: '/discover/43',
    subcategories: [
      { id: '43-73', name: '开发编程', url: '/discover/43-73', parentCategory: '开发编程' },
      { id: '43-74', name: 'Ai开放平台', url: '/discover/43-74', parentCategory: '开发编程' },
      { id: '43-75', name: 'Ai算力平台', url: '/discover/43-75', parentCategory: '开发编程' }
    ]
  },
  {
    id: '44',
    name: '聊天机器人',
    url: '/discover/44',
    subcategories: [
      { id: '44-76', name: '智能聊天', url: '/discover/44-76', parentCategory: '聊天机器人' },
      { id: '44-77', name: '智能客服', url: '/discover/44-77', parentCategory: '聊天机器人' }
    ]
  },
  {
    id: '46',
    name: '翻译',
    url: '/discover/46',
    subcategories: [
      { id: '46-79', name: '翻译', url: '/discover/46-79', parentCategory: '翻译' }
    ]
  },
  {
    id: '47',
    name: '教育学习',
    url: '/discover/47',
    subcategories: [
      { id: '47-80', name: '教育学习', url: '/discover/47-80', parentCategory: '教育学习' }
    ]
  },
  {
    id: '48',
    name: '智能营销',
    url: '/discover/48',
    subcategories: [
      { id: '48-81', name: '智能营销', url: '/discover/48-81', parentCategory: '智能营销' }
    ]
  }
];

async function fetchCategoryProducts(categoryUrl: string): Promise<ProductInfo[]> {
  const fullUrl = `https://top.aibase.com${categoryUrl}`;
  console.log(`🔍 正在采集分类: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 提取产品链接
    const productLinks = extractProductLinks(html);
    console.log(`📊 找到 ${productLinks.length} 个产品链接`);
    
    // 获取产品详情
    const products: ProductInfo[] = [];
    for (const link of productLinks.slice(0, 50)) { // 限制每个分类最多50个产品
      try {
        const product = await fetchProductDetails(link);
        if (product) {
          products.push(product);
        }
        // 添加延迟避免被限制
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`⚠️ 获取产品详情失败: ${link}`, error);
      }
    }
    
    return products;
  } catch (error) {
    console.error(`❌ 采集分类失败: ${categoryUrl}`, error);
    return [];
  }
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

async function fetchProductDetails(productPath: string): Promise<ProductInfo | null> {
  const fullUrl = `https://top.aibase.com${productPath}`;
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 提取产品信息
    const name = extractProductName(html);
    const description = extractProductDescription(html);
    const officialWebsite = extractOfficialWebsite(html);
    const tags = extractProductTags(html);
    
    if (!name) {
      return null;
    }
    
    return {
      name,
      description: description || '',
      url: fullUrl,
      officialWebsite: officialWebsite || '',
      category: '',
      subcategory: '',
      tags
    };
  } catch (error) {
    console.error(`❌ 获取产品详情失败: ${productPath}`, error);
    return null;
  }
}

function extractProductName(html: string): string {
  // 尝试多种方式提取产品名称
  const patterns = [
    /<title[^>]*>([^<]+)/i,
    /<h1[^>]*>([^<]+)/i,
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="title"[^>]*content="([^"]+)"/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  return '';
}

function extractProductDescription(html: string): string {
  const patterns = [
    /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
    /<p[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  return '';
}

function extractOfficialWebsite(html: string): string {
  const patterns = [
    /href="(https?:\/\/[^"]+)"[^>]*>.*?官网/i,
    /href="(https?:\/\/[^"]+)"[^>]*>.*?官方/i,
    /href="(https?:\/\/[^"]+)"[^>]*>.*?website/i,
    /"url":\s*"(https?:\/\/[^"]+)"/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1] && !match[1].includes('aibase.com')) {
      return match[1];
    }
  }
  
  return '';
}

function extractProductTags(html: string): string[] {
  const tags: string[] = [];
  
  // 提取标签
  const tagPatterns = [
    /<span[^>]*class="[^"]*tag[^"]*"[^>]*>([^<]+)/gi,
    /<div[^>]*class="[^"]*tag[^"]*"[^>]*>([^<]+)/gi
  ];
  
  for (const pattern of tagPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const tag = match[1].trim();
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }
  
  return tags;
}

async function saveProductToDatabase(product: ProductInfo): Promise<boolean> {
  // 这里应该连接到Supabase数据库保存产品
  // 暂时返回true表示保存成功
  console.log(`💾 保存产品: ${product.name}`);
  return true;
}

export const handler: Handler = async (event) => {
  console.log('🚀 开始AIbase分类采集');
  
  try {
    const allProducts: ProductInfo[] = [];
    let totalProcessed = 0;
    let totalSaved = 0;
    
    // 遍历所有一级分类
    for (const category of AIBASE_CATEGORIES) {
      console.log(`📂 处理一级分类: ${category.name}`);
      
      // 遍历该分类下的所有二级分类
      for (const subcategory of category.subcategories) {
        console.log(`📁 处理二级分类: ${subcategory.name}`);
        
        const products = await fetchCategoryProducts(subcategory.url);
        
        // 为产品添加分类信息
        for (const product of products) {
          product.category = category.name;
          product.subcategory = subcategory.name;
          allProducts.push(product);
          totalProcessed++;
          
          // 保存到数据库
          const saved = await saveProductToDatabase(product);
          if (saved) {
            totalSaved++;
          }
        }
        
        console.log(`✅ ${subcategory.name} 完成，获取 ${products.length} 个产品`);
        
        // 分类间延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`🎯 ${category.name} 分类完成`);
    }
    
    console.log('🎉 AIbase分类采集完成');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'AIbase分类采集完成',
        statistics: {
          totalCategories: AIBASE_CATEGORIES.length,
          totalSubcategories: AIBASE_CATEGORIES.reduce((sum, cat) => sum + cat.subcategories.length, 0),
          totalProcessed,
          totalSaved,
          categories: AIBASE_CATEGORIES.map(cat => ({
            name: cat.name,
            subcategoryCount: cat.subcategories.length,
            subcategories: cat.subcategories.map(sub => sub.name)
          }))
        },
        sampleProducts: allProducts.slice(0, 10)
      })
    };
    
  } catch (error) {
    console.error('❌ AIbase分类采集失败:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    };
  }
}; 