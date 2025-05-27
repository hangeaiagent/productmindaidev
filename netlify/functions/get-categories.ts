import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('📚 获取分类数据...');

    // 获取所有分类数据
    const { data: categories, error } = await supabase
      .from('user_projectscategory')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`获取分类数据失败: ${error.message}`);
    }

    console.log(`✅ 成功获取 ${categories?.length || 0} 个分类`);

    // 统计每个分类的项目数量
    const { data: projectCounts, error: countError } = await supabase
      .from('user_projects')
      .select('primary_category_code, secondary_category_code')
      .not('name', 'is', null)
      .not('name', 'eq', '');

    if (countError) {
      console.warn('获取项目计数失败:', countError);
    }

    // 计算分类项目数量
    const categoryCounts: Record<string, number> = {};
    projectCounts?.forEach(project => {
      if (project.primary_category_code) {
        categoryCounts[project.primary_category_code] = (categoryCounts[project.primary_category_code] || 0) + 1;
      }
      if (project.secondary_category_code) {
        categoryCounts[project.secondary_category_code] = (categoryCounts[project.secondary_category_code] || 0) + 1;
      }
    });

    // 为分类添加项目数量
    const categoriesWithCounts = categories?.map(category => ({
      ...category,
      project_count: categoryCounts[category.category_code] || 0
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '分类数据获取成功',
        categories: categoriesWithCounts,
        statistics: {
          totalCategories: categories?.length || 0,
          primaryCategories: categories?.filter(cat => cat.category_level === 1).length || 0,
          secondaryCategories: categories?.filter(cat => cat.category_level === 2).length || 0,
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