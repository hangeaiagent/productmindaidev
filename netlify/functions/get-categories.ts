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
    // 获取语言参数
    const { queryStringParameters } = event;
    const language = queryStringParameters?.language || 'zh'; // 默认中文
    
    console.log(`📚 获取分类数据... 语言: ${language}`);
    
    // 添加环境变量检查
    console.log('🔧 环境变量检查:', {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未设置',
      supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : '未设置',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase环境变量未正确配置');
    }

    // 测试Supabase连接
    console.log('🔗 测试Supabase连接...');
    
    // 查询分类数据，包含多语言字段
    const { data: categories, error } = await supabase
      .from('user_projectscategory')
      .select('*')
      .order('category_level')
      .order('sort_order');

    if (error) {
      console.error('❌ 分类查询错误详情:', {
        message: error.message,
        details: error.details || error.stack || String(error),
        hint: error.hint || '',
        code: error.code || ''
      });
      throw new Error(`获取分类数据失败: ${error.message} (代码: ${error.code || ''})`);
    }

    console.log(`✅ 成功获取 ${categories?.length || 0} 个分类`);
    
    // 如果没有集成AI编程分类，添加它们
    let allCategories = categories || [];
    
    // 检查是否已存在集成AI编程分类
    const hasAIProgramming = allCategories.some(cat => cat.category_name === '集成AI编程');
    
    if (!hasAIProgramming) {
      console.log('📋 添加集成AI编程分类...');
      
      // 添加一级分类：集成AI编程
      const primaryCategory = {
        id: 'ai-programming-1000',
        category_code: '1000', 
        category_name: '集成AI编程',
        category_name_en: 'AI Programming Integration',
        parent_category_code: null,
        category_level: 1,
        sort_order: 1000,
        project_count: 0
      };
      
      // 添加二级分类
      const secondaryCategories = [
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
          id: 'ai-programming-1003',
          category_code: '1003', 
          category_name: '自动化测试',
          category_name_en: 'Automated Testing',
          parent_category_code: '1000',
          category_level: 2,
          sort_order: 1003,
          project_count: 0
        },
        {
          id: 'ai-programming-1004',
          category_code: '1004',
          category_name: '文档生成',
          category_name_en: 'Documentation Generation',
          parent_category_code: '1000', 
          category_level: 2,
          sort_order: 1004,
          project_count: 0
        },
        {
          id: 'ai-programming-1005',
          category_code: '1005',
          category_name: '智能调试',
          category_name_en: 'Intelligent Debugging',
          parent_category_code: '1000',
          category_level: 2, 
          sort_order: 1005,
          project_count: 0
        }
      ];
      
      // 合并到现有分类中
      allCategories = [
        ...allCategories,
        primaryCategory,
        ...secondaryCategories
      ];
      
      console.log('✅ 集成AI编程分类添加完成');
    }

    // 统计每个分类的项目数量
    console.log('📊 开始统计项目数量...');
    const { data: projectCounts, error: countError } = await supabase
      .from('user_projects')
      .select('primary_category_code, secondary_category_code')
      .not('name', 'is', null)
      .not('name', 'eq', '');

    if (countError) {
      console.warn('⚠️ 获取项目计数失败:', {
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
        code: countError.code
      });
      // 项目计数失败不影响主要功能，继续执行
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

    // 为分类添加项目数量并处理多语言显示
    const categoriesWithCounts = allCategories.map(category => {
      const displayName = language === 'en' 
        ? (category.category_name_en || category.category_name)
        : category.category_name;
      
      return {
      ...category,
        project_count: categoryCounts[category.category_code] || 0,
        display_name: displayName,
        // 保留原始字段以便前端可以获取完整信息
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
          totalCategories: categories?.length || 0,
          primaryCategories: categories?.filter(cat => cat.category_level === 1).length || 0,
          secondaryCategories: categories?.filter(cat => cat.category_level === 2).length || 0,
          totalProjects: projectCounts?.length || 0
        }
      })
    };

  } catch (error) {
    console.error('❌ 获取分类数据失败:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '获取分类数据失败',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
    };
  }
}; 