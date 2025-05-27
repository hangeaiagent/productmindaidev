import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event, context) => {
  console.log('🔍 检查更新后的分类统计...');

  try {
    // 1. 检查智能营销分类表状态
    console.log('📊 检查智能营销分类表...');
    const { data: marketingCategories, error: marketingCatError } = await supabase
      .from('user_projectscategory')
      .select('*')
      .eq('parent_category_code', '110')
      .order('sort_order');

    if (marketingCatError) {
      console.error('❌ 获取智能营销分类失败:', marketingCatError);
    } else {
      console.log(`✅ 智能营销二级分类数量: ${marketingCategories?.length || 0}`);
      marketingCategories?.forEach(cat => {
        console.log(`  - ${cat.category_code}: ${cat.category_name}`);
      });
    }

    // 2. 检查智能营销项目统计
    console.log('📈 检查智能营销项目...');
    const { data: marketingProjects, error: marketingProjError } = await supabase
      .from('user_projects')
      .select('id, name, primary_category, secondary_category, primary_category_code, secondary_category_code')
      .eq('primary_category', '智能营销');

    if (marketingProjError) {
      console.error('❌ 获取智能营销项目失败:', marketingProjError);
    } else {
      console.log(`✅ 智能营销项目总数: ${marketingProjects?.length || 0}`);
      console.log('📋 前5个智能营销项目:');
      marketingProjects?.slice(0, 5).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name}`);
        console.log(`     主分类: ${project.primary_category} (${project.primary_category_code})`);
        console.log(`     次分类: ${project.secondary_category} (${project.secondary_category_code})`);
      });
    }

    // 3. 检查教育学习项目统计
    console.log('📚 检查教育学习项目...');
    const { data: educationProjects, error: educationProjError } = await supabase
      .from('user_projects')
      .select('id, name, primary_category, secondary_category, primary_category_code, secondary_category_code')
      .eq('primary_category', '教育学习');

    if (educationProjError) {
      console.error('❌ 获取教育学习项目失败:', educationProjError);
    } else {
      console.log(`✅ 教育学习项目总数: ${educationProjects?.length || 0}`);
      console.log('📋 前5个教育学习项目:');
      educationProjects?.slice(0, 5).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name}`);
        console.log(`     主分类: ${project.primary_category} (${project.primary_category_code})`);
        console.log(`     次分类: ${project.secondary_category} (${project.secondary_category_code})`);
      });
    }

    // 4. 检查是否还有未知分类
    console.log('❓ 检查剩余未知分类...');
    const { data: unknownProjects, error: unknownError } = await supabase
      .from('user_projects')
      .select('id, name, primary_category, secondary_category')
      .eq('primary_category', '未知分类');

    if (unknownError) {
      console.error('❌ 获取未知分类项目失败:', unknownError);
    } else {
      console.log(`📊 剩余未知分类项目: ${unknownProjects?.length || 0} 个`);
      if (unknownProjects && unknownProjects.length > 0) {
        unknownProjects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name}`);
        });
      }
    }

    // 5. 总体分类统计
    console.log('📊 总体分类统计...');
    const { data: allStats, error: statsError } = await supabase
      .from('user_projects')
      .select('primary_category')
      .not('primary_category', 'is', null)
      .not('primary_category', 'eq', '');

    if (statsError) {
      console.error('❌ 获取统计数据失败:', statsError);
    } else {
      const categoryStats: { [key: string]: number } = {};
      allStats?.forEach(project => {
        const category = project.primary_category || '无分类';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      });

      console.log('📈 各分类项目数量:');
      Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`  - ${category}: ${count} 个`);
        });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '分类统计检查完成',
        statistics: {
          marketingCategories: marketingCategories?.length || 0,
          marketingProjects: marketingProjects?.length || 0,
          educationProjects: educationProjects?.length || 0,
          unknownProjects: unknownProjects?.length || 0,
          totalWithCategory: allStats?.length || 0
        }
      })
    };

  } catch (error) {
    console.error('❌ 程序执行失败:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '程序执行失败', 
        details: error instanceof Error ? error.message : String(error) 
      })
    };
  }
}; 