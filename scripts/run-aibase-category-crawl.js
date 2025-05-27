import fetch from 'node-fetch';

const NETLIFY_FUNCTION_URL = 'http://localhost:8888/.netlify/functions/aibase-category-crawler';

async function runAIbaseCategoryCrawl() {
  console.log('🚀 开始AIbase分类采集...');
  console.log('📊 预计采集11个一级分类，32个二级分类');
  
  try {
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('🎉 AIbase分类采集完成！');
      console.log('\n📊 采集统计:');
      console.log(`- 一级分类: ${result.statistics.totalCategories}个`);
      console.log(`- 二级分类: ${result.statistics.totalSubcategories}个`);
      console.log(`- 处理产品: ${result.statistics.totalProcessed}个`);
      console.log(`- 保存成功: ${result.statistics.totalSaved}个`);
      
      console.log('\n📂 分类详情:');
      result.statistics.categories.forEach(category => {
        console.log(`\n${category.name} (${category.subcategoryCount}个子分类):`);
        category.subcategories.forEach(sub => {
          console.log(`  - ${sub}`);
        });
      });
      
      if (result.sampleProducts && result.sampleProducts.length > 0) {
        console.log('\n🔍 示例产品:');
        result.sampleProducts.slice(0, 5).forEach((product, index) => {
          console.log(`${index + 1}. ${product.name}`);
          console.log(`   分类: ${product.category} > ${product.subcategory}`);
          console.log(`   描述: ${product.description.substring(0, 100)}...`);
          console.log(`   网址: ${product.officialWebsite || '未知'}`);
          console.log('');
        });
      }
      
    } else {
      console.error('❌ 采集失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 运行失败:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 请确保Netlify Dev服务器正在运行:');
      console.log('   npx netlify dev --port 8888');
    }
  }
}

// 运行采集
runAIbaseCategoryCrawl(); 