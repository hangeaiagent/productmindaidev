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
    const { queryStringParameters } = event;
    const categoryCode = queryStringParameters?.category;
    const search = queryStringParameters?.search;
    const language = queryStringParameters?.language || 'zh'; // 默认中文
    const limit = parseInt(queryStringParameters?.limit || '50');
    const offset = parseInt(queryStringParameters?.offset || '0');

    console.log(`📊 获取项目数据 - 分类: ${categoryCode || '全部'}, 搜索: ${search || '无'}, 语言: ${language}`);

    // 构建查询，包含多语言字段
    let query = supabase
      .from('user_projects')
      .select(`
        id,
        name,
        description,
        name_zh,
        description_zh,
        name_en,
        description_en,
        primary_category,
        secondary_category,
        primary_category_code,
        secondary_category_code,
        created_at
      `)
      .not('name', 'is', null)
      .not('name', 'eq', '')
      .order('created_at', { ascending: false });

    // 按分类筛选
    if (categoryCode) {
      query = query.or(`primary_category_code.eq.${categoryCode},secondary_category_code.eq.${categoryCode}`);
    }

    // 搜索过滤
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 分页
    query = query.range(offset, offset + limit - 1);

    const { data: projects, error } = await query;

    if (error) {
      throw new Error(`获取项目数据失败: ${error.message}`);
    }

    // 处理多语言项目数据
    const processedProjects = projects?.map(project => {
      const displayName = language === 'en'
        ? (project.name_en || project.name_zh || project.name)
        : (project.name_zh || project.name);
      
      const displayDescription = language === 'en'
        ? (project.description_en || project.description_zh || project.description)
        : (project.description_zh || project.description);

      return {
        ...project,
        name: displayName,
        description: displayDescription,
        // 保留原始字段以便前端可以获取完整信息
        name_display: displayName,
        description_display: displayDescription
      };
    }) || [];

    // 获取总数（用于分页）
    let countQuery = supabase
      .from('user_projects')
      .select('id', { count: 'exact' })
      .not('name', 'is', null)
      .not('name', 'eq', '');

    if (categoryCode) {
      countQuery = countQuery.or(`primary_category_code.eq.${categoryCode},secondary_category_code.eq.${categoryCode}`);
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.warn('获取项目总数失败:', countError);
    }

    console.log(`✅ 成功获取 ${processedProjects.length} 个项目，总计 ${totalCount || 0} 个`);

    // 如果指定了分类，获取分类信息
    let categoryInfo = null;
    if (categoryCode) {
      const { data: category, error: categoryError } = await supabase
        .from('user_projectscategory')
        .select('*')
        .eq('category_code', categoryCode)
        .single();

      if (!categoryError && category) {
        // 处理分类信息的多语言显示
        const categoryDisplayName = language === 'en'
          ? (category.category_name_en || category.category_name)
          : category.category_name;
        
        categoryInfo = {
          ...category,
          display_name: categoryDisplayName
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '项目数据获取成功',
        projects: processedProjects,
        categoryInfo,
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          hasMore: (totalCount || 0) > offset + limit
        },
        filters: {
          category: categoryCode,
          search,
          language
        }
      })
    };

  } catch (error) {
    console.error('❌ 获取项目数据失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '获取项目数据失败',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 