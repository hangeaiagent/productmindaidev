import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// AIbase分类映射 - 按页面顺序
const categoryMapping = {
  "图像处理": ["图片背景移除", "图片无损放大", "图片AI修复", "图像生成", "Ai图片拓展", "Ai漫画生成", "Ai生成写真", "电商图片制作", "Ai图像转视频"],
  "视频创作": ["视频剪辑", "生成视频", "Ai动画制作", "字幕生成"],
  "效率助手": ["AI文档工具", "PPT", "思维导图", "表格处理", "Ai办公助手"],
  "写作灵感": ["文案写作", "论文写作"],
  "艺术灵感": ["语音克隆", "设计创作", "Ai图标生成"],
  "趣味": ["Ai名字生成器", "游戏娱乐", "其他"],
  "开发编程": ["开发编程", "Ai开放平台", "Ai算力平台"],
  "聊天机器人": ["智能聊天", "智能客服"],
  "翻译": ["翻译"],
  "教育学习": ["教育学习"],
  "智能营销": ["智能营销"]
};

export const handler: Handler = async (event, context) => {
  console.log('🚀 开始导入分类数据并更新项目编码...');

  try {
    // 1. 检查并清空分类表
    console.log('🗑️ 清空现有分类数据...');
    const { error: deleteError } = await supabase
      .from('user_projectscategory')
      .delete()
      .gte('id', 0); // 删除所有记录

    if (deleteError) {
      console.error('❌ 清空分类数据失败:', deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '清空分类数据失败', details: deleteError })
      };
    }

    console.log('✅ 分类数据已清空');

    // 2. 插入一级分类
    console.log('📥 插入一级分类...');
    const primaryCategories = Object.keys(categoryMapping);
    let primaryOrder = 10;

    const primaryInserts = [];
    for (const category of primaryCategories) {
      const categoryCode = primaryOrder.toString().padStart(2, '0');
      
      primaryInserts.push({
        category_code: categoryCode,
        category_name: category,
        parent_category_code: null,
        category_level: 1,
        sort_order: primaryOrder
      });

      console.log(`✅ 准备插入一级分类: ${categoryCode} - ${category}`);
      primaryOrder += 10;
    }

    // 批量插入一级分类
    const { error: primaryError } = await supabase
      .from('user_projectscategory')
      .insert(primaryInserts);

    if (primaryError) {
      console.error('❌ 插入一级分类失败:', primaryError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '插入一级分类失败', details: primaryError })
      };
    }

    console.log(`✅ 成功插入 ${primaryInserts.length} 个一级分类`);

    // 3. 插入二级分类
    console.log('📥 插入二级分类...');
    primaryOrder = 10;
    
    const secondaryInserts = [];
    for (const [primaryCategory, secondaryList] of Object.entries(categoryMapping)) {
      const primaryCode = primaryOrder.toString().padStart(2, '0');
      let secondaryOrder = 10;

      for (const secondaryCategory of secondaryList) {
        const secondaryCode = `${primaryCode}${secondaryOrder.toString().padStart(2, '0')}`;
        
        secondaryInserts.push({
          category_code: secondaryCode,
          category_name: secondaryCategory,
          parent_category_code: primaryCode,
          category_level: 2,
          sort_order: parseInt(secondaryCode)
        });

        console.log(`✅ 准备插入二级分类: ${secondaryCode} - ${secondaryCategory} (父级: ${primaryCode})`);
        secondaryOrder += 10;
      }

      primaryOrder += 10;
    }

    // 批量插入二级分类
    const { error: secondaryError } = await supabase
      .from('user_projectscategory')
      .insert(secondaryInserts);

    if (secondaryError) {
      console.error('❌ 插入二级分类失败:', secondaryError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '插入二级分类失败', details: secondaryError })
      };
    }

    console.log(`✅ 成功插入 ${secondaryInserts.length} 个二级分类`);

    // 4. 获取分类映射表
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

    // 创建分类名称到编码的映射
    const categoryNameToCode = {};
    categories.forEach(cat => {
      categoryNameToCode[cat.category_name] = cat.category_code;
    });

    console.log('📊 分类映射创建完成');

    // 5. 更新user_projects表的分类编码
    console.log('🔄 开始更新项目分类编码...');

    // 获取所有项目
    const { data: projects, error: projectError } = await supabase
      .from('user_projects')
      .select('id, primary_category, secondary_category');

    if (projectError) {
      console.error('❌ 获取项目数据失败:', projectError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取项目数据失败', details: projectError })
      };
    }

    console.log(`📊 找到 ${projects.length} 个项目需要更新编码`);

    let updatedCount = 0;
    let notFoundCategories = new Set();

    // 分批更新项目
    const batchSize = 100;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      for (const project of batch) {
        const updateData: any = {};
        
        // 查找主分类编码
        if (project.primary_category && categoryNameToCode[project.primary_category]) {
          updateData.primary_category_code = categoryNameToCode[project.primary_category];
        } else if (project.primary_category) {
          notFoundCategories.add(`主分类: ${project.primary_category}`);
        }

        // 查找次分类编码
        if (project.secondary_category && categoryNameToCode[project.secondary_category]) {
          updateData.secondary_category_code = categoryNameToCode[project.secondary_category];
        } else if (project.secondary_category) {
          notFoundCategories.add(`次分类: ${project.secondary_category}`);
        }

        // 如果有更新的编码，则更新项目
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('user_projects')
            .update(updateData)
            .eq('id', project.id);

          if (updateError) {
            console.error(`❌ 更新项目 ${project.id} 失败:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }

      // 显示进度
      console.log(`📈 进度: ${Math.min(i + batchSize, projects.length)}/${projects.length} (已更新: ${updatedCount})`);
    }

    // 6. 统计结果
    const { data: finalCategories, error: finalError } = await supabase
      .from('user_projectscategory')
      .select('*')
      .order('sort_order');

    if (finalError) {
      console.error('❌ 获取最终分类结构失败:', finalError);
    }

    const primaryCount = finalCategories?.filter(c => c.category_level === 1).length || 0;
    const secondaryCount = finalCategories?.filter(c => c.category_level === 2).length || 0;

    // 7. 生成分类结构展示
    const categoryStructure = [];
    if (finalCategories) {
      finalCategories.forEach(cat => {
        if (cat.category_level === 1) {
          const subCategories = finalCategories.filter(sub => 
            sub.parent_category_code === cat.category_code
          );
          
          categoryStructure.push({
            code: cat.category_code,
            name: cat.category_name,
            level: 1,
            children: subCategories.map(sub => ({
              code: sub.category_code,
              name: sub.category_name,
              level: 2
            }))
          });
        }
      });
    }

    console.log('🎉 数据导入和更新完成！');
    console.log(`📊 统计: ${primaryCount} 个一级分类, ${secondaryCount} 个二级分类`);
    console.log(`📈 项目更新: ${updatedCount}/${projects.length} 个项目已更新编码`);

    if (notFoundCategories.size > 0) {
      console.log('\n⚠️ 未找到匹配的分类编码:');
      notFoundCategories.forEach(cat => console.log(`  - ${cat}`));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '分类数据导入和项目编码更新完成',
        statistics: {
          primaryCategories: primaryCount,
          secondaryCategories: secondaryCount,
          totalCategories: primaryCount + secondaryCount,
          projectsTotal: projects.length,
          projectsUpdated: updatedCount,
          notFoundCategories: Array.from(notFoundCategories)
        },
        categoryStructure: categoryStructure
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