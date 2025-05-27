import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event, context) => {
  console.log('🚀 开始更新项目分类编码...');
  
  // 设置较短的超时时间
  const startTime = Date.now();
  const maxExecutionTime = 25000; // 25秒

  try {
    // 1. 获取分类映射表
    console.log('📊 获取分类映射表...');
    const { data: categories, error: fetchError } = await supabase
      .from('user_projectscategory')
      .select('category_code, category_name, category_level');

    if (fetchError) {
      console.error('❌ 获取分类数据失败:', fetchError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取分类数据失败', details: fetchError })
      };
    }

    if (!categories || categories.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '分类表为空，请先导入分类数据' })
      };
    }

    // 创建分类名称到编码的映射
    const categoryNameToCode: Record<string, string> = {};
    categories.forEach(cat => {
      categoryNameToCode[cat.category_name] = cat.category_code;
    });

    console.log(`✅ 获取到 ${categories.length} 个分类映射`);

    // 2. 获取需要更新的项目 (限制数量以避免超时)
    console.log('📋 获取项目数据...');
    const { data: projects, error: projectError } = await supabase
      .from('user_projects')
      .select('id, primary_category, secondary_category, primary_category_code, secondary_category_code')
      .limit(100); // 限制为100个项目

    if (projectError) {
      console.error('❌ 获取项目数据失败:', projectError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取项目数据失败', details: projectError })
      };
    }

    console.log(`📊 本次处理 ${projects.length} 个项目`);

    // 3. 更新项目分类编码
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const notFoundCategories = new Set<string>();

    // 减小批处理大小
    const batchSize = 10;
    for (let i = 0; i < projects.length; i += batchSize) {
      // 检查超时
      if (Date.now() - startTime > maxExecutionTime) {
        console.log('⏰ 达到最大执行时间，停止处理');
        break;
      }

      const batch = projects.slice(i, i + batchSize);
      
      for (const project of batch) {
        const updateData: any = {};
        let hasUpdates = false;
        
        // 处理主分类编码
        if (project.primary_category) {
          if (categoryNameToCode[project.primary_category]) {
            const newPrimaryCode = categoryNameToCode[project.primary_category];
            if (project.primary_category_code !== newPrimaryCode) {
              updateData.primary_category_code = newPrimaryCode;
              hasUpdates = true;
            }
          } else {
            notFoundCategories.add(`主分类: ${project.primary_category}`);
          }
        }

        // 处理次分类编码
        if (project.secondary_category) {
          if (categoryNameToCode[project.secondary_category]) {
            const newSecondaryCode = categoryNameToCode[project.secondary_category];
            if (project.secondary_category_code !== newSecondaryCode) {
              updateData.secondary_category_code = newSecondaryCode;
              hasUpdates = true;
            }
          } else {
            notFoundCategories.add(`次分类: ${project.secondary_category}`);
          }
        }

        // 如果有更新的编码，则更新项目
        if (hasUpdates && Object.keys(updateData).length > 0) {
          try {
            const { error: updateError } = await supabase
              .from('user_projects')
              .update(updateData)
              .eq('id', project.id);

            if (updateError) {
              console.error(`❌ 更新项目 ${project.id} 失败:`, updateError);
              errorCount++;
            } else {
              console.log(`✅ 更新项目 ${project.id}: 主分类=${updateData.primary_category_code || '无'}, 次分类=${updateData.secondary_category_code || '无'}`);
              updatedCount++;
            }
          } catch (error) {
            console.error(`❌ 更新项目 ${project.id} 异常:`, error);
            errorCount++;
          }
        } else {
          skippedCount++;
        }
      }

      // 显示进度
      const processed = Math.min(i + batchSize, projects.length);
      console.log(`📈 进度: ${processed}/${projects.length} (更新: ${updatedCount}, 跳过: ${skippedCount}, 错误: ${errorCount})`);
    }

    // 4. 简单统计
    console.log('🎉 项目分类编码更新完成！');
    console.log(`📈 统计结果:`);
    console.log(`  - 处理项目数: ${projects.length}`);
    console.log(`  - 成功更新: ${updatedCount}`);
    console.log(`  - 跳过更新: ${skippedCount}`);
    console.log(`  - 更新失败: ${errorCount}`);

    const result = {
      success: true,
      message: '项目分类编码更新完成',
      statistics: {
        processedProjects: projects.length,
        updatedProjects: updatedCount,
        skippedProjects: skippedCount,
        errorProjects: errorCount,
        notFoundCategories: Array.from(notFoundCategories)
      }
    };

    if (notFoundCategories.size > 0) {
      console.log('\n⚠️ 未找到匹配的分类编码:');
      notFoundCategories.forEach(cat => console.log(`  - ${cat}`));
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
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