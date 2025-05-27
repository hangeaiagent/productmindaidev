import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase环境变量');
  process.exit(1);
}

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

async function createCategoryTableIfNotExists() {
  console.log('🚀 检查并创建分类表...');

  // 检查表是否存在
  const { data: existingData, error: checkError } = await supabase
    .from('user_projectscategory')
    .select('count')
    .limit(1);

  if (!checkError) {
    console.log('📋 分类表已存在，将清空数据重新插入...');
    
    // 删除所有现有数据
    const { error: deleteError } = await supabase
      .from('user_projectscategory')
      .delete()
      .neq('id', 0); // 删除所有记录

    if (deleteError) {
      console.error('❌ 清空分类表失败:', deleteError);
      return false;
    }
    
    console.log('✅ 分类表数据已清空');
    return true;
  }

  console.log('📋 分类表不存在，需要先创建表结构');
  console.log('请先在Supabase后台执行以下SQL创建表：');
  console.log(`
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

-- 添加外键约束（如果需要）
-- ALTER TABLE user_projectscategory 
-- ADD CONSTRAINT fk_parent_category 
-- FOREIGN KEY (parent_category_code) REFERENCES user_projectscategory(category_code) ON DELETE CASCADE;
  `);
  
  return false;
}

async function insertPrimaryCategories() {
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
      return false;
    }

    console.log(`✅ 插入一级分类: ${categoryCode} - ${category}`);
    primaryOrder += 10;
  }

  return true;
}

async function insertSecondaryCategories() {
  console.log('📥 插入二级分类...');

  let primaryOrder = 10;
  
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
        return false;
      }

      console.log(`✅ 插入二级分类: ${secondaryCode} - ${secondaryCategory} (父级: ${primaryCode})`);
      secondaryOrder += 10;
    }

    primaryOrder += 10;
  }

  return true;
}

async function analyzeExistingCategories() {
  console.log('🔍 分析现有项目分类...');

  // 获取不重复的主分类
  const { data: primaryCategories, error: primaryError } = await supabase
    .from('user_projects')
    .select('primary_category')
    .not('primary_category', 'is', null);

  if (primaryError) {
    console.error('❌ 获取主分类失败:', primaryError);
    return;
  }

  // 获取不重复的次分类
  const { data: secondaryCategories, error: secondaryError } = await supabase
    .from('user_projects')
    .select('secondary_category')
    .not('secondary_category', 'is', null);

  if (secondaryError) {
    console.error('❌ 获取次分类失败:', secondaryError);
    return;
  }

  // 统计分类
  const primarySet = new Set();
  const secondarySet = new Set();

  primaryCategories.forEach(item => {
    if (item.primary_category) {
      primarySet.add(item.primary_category);
    }
  });

  secondaryCategories.forEach(item => {
    if (item.secondary_category) {
      secondarySet.add(item.secondary_category);
    }
  });

  console.log('\n📊 现有数据分析:');
  console.log('=====================================');
  console.log(`主分类数量: ${primarySet.size}`);
  console.log('主分类列表:', Array.from(primarySet).sort());
  console.log(`\n次分类数量: ${secondarySet.size}`);
  console.log('次分类列表:', Array.from(secondarySet).sort());
}

async function updateExistingProjects() {
  console.log('🔄 更新现有项目的分类编码...');

  // 获取所有项目
  const { data: projects, error: fetchError } = await supabase
    .from('user_projects')
    .select('id, primary_category, secondary_category');

  if (fetchError) {
    console.error('❌ 获取项目数据失败:', fetchError);
    return false;
  }

  console.log(`📊 找到 ${projects.length} 个项目需要更新`);

  // 获取分类映射
  const { data: categories, error: categoryError } = await supabase
    .from('user_projectscategory')
    .select('category_code, category_name, category_level');

  if (categoryError) {
    console.error('❌ 获取分类数据失败:', categoryError);
    return false;
  }

  // 创建分类名称到编码的映射
  const categoryNameToCode = {};
  categories.forEach(cat => {
    categoryNameToCode[cat.category_name] = cat.category_code;
  });

  let updatedCount = 0;
  let notFoundCategories = new Set();

  for (const project of projects) {
    let primaryCode = null;
    let secondaryCode = null;

    // 查找主分类编码
    if (project.primary_category) {
      if (categoryNameToCode[project.primary_category]) {
        primaryCode = categoryNameToCode[project.primary_category];
      } else {
        notFoundCategories.add(`主分类: ${project.primary_category}`);
      }
    }

    // 查找次分类编码
    if (project.secondary_category) {
      if (categoryNameToCode[project.secondary_category]) {
        secondaryCode = categoryNameToCode[project.secondary_category];
      } else {
        notFoundCategories.add(`次分类: ${project.secondary_category}`);
      }
    }

    // 如果找到了编码，更新项目
    if (primaryCode || secondaryCode) {
      const updateData = {};
      if (primaryCode) updateData.primary_category_code = primaryCode;
      if (secondaryCode) updateData.secondary_category_code = secondaryCode;

      const { error: updateError } = await supabase
        .from('user_projects')
        .update(updateData)
        .eq('id', project.id);

      if (updateError) {
        console.error(`❌ 更新项目 ${project.id} 失败:`, updateError);
      } else {
        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`✅ 已更新 ${updatedCount} 个项目...`);
        }
      }
    }
  }

  console.log(`✅ 项目更新完成，共更新了 ${updatedCount} 个项目`);
  
  if (notFoundCategories.size > 0) {
    console.log('\n⚠️ 未找到匹配的分类编码:');
    notFoundCategories.forEach(cat => console.log(`  - ${cat}`));
  }

  return true;
}

async function displayCategoryStructure() {
  console.log('📋 显示分类结构...');

  const { data: categories, error } = await supabase
    .from('user_projectscategory')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('❌ 获取分类结构失败:', error);
    return;
  }

  console.log('\n📊 分类结构:');
  console.log('=====================================');

  categories.forEach(cat => {
    if (cat.category_level === 1) {
      console.log(`${cat.category_code} - ${cat.category_name} (一级分类)`);
      
      // 显示该一级分类下的二级分类
      const subCategories = categories.filter(sub => 
        sub.parent_category_code === cat.category_code
      );
      
      subCategories.forEach(sub => {
        console.log(`  └─ ${sub.category_code} - ${sub.category_name} (二级分类)`);
      });
      console.log('');
    }
  });

  console.log(`总计: ${categories.filter(c => c.category_level === 1).length} 个一级分类, ${categories.filter(c => c.category_level === 2).length} 个二级分类`);
}

async function main() {
  try {
    console.log('🚀 开始建立产品分类系统...\n');

    // 0. 分析现有分类数据
    await analyzeExistingCategories();

    // 1. 检查并创建分类表
    const tableReady = await createCategoryTableIfNotExists();
    if (!tableReady) {
      console.error('❌ 分类表未准备好，请先创建表结构');
      return;
    }

    // 2. 插入一级分类
    const primaryInserted = await insertPrimaryCategories();
    if (!primaryInserted) {
      console.error('❌ 一级分类插入失败，退出程序');
      return;
    }

    // 3. 插入二级分类
    const secondaryInserted = await insertSecondaryCategories();
    if (!secondaryInserted) {
      console.error('❌ 二级分类插入失败，退出程序');
      return;
    }

    // 4. 更新现有项目
    const projectsUpdated = await updateExistingProjects();
    if (!projectsUpdated) {
      console.error('❌ 项目更新失败');
    }

    // 5. 显示分类结构
    await displayCategoryStructure();

    console.log('\n🎉 产品分类系统建立完成！');
    console.log('📊 分类表: user_projectscategory');
    console.log('📋 字段说明:');
    console.log('  - category_code: 分类编码（主键）');
    console.log('  - category_name: 分类名称');
    console.log('  - parent_category_code: 上级分类编码（空值表示一级分类）');
    console.log('  - category_level: 分类级别（1=一级，2=二级）');
    console.log('  - sort_order: 排序顺序');
    console.log('\n📝 分类编码规则:');
    console.log('  - 一级分类: 10, 20, 30, ...');
    console.log('  - 二级分类: 1010, 1020, 1030, ...');

  } catch (error) {
    console.error('❌ 程序执行失败:', error);
  }
}

// 运行主程序
main(); 