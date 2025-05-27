import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ProjectSample {
  primary_category: string;
  secondary_category: string;
  primary_category_code: string;
  secondary_category_code: string;
}

interface MappingResult {
  index: number;
  primary_category: string;
  primary_expected: string | null;
  primary_actual: string;
  primary_match: boolean;
  secondary_category: string;
  secondary_expected: string | null;
  secondary_actual: string;
  secondary_match: boolean;
}

export const handler: Handler = async (event, context) => {
  console.log('🔍 检查项目分类编码状态...');

  try {
    // 1. 检查分类表状态
    console.log('📊 检查分类表...');
    const { data: categories, error: categoryError } = await supabase
      .from('user_projectscategory')
      .select('category_code, category_name, category_level')
      .order('sort_order');

    if (categoryError) {
      console.error('❌ 获取分类数据失败:', categoryError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取分类数据失败', details: categoryError })
      };
    }

    const primaryCategories = categories?.filter(c => c.category_level === 1) || [];
    const secondaryCategories = categories?.filter(c => c.category_level === 2) || [];

    console.log(`✅ 分类表: ${primaryCategories.length} 个一级分类, ${secondaryCategories.length} 个二级分类`);

    // 2. 检查项目编码状态
    console.log('📋 检查项目编码状态...');
    const { data: projectStats, error: statsError } = await supabase
      .from('user_projects')
      .select('primary_category, secondary_category, primary_category_code, secondary_category_code')
      .limit(20);

    if (statsError) {
      console.error('❌ 获取项目数据失败:', statsError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取项目数据失败', details: statsError })
      };
    }

    // 统计编码状态
    let hasAllCodes = 0;
    let hasPrimaryOnly = 0;
    let hasSecondaryOnly = 0;
    let hasNoCodes = 0;
    let hasText = 0;

    const sampleProjects: ProjectSample[] = [];

    projectStats?.forEach((project, index) => {
      if (index < 10) { // 只显示前10个作为样本
        sampleProjects.push({
          primary_category: project.primary_category || '',
          secondary_category: project.secondary_category || '',
          primary_category_code: project.primary_category_code || '',
          secondary_category_code: project.secondary_category_code || ''
        });
      }

      // 统计
      if (project.primary_category || project.secondary_category) {
        hasText++;
      }

      if (project.primary_category_code && project.secondary_category_code) {
        hasAllCodes++;
      } else if (project.primary_category_code) {
        hasPrimaryOnly++;
      } else if (project.secondary_category_code) {
        hasSecondaryOnly++;
      } else {
        hasNoCodes++;
      }
    });

    console.log(`📈 编码统计 (前${projectStats?.length || 0}个项目):`);
    console.log(`  - 有文本分类: ${hasText}`);
    console.log(`  - 双编码完整: ${hasAllCodes}`);
    console.log(`  - 仅主编码: ${hasPrimaryOnly}`);
    console.log(`  - 仅次编码: ${hasSecondaryOnly}`);
    console.log(`  - 无编码: ${hasNoCodes}`);

    // 3. 创建分类映射用于检查
    const categoryNameToCode: Record<string, string> = {};
    categories?.forEach(cat => {
      categoryNameToCode[cat.category_name] = cat.category_code;
    });

    // 检查映射情况
    const mappingResults: MappingResult[] = [];
    sampleProjects.forEach((project, index) => {
      const primaryMatch = project.primary_category ? categoryNameToCode[project.primary_category] : null;
      const secondaryMatch = project.secondary_category ? categoryNameToCode[project.secondary_category] : null;
      
      mappingResults.push({
        index: index + 1,
        primary_category: project.primary_category,
        primary_expected: primaryMatch,
        primary_actual: project.primary_category_code,
        primary_match: primaryMatch === project.primary_category_code,
        secondary_category: project.secondary_category,
        secondary_expected: secondaryMatch,
        secondary_actual: project.secondary_category_code,
        secondary_match: secondaryMatch === project.secondary_category_code
      });
    });

    console.log('\n📋 样本项目映射检查:');
    mappingResults.forEach(result => {
      console.log(`项目 ${result.index}:`);
      console.log(`  主分类: "${result.primary_category}" → 期望: ${result.primary_expected}, 实际: ${result.primary_actual}, 匹配: ${result.primary_match}`);
      console.log(`  次分类: "${result.secondary_category}" → 期望: ${result.secondary_expected}, 实际: ${result.secondary_actual}, 匹配: ${result.secondary_match}`);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '分类编码状态检查完成',
        categoryStats: {
          primaryCategories: primaryCategories.length,
          secondaryCategories: secondaryCategories.length,
          totalCategories: categories?.length || 0
        },
        projectStats: {
          sampleSize: projectStats?.length || 0,
          hasText,
          hasAllCodes,
          hasPrimaryOnly,
          hasSecondaryOnly,
          hasNoCodes
        },
        sampleProjects: mappingResults,
        categoryMapping: Object.keys(categoryNameToCode).slice(0, 10) // 前10个分类映射
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