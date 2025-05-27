import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// AIbase分类映射 - 按页面顺序
const categoryMapping = {
  // 一级分类及其对应的二级分类
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
  console.log('🚀 开始创建分类表系统...');

  try {
    // 1. 创建分类表
    console.log('📋 创建分类表...');
    
    // 首先删除表（如果存在）
    const dropTableSQL = `DROP TABLE IF EXISTS user_projectscategory CASCADE;`;
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropTableSQL
    });
    
    if (dropError) {
      console.log('⚠️ 删除表时出现错误:', dropError.message);
    }

    // 创建新表
    const createTableSQL = `
      CREATE TABLE user_projectscategory (
        id SERIAL PRIMARY KEY,
        category_code VARCHAR(10) NOT NULL UNIQUE,
        category_name VARCHAR(100) NOT NULL,
        parent_category_code VARCHAR(10),
        category_level INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_user_projectscategory_parent ON user_projectscategory(parent_category_code);
      CREATE INDEX idx_user_projectscategory_level ON user_projectscategory(category_level);
      CREATE INDEX idx_user_projectscategory_sort ON user_projectscategory(sort_order);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (createError) {
      console.error('❌ 创建表失败:', createError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '创建表失败', details: createError })
      };
    }

    console.log('✅ 分类表创建成功');

    // 2. 插入一级分类
    console.log('📥 插入一级分类...');
    const primaryCategories = Object.keys(categoryMapping);
    let primaryOrder = 10;

    for (const category of primaryCategories) {
      const categoryCode = primaryOrder.toString().padStart(2, '0');
      
      const { error } = await supabase
        .from('user_projectscategory')
        .insert([{
          category_code: categoryCode,
          category_name: category,
          parent_category_code: null,
          category_level: 1,
          sort_order: primaryOrder
        }]);

      if (error) {
        console.error(`❌ 插入一级分类 ${category} 失败:`, error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `插入一级分类 ${category} 失败`, details: error })
        };
      }

      console.log(`✅ 插入一级分类: ${categoryCode} - ${category}`);
      primaryOrder += 10;
    }

    // 3. 插入二级分类
    console.log('📥 插入二级分类...');
    primaryOrder = 10;
    
    for (const [primaryCategory, secondaryList] of Object.entries(categoryMapping)) {
      const primaryCode = primaryOrder.toString().padStart(2, '0');
      let secondaryOrder = 10;

      for (const secondaryCategory of secondaryList) {
        const secondaryCode = `${primaryCode}${secondaryOrder.toString().padStart(2, '0')}`;
        
        const { error } = await supabase
          .from('user_projectscategory')
          .insert([{
            category_code: secondaryCode,
            category_name: secondaryCategory,
            parent_category_code: primaryCode,
            category_level: 2,
            sort_order: parseInt(secondaryCode)
          }]);

        if (error) {
          console.error(`❌ 插入二级分类 ${secondaryCategory} 失败:`, error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: `插入二级分类 ${secondaryCategory} 失败`, details: error })
          };
        }

        console.log(`✅ 插入二级分类: ${secondaryCode} - ${secondaryCategory} (父级: ${primaryCode})`);
        secondaryOrder += 10;
      }

      primaryOrder += 10;
    }

    // 4. 获取分类结构
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

    // 5. 统计信息
    const primaryCount = categories.filter(c => c.category_level === 1).length;
    const secondaryCount = categories.filter(c => c.category_level === 2).length;

    console.log('🎉 分类系统创建完成！');
    console.log(`📊 统计: ${primaryCount} 个一级分类, ${secondaryCount} 个二级分类`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '分类系统创建完成',
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