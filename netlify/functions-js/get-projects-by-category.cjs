const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

exports.handler = async (event, context) => {
  console.log('get-projects-by-category function called');
  
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Database not configured' 
        })
      };
    }

    const { queryStringParameters } = event;
    const categoryCode = queryStringParameters?.category;
    const search = queryStringParameters?.search;
    const language = queryStringParameters?.language || 'zh';
    const limit = parseInt(queryStringParameters?.limit || '50');
    const offset = parseInt(queryStringParameters?.offset || '0');

    console.log(`📊 获取项目数据 - 分类: ${categoryCode || '全部'}, 搜索: ${search || '无'}, 语言: ${language}`);

    // 构建查询 user_projects 表 - 只返回有分类信息的项目
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
        official_website,
        created_at
      `)
      .not('name', 'is', null)
      .not('name', 'eq', '')
      .not('primary_category_code', 'is', null)
      .not('secondary_category_code', 'is', null)
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
      console.error('❌ 获取项目数据失败:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: error.message 
        })
      };
    }

    // 处理多语言项目数据
    const processedProjects = (projects || []).map(project => {
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
        name_display: displayName,
        description_display: displayDescription
      };
    });

    // 获取总数 - 只统计有分类信息的项目
    let countQuery = supabase
      .from('user_projects')
      .select('id', { count: 'exact' })
      .not('name', 'is', null)
      .not('name', 'eq', '')
      .not('primary_category_code', 'is', null)
      .not('secondary_category_code', 'is', null);

    if (categoryCode) {
      countQuery = countQuery.or(`primary_category_code.eq.${categoryCode},secondary_category_code.eq.${categoryCode}`);
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    console.log(`✅ 成功获取 ${processedProjects.length} 个项目，总计 ${totalCount || 0} 个`);

    // 获取分类信息，使用正确的表名
    let categoryInfo = null;
    if (categoryCode) {
      const { data: category, error: categoryError } = await supabase
        .from('user_projectscategory')
        .select('*')
        .eq('category_code', categoryCode)
        .single();

      if (!categoryError && category) {
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