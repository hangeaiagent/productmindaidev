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
        console.log(`📊 统计信息:`, data.statistics);
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

async function testBatchGenerate() {
  console.log('🚀 开始测试批量生成模板功能\n');
  
  const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
  
  // 1. 测试中文批量生成
  console.log('='.repeat(50));
  console.log('📝 测试中文批量生成');
  console.log('='.repeat(50));
  
  const zhResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates?user_id=${DEFAULT_USER_ID}&lang=zh`,
    '中文批量生成模板'
  );
  
  // 2. 测试英文批量生成
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试英文批量生成');
  console.log('='.repeat(50));
  
  const enResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates?user_id=${DEFAULT_USER_ID}&lang=en`,
    '英文批量生成模板'
  );
  
  // 3. 测试API路由
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试API路由');
  console.log('='.repeat(50));
  
  const apiResult = await testAPI(
    `${API_BASE}/api/batch-generate?user_id=${DEFAULT_USER_ID}&lang=zh`,
    'API路由批量生成'
  );
  
  // 4. 测试错误处理
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试错误处理');
  console.log('='.repeat(50));
  
  const errorResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates?user_id=invalid-user&lang=zh`,
    '无效用户ID测试'
  );
  
  // 5. 测试无效语言参数
  const langErrorResult = await testAPI(
    `${API_BASE}/.netlify/functions/batch-generate-templates?user_id=${DEFAULT_USER_ID}&lang=invalid`,
    '无效语言参数测试'
  );
  
  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  
  console.log('✅ 中文批量生成:', zhResult ? '成功' : '失败');
  console.log('✅ 英文批量生成:', enResult ? '成功' : '失败');
  console.log('✅ API路由测试:', apiResult ? '成功' : '失败');
  console.log('✅ 错误处理测试:', errorResult !== null ? '正常' : '异常');
  console.log('✅ 参数验证测试:', langErrorResult !== null ? '正常' : '异常');
  
  if (zhResult && zhResult.statistics) {
    console.log('\n📈 批量生成统计:');
    console.log(`- 总项目数: ${zhResult.statistics.totalProjects}`);
    console.log(`- 总模板数: ${zhResult.statistics.totalTemplates}`);
    console.log(`- 需要生成: ${zhResult.statistics.totalToGenerate || 0}`);
    console.log(`- 成功生成: ${zhResult.statistics.successCount || 0}`);
    console.log(`- 生成失败: ${zhResult.statistics.failedCount || 0}`);
    console.log(`- 跳过数量: ${zhResult.statistics.totalSkipped || 0}`);
  }
  
  console.log('\n🎉 批量生成测试完成！');
  console.log('\n📚 使用说明:');
  console.log('1. 中文批量生成: GET /.netlify/functions/batch-generate-templates?lang=zh');
  console.log('2. 英文批量生成: GET /.netlify/functions/batch-generate-templates?lang=en');
  console.log('3. 指定用户: 添加参数 &user_id=USER_ID');
  console.log('4. API路由: GET /api/batch-generate?lang=zh');
  console.log('5. 网页路由: 访问 /batch-generate 或 /en/batch-generate');
}

// 运行测试
testBatchGenerate().catch(console.error); 