import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event, context) => {
  console.log('🔧 开始更新项目分类映射...');

  try {
    // 1. 更新一级分类为"未知分类"的项目改为"智能营销"
    console.log('📝 第一步: 将"未知分类"改为"智能营销"...');
    const { data: unknownProjects, error: unknownError } = await supabase
      .from('user_projects')
      .select('id, name')
      .eq('primary_category', '未知分类');

    if (unknownError) {
      console.error('❌ 获取未知分类项目失败:', unknownError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取未知分类项目失败', details: unknownError })
      };
    }

    console.log(`📊 找到 ${unknownProjects?.length || 0} 个未知分类项目`);

    if (unknownProjects && unknownProjects.length > 0) {
      const { error: updateUnknownError } = await supabase
        .from('user_projects')
        .update({
          primary_category: '智能营销',
          secondary_category: '智能营销',
          primary_category_code: '110',
          secondary_category_code: '11010'
        })
        .eq('primary_category', '未知分类');

      if (updateUnknownError) {
        console.error('❌ 更新未知分类项目失败:', updateUnknownError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: '更新未知分类项目失败', details: updateUnknownError })
        };
      }

      console.log(`✅ 成功将 ${unknownProjects.length} 个未知分类项目改为智能营销`);
    }

    // 2. 简化智能营销的二级分类表
    console.log('📝 第二步: 简化智能营销分类表...');
    
    // 删除智能营销的其他二级分类，只保留一个"智能营销"
    const { error: deleteSubCategoriesError } = await supabase
      .from('user_projectscategory')
      .delete()
      .eq('parent_category_code', '110')
      .neq('category_name', '智能营销');

    if (deleteSubCategoriesError) {
      console.error('❌ 删除智能营销子分类失败:', deleteSubCategoriesError);
    } else {
      console.log('✅ 智能营销子分类已简化');
    }

    // 确保有一个智能营销的二级分类
    const { data: existingMarketingSubCat } = await supabase
      .from('user_projectscategory')
      .select('*')
      .eq('category_code', '11010');

    if (!existingMarketingSubCat || existingMarketingSubCat.length === 0) {
      const { error: insertMarketingError } = await supabase
        .from('user_projectscategory')
        .insert({
          category_code: '11010',
          category_name: '智能营销',
          parent_category_code: '110',
          category_level: 2,
          sort_order: 11010
        });

      if (insertMarketingError) {
        console.error('❌ 插入智能营销二级分类失败:', insertMarketingError);
      } else {
        console.log('✅ 智能营销二级分类已添加');
      }
    }

    // 更新所有智能营销项目的二级分类编码
    const { error: updateMarketingCodesError } = await supabase
      .from('user_projects')
      .update({
        secondary_category: '智能营销',
        secondary_category_code: '11010'
      })
      .eq('primary_category', '智能营销');

    if (updateMarketingCodesError) {
      console.error('❌ 更新智能营销项目编码失败:', updateMarketingCodesError);
    } else {
      console.log('✅ 智能营销项目编码已统一');
    }

    // 3. 处理二级分类为"教育学习"的项目
    console.log('📝 第三步: 处理教育学习分类...');
    const { data: educationProjects, error: educationError } = await supabase
      .from('user_projects')
      .select('id, name, primary_category')
      .eq('secondary_category', '教育学习');

    if (educationError) {
      console.error('❌ 获取教育学习项目失败:', educationError);
    } else {
      console.log(`📊 找到 ${educationProjects?.length || 0} 个教育学习项目`);

      if (educationProjects && educationProjects.length > 0) {
        const { error: updateEducationError } = await supabase
          .from('user_projects')
          .update({
            primary_category: '教育学习',
            primary_category_code: '100'
          })
          .eq('secondary_category', '教育学习');

        if (updateEducationError) {
          console.error('❌ 更新教育学习项目失败:', updateEducationError);
        } else {
          console.log(`✅ 成功更新 ${educationProjects.length} 个教育学习项目的一级分类`);
        }
      }
    }

    // 4. 验证结果
    console.log('📊 验证更新结果...');
    const { data: finalStats, error: statsError } = await supabase
      .from('user_projects')
      .select('primary_category, secondary_category, primary_category_code, secondary_category_code')
      .in('primary_category', ['智能营销', '教育学习']);

    if (statsError) {
      console.error('❌ 获取统计数据失败:', statsError);
    } else {
      const marketingCount = finalStats?.filter(p => p.primary_category === '智能营销').length || 0;
      const educationCount = finalStats?.filter(p => p.primary_category === '教育学习').length || 0;
      
      console.log(`📈 最终统计:`);
      console.log(`  - 智能营销项目: ${marketingCount} 个`);
      console.log(`  - 教育学习项目: ${educationCount} 个`);
    }

    console.log('🎉 项目分类映射更新完成！');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '项目分类映射更新完成',
        statistics: {
          unknownToMarketing: unknownProjects?.length || 0,
          educationUpdated: educationProjects?.length || 0,
          finalMarketing: finalStats?.filter(p => p.primary_category === '智能营销').length || 0,
          finalEducation: finalStats?.filter(p => p.primary_category === '教育学习').length || 0
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