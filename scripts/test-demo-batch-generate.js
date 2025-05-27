const API_BASE = 'http://localhost:8888';

async function testAPI(url, description) {
  try {
    console.log(`\n🧪 测试: ${description}`);
    console.log(`📡 请求: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ 成功: ${data.message}`);
      if (data.statistics) {
        console.log(`📊 统计信息:`, JSON.stringify(data.statistics, null, 2));
      }
      if (data.generatedItems && data.generatedItems.length > 0) {
        console.log(`📝 生成的内容预览:`);
        data.generatedItems.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.projectName} - ${item.templateName}`);
          console.log(`     预览: ${item.contentPreview.substring(0, 100)}...`);
        });
      }
      if (data.errors && data.errors.length > 0) {
        console.log(`⚠️ 错误列表:`, data.errors);
      }
      return data;
    } else {
      console.log(`❌ 失败: ${data.error}`);
      if (data.details) {
        console.log(`📋 详情: ${data.details}`);
      }
      return null;
    }
  } catch (error) {
    console.log(`💥 网络错误: ${error.message}`);
    return null;
  }
}

async function testDemoBatchGenerate() {
  console.log('🚀 开始测试演示版本批量生成模板功能\n');
  
  const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
  
  // 1. 测试中文演示批量生成
  console.log('='.repeat(50));
  console.log('📝 测试中文演示批量生成');
  console.log('='.repeat(50));
  
  const zhResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates-demo?user_id=${DEFAULT_USER_ID}&lang=zh`,
    '中文演示批量生成模板'
  );
  
  // 2. 测试英文演示批量生成
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试英文演示批量生成');
  console.log('='.repeat(50));
  
  const enResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates-demo?user_id=${DEFAULT_USER_ID}&lang=en`,
    '英文演示批量生成模板'
  );
  
  // 3. 测试演示API路由
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试演示API路由');
  console.log('='.repeat(50));
  
  const apiResult = await testAPI(
    `${API_BASE}/api/demo/batch-generate?user_id=${DEFAULT_USER_ID}&lang=zh`,
    '演示API路由批量生成'
  );
  
  // 4. 测试网页路由
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试演示网页路由');
  console.log('='.repeat(50));
  
  const webResult = await testAPI(
    `${API_BASE}/demo/batch-generate?user_id=${DEFAULT_USER_ID}&lang=zh`,
    '演示网页路由批量生成'
  );
  
  // 5. 测试错误处理
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试错误处理');
  console.log('='.repeat(50));
  
  const langErrorResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates-demo?user_id=${DEFAULT_USER_ID}&lang=invalid`,
    '无效语言参数测试'
  );
  
  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 演示测试总结');
  console.log('='.repeat(60));
  
  console.log('✅ 中文演示批量生成:', zhResult ? '成功' : '失败');
  console.log('✅ 英文演示批量生成:', enResult ? '成功' : '失败');
  console.log('✅ 演示API路由测试:', apiResult ? '成功' : '失败');
  console.log('✅ 演示网页路由测试:', webResult ? '成功' : '失败');
  console.log('✅ 参数验证测试:', langErrorResult !== null ? '正常' : '异常');
  
  if (zhResult && zhResult.statistics) {
    console.log('\n📈 演示批量生成统计:');
    console.log(`- 总项目数: ${zhResult.statistics.totalProjects}`);
    console.log(`- 总模板数: ${zhResult.statistics.totalTemplates}`);
    console.log(`- 需要生成: ${zhResult.statistics.totalToGenerate || 0}`);
    console.log(`- 成功生成: ${zhResult.statistics.successCount || 0}`);
    console.log(`- 生成失败: ${zhResult.statistics.failedCount || 0}`);
    console.log(`- 跳过数量: ${zhResult.statistics.totalSkipped || 0}`);
  }
  
  console.log('\n🎉 演示批量生成测试完成！');
  console.log('\n📚 演示功能说明:');
  console.log('该演示版本使用模拟数据，展示批量生成的完整流程:');
  console.log('- 3个模拟项目: AI智能客服系统、RaqiAI设计营销平台、智能数据分析工具');
  console.log('- 5个模拟模板: PRD、MRD、技术架构、商业模式画布、用户体验地图');
  console.log('- 智能跳过已生成的版本，只生成缺失的模板');
  console.log('- 支持中英双语生成');
  console.log('\n📍 访问路径:');
  console.log('1. 演示函数: /.netlify/functions/batch-generate-templates-demo');
  console.log('2. 演示API: /api/demo/batch-generate');
  console.log('3. 演示网页: /demo/batch-generate');
  console.log('4. 英文版本: 在路径前加 /en');
  console.log('\n🔧 参数说明:');
  console.log('- user_id: 用户ID (可选，默认为演示用户)');
  console.log('- lang: 语言 (zh/en，默认为zh)');
  
  if (zhResult && zhResult.generatedItems) {
    console.log(`\n📄 本次生成了 ${zhResult.generatedItems.length} 个模板文档`);
    console.log('这些文档可以作为产品管理的参考模板使用。');
  }
}

// 运行测试
testDemoBatchGenerate().catch(console.error); 