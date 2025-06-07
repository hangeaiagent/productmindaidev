#!/usr/bin/env node

/**
 * 安全的本地测试脚本
 * 使用更短的超时时间和更小的批次
 */

const http = require('http');

function makeRequest(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

async function testLocalSafe() {
  try {
    console.log('🧪 开始安全的本地测试...');
    
    // 第一步：测试演示模式
    console.log('\n📋 第一步：测试演示模式');
    const demoUrl = 'http://localhost:8888/.netlify/functions/batch-generate-templates?demo=true&languages=zh';
    console.log('🔗 请求URL:', demoUrl);
    
    let startTime = Date.now();
    let result = await makeRequest(demoUrl, 15000);
    let endTime = Date.now();
    
    console.log(`⏱️ 演示模式执行时间: ${endTime - startTime}ms`);
    console.log('📊 演示模式结果:', {
      success: result.success,
      mode: result.mode,
      project: result.project
    });
    
    if (!result.success) {
      console.log('❌ 演示模式失败，停止测试');
      return;
    }
    
    console.log('✅ 演示模式成功！');
    
    // 第二步：测试超短时间的真实生成
    console.log('\n🤖 第二步：测试超短时间真实生成');
    const realUrl = 'http://localhost:8888/.netlify/functions/batch-generate-templates?user_id=afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1&languages=zh&limit=1&batch_size=1&template_batch_size=1&max_time=8000&table=user_projects';
    console.log('🔗 请求URL:', realUrl);
    
    startTime = Date.now();
    try {
      result = await makeRequest(realUrl, 12000); // 12秒超时
      endTime = Date.now();
      
      console.log(`⏱️ 真实测试执行时间: ${endTime - startTime}ms`);
      console.log('📊 真实测试结果:', {
        success: result.success,
        generated: result.generated,
        skipped: result.skipped,
        errors: result.errors,
        timeout_reached: result.timeout_reached
      });
      
      if (result.success) {
        console.log('✅ 本地测试成功！');
        
        if (result.timeout_reached) {
          console.log('⚠️ 达到了超时限制，这是正常的');
          console.log('💡 建议：使用演示模式或生产环境进行大规模生成');
        }
      } else {
        console.log('❌ 本地测试失败:', result.error);
      }
    } catch (realError) {
      console.log('❌ 本地测试异常:', realError.message);
      
      if (realError.message.includes('请求超时')) {
        console.log('💡 这是正常的：AI生成需要较长时间');
        console.log('💡 解决方案：');
        console.log('   1. 使用生产环境: node scripts/production-batch-executor.cjs');
        console.log('   2. 使用演示模式进行功能测试');
        console.log('   3. 检查DeepSeek API密钥是否正确配置');
      }
    }
    
    // 第三步：测试新的定时函数（如果可用）
    console.log('\n🕐 第三步：测试定时函数');
    const scheduledUrl = 'http://localhost:8888/.netlify/functions/scheduled-batch-generator?languages=zh&limit=1';
    console.log('🔗 请求URL:', scheduledUrl);
    
    try {
      startTime = Date.now();
      result = await makeRequest(scheduledUrl, 10000);
      endTime = Date.now();
      
      console.log(`⏱️ 定时函数执行时间: ${endTime - startTime}ms`);
      console.log('📊 定时函数结果:', {
        success: result.success,
        has_more_data: result.has_more_data,
        current_batch: result.current_batch
      });
      
      if (result.success) {
        console.log('✅ 定时函数测试成功！');
      }
    } catch (scheduledError) {
      console.log('❌ 定时函数测试失败:', scheduledError.message);
      console.log('💡 可能原因：函数还未部署或正在部署中');
    }
    
  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 建议：确保开发服务器正在运行 (npx netlify dev --port 8888)');
    }
  }
}

// 运行测试
testLocalSafe(); 