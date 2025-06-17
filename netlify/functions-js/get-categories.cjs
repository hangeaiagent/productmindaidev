
const { createClient } = require('@supabase/supabase-js');

// Supabase配置 - 只从环境变量获取，不硬编码敏感信息
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

exports.handler = async (event, context) => {
  console.log('get-categories function called');
  
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (!supabase) {
      console.error('❌ Supabase 未配置 - 请检查环境变量');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Database not configured - please check environment variables' 
        })
      };
    }

    // 获取语言参数
    const { queryStringParameters } = event;
    const language = queryStringParameters?.language || 'zh';
    
    console.log(`📚 获取分类数据... 语言: ${language}`);

    // 查询分类数据，使用正确的表名 user_projectscategory
    const { data: categories, error } = await supabase
      .from('user_projectscategory')
      .select('*')
      .order('category_level')
      .order('sort_order');

    if (error) {
      console.error('❌ 分类查询错误:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: error.message 
        })
      };
    }

    console.log(`✅ 成功获取 ${categories?.length || 0} 个分类`);
    
    // 如果没有数据，创建默认分类
    let allCategories = categories || [];
    
    if (allCategories.length === 0) {
      console.log('📋 创建默认分类...');
      
      allCategories = [
        {
          id: 'ai-programming-1000',
          category_code: '1000', 
          category_name: '集成AI编程',
          category_name_en: 'AI Programming Integration',
          parent_category_code: null,
          category_level: 1,
          sort_order: 1000,
          project_count: 0
        },
        {
          id: 'ai-programming-1001',
          category_code: '1001',
          category_name: '代码生成',
          category_name_en: 'Code Generation',
          parent_category_code: '1000',
          category_level: 2,
          sort_order: 1001,
          project_count: 0
        },
        {
          id: 'ai-programming-1002', 
          category_code: '1002',
          category_name: '代码审查',
          category_name_en: 'Code Review',
          parent_category_code: '1000',
          category_level: 2,
          sort_order: 1002,
          project_count: 0
        },
        {
          id: 'ai-tools-2000',
          category_code: '2000',
          category_name: 'AI工具',
          category_name_en: 'AI Tools',
          parent_category_code: null,
          category_level: 1,
          sort_order: 2000,
          project_count: 0
        },
        {
          id: 'ai-tools-2001',
          category_code: '2001',
          category_name: '图像处理',
          category_name_en: 'Image Processing',
          parent_category_code: '2000',
          category_level: 2,
          sort_order: 2001,
          project_count: 0
        }
      ];
    }

    // 统计每个分类的项目数量
    console.log('📊 开始统计项目数量...');
    const { data: projectCounts, error: countError } = await supabase
      .from('user_projects')
      .select('primary_category_code, secondary_category_code')
      .not('name', 'is', null)
      .not('name', 'eq', '');

    // 计算分类项目数量
    const categoryCounts = {};
    if (projectCounts) {
      projectCounts.forEach(project => {
        if (project.primary_category_code) {
          categoryCounts[project.primary_category_code] = (categoryCounts[project.primary_category_code] || 0) + 1;
        }
        if (project.secondary_category_code) {
          categoryCounts[project.secondary_category_code] = (categoryCounts[project.secondary_category_code] || 0) + 1;
        }
      });
    }

    // 为分类添加项目数量并处理多语言显示
    const categoriesWithCounts = allCategories.map(category => {
      const displayName = language === 'en' 
        ? (category.category_name_en || category.category_name)
        : category.category_name;
      
      return {
        ...category,
        project_count: categoryCounts[category.category_code] || 0,
        display_name: displayName,
        category_name_zh: category.category_name,
        category_name_en: category.category_name_en || category.category_name
      };
    });

    console.log(`✅ 分类数据处理完成，使用语言: ${language}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '分类数据获取成功',
        categories: categoriesWithCounts,
        statistics: {
          totalCategories: allCategories.length,
          primaryCategories: allCategories.filter(cat => cat.category_level === 1).length,
          secondaryCategories: allCategories.filter(cat => cat.category_level === 2).length,
          totalProjects: projectCounts?.length || 0
        }
      })
    };

  } catch (error) {
    console.error('❌ 获取分类数据失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '获取分类数据失败',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 