import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8888/.netlify/functions/aibase-quick-category-crawler';

// 34个分类ID列表
const CATEGORY_IDS = [
  // 图像处理 (9个)
  '37-49', '37-50', '37-51', '37-52', '37-53', '37-54', '37-55', '37-83', '37-86',
  // 视频创作 (4个)
  '38-56', '38-57', '38-58', '38-84',
  // 效率助手 (5个)
  '39-59', '39-60', '39-61', '39-62', '39-63',
  // 写作灵感 (2个)
  '40-64', '40-88',
  // 艺术灵感 (3个)
  '41-65', '41-66', '41-67',
  // 趣味 (3个)
  '42-68', '42-71', '42-72',
  // 开发编程 (3个)
  '43-73', '43-74', '43-75',
  // 聊天机器人 (2个)
  '44-76', '44-77',
  // 翻译 (1个)
  '46-79',
  // 教育学习 (1个)
  '47-80',
  // 智能营销 (1个)
  '48-81'
];

async function crawlCategory(categoryId, maxProducts = 5) {
  try {
    console.log(`🔍 开始采集分类: ${categoryId}`);
    
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categoryId,
        maxProducts
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 分类 ${result.category} 采集完成:`);
      console.log(`   📊 找到产品: ${result.totalFound}`);
      console.log(`   💾 保存产品: ${result.totalSaved}`);
      
      if (result.products && result.products.length > 0) {
        console.log(`   📝 产品列表:`);
        result.products.forEach((product, index) => {
          console.log(`      ${index + 1}. ${product.name}`);
        });
      }
      
      return {
        success: true,
        categoryId,
        category: result.category,
        totalFound: result.totalFound,
        totalSaved: result.totalSaved
      };
    } else {
      console.log(`❌ 分类 ${categoryId} 采集失败: ${result.error}`);
      return {
        success: false,
        categoryId,
        error: result.error
      };
    }
  } catch (error) {
    console.log(`❌ 分类 ${categoryId} 采集异常: ${error.message}`);
    return {
      success: false,
      categoryId,
      error: error.message
    };
  }
}

async function runFullCrawl() {
  console.log('🚀 开始AIbase快速分类采集...');
  console.log(`📊 预计采集 ${CATEGORY_IDS.length} 个分类`);
  
  const results = [];
  let totalFound = 0;
  let totalSaved = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < CATEGORY_IDS.length; i++) {
    const categoryId = CATEGORY_IDS[i];
    
    console.log(`\n📂 [${i + 1}/${CATEGORY_IDS.length}] 处理分类: ${categoryId}`);
    
    const result = await crawlCategory(categoryId, 5); // 每个分类最多5个产品
    results.push(result);
    
    if (result.success) {
      successCount++;
      totalFound += result.totalFound || 0;
      totalSaved += result.totalSaved || 0;
    } else {
      failCount++;
    }
    
    // 分类间延迟，避免请求过快
    if (i < CATEGORY_IDS.length - 1) {
      console.log('⏳ 等待 2 秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 输出最终统计
  console.log('\n🎉 AIbase分类采集完成!');
  console.log('📊 最终统计:');
  console.log(`   ✅ 成功分类: ${successCount}/${CATEGORY_IDS.length}`);
  console.log(`   ❌ 失败分类: ${failCount}/${CATEGORY_IDS.length}`);
  console.log(`   📊 总计发现产品: ${totalFound}`);
  console.log(`   💾 总计保存产品: ${totalSaved}`);
  console.log(`   📈 成功率: ${((successCount / CATEGORY_IDS.length) * 100).toFixed(1)}%`);
  
  // 输出失败的分类
  const failedCategories = results.filter(r => !r.success);
  if (failedCategories.length > 0) {
    console.log('\n❌ 失败的分类:');
    failedCategories.forEach(result => {
      console.log(`   ${result.categoryId}: ${result.error}`);
    });
  }
  
  // 输出成功的分类统计
  const successfulCategories = results.filter(r => r.success);
  if (successfulCategories.length > 0) {
    console.log('\n✅ 成功的分类:');
    successfulCategories.forEach(result => {
      console.log(`   ${result.category} (${result.categoryId}): ${result.totalSaved} 个产品`);
    });
  }
}

// 运行采集
runFullCrawl().catch(error => {
  console.error('❌ 运行失败:', error);
  process.exit(1);
});