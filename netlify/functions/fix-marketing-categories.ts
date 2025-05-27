import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 智能营销的合理二级分类
const marketingSubCategories = [
  "SEO优化",
  "内容营销", 
  "社交媒体营销",
  "邮件营销",
  "客户关系管理",
  "数据分析",
  "广告投放",
  "营销自动化"
];

interface CategoryInsert {
  category_code: string;
  category_name: string;
  parent_category_code: string;
  category_level: number;
  sort_order: number;
}

export const handler: Handler = async (event, context) => {
  console.log('🔧 开始修复智能营销分类结构...');

  try {
    // 1. 删除现有的智能营销二级分类（重复的分类名）
    console.log('🗑️ 删除重复的智能营销二级分类...');
    const { error: deleteError } = await supabase
      .from('user_projectscategory')
      .delete()
      .eq('category_code', '11010')
      .eq('category_name', '智能营销')
      .eq('category_level', 2);

    if (deleteError) {
      console.error('❌ 删除重复分类失败:', deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '删除重复分类失败', details: deleteError })
      };
    }

    console.log('✅ 重复的智能营销二级分类已删除');

    // 2. 插入新的智能营销二级分类
    console.log('📥 插入新的智能营销二级分类...');
    const parentCode = '110'; // 智能营销一级分类编码
    let subOrder = 10;

    const newSubCategories: CategoryInsert[] = [];
    for (const subCategory of marketingSubCategories) {
      const subCode = `${parentCode}${subOrder.toString().padStart(2, '0')}`;
      
      newSubCategories.push({
        category_code: subCode,
        category_name: subCategory,
        parent_category_code: parentCode,
        category_level: 2,
        sort_order: parseInt(subCode)
      });

      console.log(`✅ 准备插入: ${subCode} - ${subCategory}`);
      subOrder += 10;
    }

    const { error: insertError } = await supabase
      .from('user_projectscategory')
      .insert(newSubCategories);

    if (insertError) {
      console.error('❌ 插入新分类失败:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '插入新分类失败', details: insertError })
      };
    }

    console.log(`✅ 成功插入 ${newSubCategories.length} 个智能营销二级分类`);

    // 3. 更新现有项目的分类编码
    console.log('🔄 更新项目分类编码...');
    
    // 查找有"智能营销"分类的项目，将其二级分类改为"营销自动化"（通用分类）
    const { data: marketingProjects, error: projectError } = await supabase
      .from('user_projects')
      .select('id')
      .or('primary_category.eq.智能营销,secondary_category.eq.智能营销');

    if (projectError) {
      console.error('❌ 获取营销项目失败:', projectError);
    } else if (marketingProjects && marketingProjects.length > 0) {
      console.log(`📊 找到 ${marketingProjects.length} 个智能营销项目`);
      
      // 将二级分类统一设为"营销自动化"（11080）
      const { error: updateError } = await supabase
        .from('user_projects')
        .update({
          primary_category_code: '110',
          secondary_category_code: '11080' // 营销自动化
        })
        .eq('primary_category', '智能营销');

      if (updateError) {
        console.error('❌ 更新项目编码失败:', updateError);
      } else {
        console.log('✅ 项目编码更新完成');
      }
    }

    // 4. 验证结果
    const { data: finalCategories, error: verifyError } = await supabase
      .from('user_projectscategory')
      .select('*')
      .eq('parent_category_code', '110')
      .order('sort_order');

    if (verifyError) {
      console.error('❌ 验证结果失败:', verifyError);
    }

    console.log('🎉 智能营销分类结构修复完成！');
    console.log('📊 新的智能营销二级分类:');
    finalCategories?.forEach(cat => {
      console.log(`  - ${cat.category_code}: ${cat.category_name}`);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '智能营销分类结构修复完成',
        newSubCategories: finalCategories,
        statistics: {
          deletedDuplicates: 1,
          addedSubCategories: newSubCategories.length,
          updatedProjects: marketingProjects?.length || 0
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