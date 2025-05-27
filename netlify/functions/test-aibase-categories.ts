import { Handler } from '@netlify/functions';

interface SubcategoryTest {
  name: string;
  id: string;
  url: string;
  accessible: boolean;
  productCount: number;
  error?: string;
}

interface CategoryTest {
  name: string;
  id: string;
  subcategories: SubcategoryTest[];
}

// AIbase分类结构（从HTML中提取）
const AIBASE_CATEGORIES = [
  {
    id: '37',
    name: '图像处理',
    url: '/discover/37',
    subcategories: [
      { id: '37-49', name: '图片背景移除', url: '/discover/37-49' },
      { id: '37-50', name: '图片无损放大', url: '/discover/37-50' },
      { id: '37-51', name: '图片AI修复', url: '/discover/37-51' },
      { id: '37-52', name: '图像生成', url: '/discover/37-52' },
      { id: '37-53', name: 'Ai图片拓展', url: '/discover/37-53' },
      { id: '37-54', name: 'Ai漫画生成', url: '/discover/37-54' },
      { id: '37-55', name: 'Ai生成写真', url: '/discover/37-55' },
      { id: '37-83', name: '电商图片制作', url: '/discover/37-83' },
      { id: '37-86', name: 'Ai图像转视频', url: '/discover/37-86' }
    ]
  },
  {
    id: '38',
    name: '视频创作',
    url: '/discover/38',
    subcategories: [
      { id: '38-56', name: '视频剪辑', url: '/discover/38-56' },
      { id: '38-57', name: '生成视频', url: '/discover/38-57' },
      { id: '38-58', name: 'Ai动画制作', url: '/discover/38-58' },
      { id: '38-84', name: '字幕生成', url: '/discover/38-84' }
    ]
  },
  {
    id: '39',
    name: '效率助手',
    url: '/discover/39',
    subcategories: [
      { id: '39-59', name: 'AI文档工具', url: '/discover/39-59' },
      { id: '39-60', name: 'PPT', url: '/discover/39-60' },
      { id: '39-61', name: '思维导图', url: '/discover/39-61' },
      { id: '39-62', name: '表格处理', url: '/discover/39-62' },
      { id: '39-63', name: 'Ai办公助手', url: '/discover/39-63' }
    ]
  },
  {
    id: '40',
    name: '写作灵感',
    url: '/discover/40',
    subcategories: [
      { id: '40-64', name: '文案写作', url: '/discover/40-64' },
      { id: '40-88', name: '论文写作', url: '/discover/40-88' }
    ]
  },
  {
    id: '41',
    name: '艺术灵感',
    url: '/discover/41',
    subcategories: [
      { id: '41-65', name: '语音克隆', url: '/discover/41-65' },
      { id: '41-66', name: '设计创作', url: '/discover/41-66' },
      { id: '41-67', name: 'Ai图标生成', url: '/discover/41-67' }
    ]
  },
  {
    id: '42',
    name: '趣味',
    url: '/discover/42',
    subcategories: [
      { id: '42-68', name: 'Ai名字生成器', url: '/discover/42-68' },
      { id: '42-71', name: '游戏娱乐', url: '/discover/42-71' },
      { id: '42-72', name: '其他', url: '/discover/42-72' }
    ]
  },
  {
    id: '43',
    name: '开发编程',
    url: '/discover/43',
    subcategories: [
      { id: '43-73', name: '开发编程', url: '/discover/43-73' },
      { id: '43-74', name: 'Ai开放平台', url: '/discover/43-74' },
      { id: '43-75', name: 'Ai算力平台', url: '/discover/43-75' }
    ]
  },
  {
    id: '44',
    name: '聊天机器人',
    url: '/discover/44',
    subcategories: [
      { id: '44-76', name: '智能聊天', url: '/discover/44-76' },
      { id: '44-77', name: '智能客服', url: '/discover/44-77' }
    ]
  },
  {
    id: '46',
    name: '翻译',
    url: '/discover/46',
    subcategories: [
      { id: '46-79', name: '翻译', url: '/discover/46-79' }
    ]
  },
  {
    id: '47',
    name: '教育学习',
    url: '/discover/47',
    subcategories: [
      { id: '47-80', name: '教育学习', url: '/discover/47-80' }
    ]
  },
  {
    id: '48',
    name: '智能营销',
    url: '/discover/48',
    subcategories: [
      { id: '48-81', name: '智能营销', url: '/discover/48-81' }
    ]
  }
];

async function testCategoryAccess(categoryUrl: string): Promise<{ accessible: boolean; productCount: number; error?: string }> {
  const fullUrl = `https://top.aibase.com${categoryUrl}`;
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return { accessible: false, productCount: 0, error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    
    // 计算产品链接数量
    const productLinks = (html.match(/href="\/tool\/[^"]+"/g) || []).length;
    
    return { accessible: true, productCount: productLinks };
  } catch (error) {
    return { accessible: false, productCount: 0, error: error instanceof Error ? error.message : '未知错误' };
  }
}

export const handler: Handler = async (event) => {
  console.log('🧪 开始AIbase分类结构测试');
  
  try {
    const results: CategoryTest[] = [];
    let totalSubcategories = 0;
    let accessibleSubcategories = 0;
    let totalProducts = 0;
    
    // 测试每个分类
    for (const category of AIBASE_CATEGORIES.slice(0, 3)) { // 只测试前3个分类避免超时
      console.log(`📂 测试分类: ${category.name}`);
      
      const categoryResult: CategoryTest = {
        name: category.name,
        id: category.id,
        subcategories: []
      };
      
      // 测试该分类下的子分类
      for (const subcategory of category.subcategories) {
        console.log(`📁 测试子分类: ${subcategory.name}`);
        totalSubcategories++;
        
        const testResult = await testCategoryAccess(subcategory.url);
        
        if (testResult.accessible) {
          accessibleSubcategories++;
          totalProducts += testResult.productCount;
        }
        
        const subcategoryTest: SubcategoryTest = {
          name: subcategory.name,
          id: subcategory.id,
          url: subcategory.url,
          accessible: testResult.accessible,
          productCount: testResult.productCount,
          error: testResult.error
        };
        
        categoryResult.subcategories.push(subcategoryTest);
        
        // 添加延迟避免被限制
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      results.push(categoryResult);
    }
    
    console.log('🎉 AIbase分类结构测试完成');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'AIbase分类结构测试完成',
        summary: {
          totalCategories: AIBASE_CATEGORIES.length,
          testedCategories: results.length,
          totalSubcategories: AIBASE_CATEGORIES.reduce((sum, cat) => sum + cat.subcategories.length, 0),
          testedSubcategories: totalSubcategories,
          accessibleSubcategories,
          totalProducts,
          accessibilityRate: `${Math.round((accessibleSubcategories / totalSubcategories) * 100)}%`
        },
        categoryStructure: {
          totalCategories: AIBASE_CATEGORIES.length,
          categories: AIBASE_CATEGORIES.map(cat => ({
            name: cat.name,
            subcategoryCount: cat.subcategories.length,
            subcategories: cat.subcategories.map(sub => sub.name)
          }))
        },
        testResults: results
      })
    };
    
  } catch (error) {
    console.error('❌ AIbase分类结构测试失败:', error);
    
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