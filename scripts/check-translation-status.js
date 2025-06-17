import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 请配置Supabase环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 检查分类翻译状态
async function checkTranslationStatus() {
  console.log('🔍 检查分类翻译状态...\n');

  try {
    // 查询所有分类记录
    const { data: allCategories, error: allError } = await supabase
      .from('user_projectscategory')
      .select('id, category_name, category_name_en, category_code, category_level')
      .order('category_level')
      .order('id');

    if (allError) {
      console.error('❌ 查询分类数据失败:', allError);
      return;
    }

    if (!allCategories || allCategories.length === 0) {
      console.log('⚠️ 没有找到任何分类记录');
      return;
    }

    // 统计分析
    const stats = {
      total: allCategories.length,
      hasEnglish: 0,
      needsTranslation: 0,
      chinese: 0,
      nonChinese: 0
    };

    const needsTranslation = [];
    const hasEnglish = [];

    // 中文检测正则
    const chineseRegex = /[\u4e00-\u9fff]/;

    allCategories.forEach(category => {
      const { id, category_name, category_name_en, category_code, category_level } = category;
      
      // 检查是否包含中文
      if (chineseRegex.test(category_name)) {
        stats.chinese++;
      } else {
        stats.nonChinese++;
      }

      // 检查是否有英文名称
      if (category_name_en && category_name_en.trim() !== '') {
        stats.hasEnglish++;
        hasEnglish.push({
          id,
          category_name,
          category_name_en,
          category_code,
          category_level
        });
      } else {
        stats.needsTranslation++;
        needsTranslation.push({
          id,
          category_name,
          category_code,
          category_level,
          containsChinese: chineseRegex.test(category_name)
        });
      }
    });

    // 输出统计结果
    console.log('📊 分类翻译状态统计:');
    console.log('=====================================');
    console.log(`总分类数: ${stats.total}`);
    console.log(`已有英文名称: ${stats.hasEnglish} (${((stats.hasEnglish / stats.total) * 100).toFixed(1)}%)`);
    console.log(`需要翻译: ${stats.needsTranslation} (${((stats.needsTranslation / stats.total) * 100).toFixed(1)}%)`);
    console.log(`包含中文: ${stats.chinese}`);
    console.log(`非中文: ${stats.nonChinese}`);

    // 显示需要翻译的记录
    if (needsTranslation.length > 0) {
      console.log('\n🔄 需要翻译的分类记录:');
      console.log('=====================================');
      needsTranslation.forEach((category, index) => {
        const chineseStatus = category.containsChinese ? '🇨🇳' : '🌐';
        console.log(`${index + 1}. [${category.category_code}] ${chineseStatus} ${category.category_name} (级别: ${category.category_level})`);
      });
    }

    // 显示已有英文名称的记录（前10条）
    if (hasEnglish.length > 0) {
      console.log('\n✅ 已有英文名称的分类记录 (前10条):');
      console.log('=====================================');
      hasEnglish.slice(0, 10).forEach((category, index) => {
        console.log(`${index + 1}. [${category.category_code}] ${category.category_name} -> ${category.category_name_en}`);
      });
      
      if (hasEnglish.length > 10) {
        console.log(`... 还有 ${hasEnglish.length - 10} 条记录`);
      }
    }

    // 按级别统计
    console.log('\n📈 按级别统计:');
    console.log('=====================================');
    const levelStats = {};
    allCategories.forEach(category => {
      const level = category.category_level;
      if (!levelStats[level]) {
        levelStats[level] = { total: 0, hasEnglish: 0, needsTranslation: 0 };
      }
      levelStats[level].total++;
      if (category.category_name_en && category.category_name_en.trim() !== '') {
        levelStats[level].hasEnglish++;
      } else {
        levelStats[level].needsTranslation++;
      }
    });

    Object.keys(levelStats).sort().forEach(level => {
      const stat = levelStats[level];
      console.log(`级别 ${level}: 总数 ${stat.total}, 已翻译 ${stat.hasEnglish}, 待翻译 ${stat.needsTranslation}`);
    });

    console.log('\n💡 执行翻译命令:');
    console.log('=====================================');
    console.log('curl -X POST https://your-domain.netlify.app/.netlify/functions/translate-category-names');
    console.log('或者运行: npm run translate-categories');

  } catch (error) {
    console.error('❌ 检查翻译状态失败:', error);
  }
}

// 主函数
async function main() {
  await checkTranslationStatus();
}

main().catch(console.error); 