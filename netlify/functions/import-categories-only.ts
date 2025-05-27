import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// AIbase分类映射 - 按页面顺序，智能营销已修复
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
  "智能营销": ["SEO优化", "内容营销", "社交媒体营销", "邮件营销", "客户关系管理", "数据分析", "广告投放", "营销自动化"]
};

export const handler: Handler = async (event, context) => {
  console.log('🚀 开始导入分类数据...');

  try {
    // 1. 清空现有分类数据
    console.log('🗑️ 清空现有分类数据...');
    const { error: deleteError } = await supabase
      .from('user_projectscategory')
      .delete()
      .gte('id', 0);

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

    // 4. 获取并展示分类结构
    const { data: categories, error: fetchError } = await supabase
      .from('user_projectscategory')
      .select('*')
      .order('sort_order');

    if (fetchError) {
      console.error('❌ 获取分类结构失败:', fetchError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '获取分类结构失败', details: fetchError })
      };
    }

    const primaryCount = categories.filter(c => c.category_level === 1).length;
    const secondaryCount = categories.filter(c => c.category_level === 2).length;

    console.log('🎉 分类数据导入完成！');
    console.log(`📊 统计: ${primaryCount} 个一级分类, ${secondaryCount} 个二级分类`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '分类数据导入完成',
        statistics: {
          primaryCategories: primaryCount,
          secondaryCategories: secondaryCount,
          totalCategories: categories.length
        },
        categories: categories
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