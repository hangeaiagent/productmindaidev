#!/usr/bin/env node

/**
 * 生产环境快速测试脚本
 * 域名: http://productmindai.com
 */

const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 35000,
      headers: {
        'User-Agent': 'ProductMindAI-TestClient/1.0'
      }
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

async function testProduction() {
  try {
    console.log('🧪 开始测试生产环境...');
    console.log('🌐 域名: http://productmindai.com');
    
    // 第一步：测试演示模式
    console.log('\n📋 第一步：测试演示模式');
    const demoUrl = 'http://productmindai.com/.netlify/functions/batch-generate-templates?demo=true&languages=zh,en';
    console.log('🔗 请求URL:', demoUrl);
    
    let startTime = Date.now();
    let result = await makeRequest(demoUrl);
    let endTime = Date.now();
    
    console.log(`⏱️ 演示模式执行时间: ${endTime - startTime}ms`);
    console.log('📊 演示模式结果:', {
      success: result.success,
      mode: result.mode,
      project: result.project,
      content_length_zh: result.content_length_zh,
      content_length_en: result.content_length_en
    });
    
    if (!result.success) {
      console.log('❌ 演示模式失败，停止测试');
      return;
    }
    
    console.log('✅ 演示模式成功！');
    
    // 第二步：测试真实批量生成
    console.log('\n🤖 第二步：测试真实批量生成');
    const realUrl = 'http://productmindai.com/.netlify/functions/batch-generate-templates?user_id=afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1&languages=zh&limit=1&batch_size=1&template_batch_size=1&max_time=25000&table=user_projects';
    console.log('🔗 请求URL:', realUrl);
    
    startTime = Date.now();
    try {
      result = await makeRequest(realUrl);
      endTime = Date.now();
      
      console.log(`⏱️ 真实测试执行时间: ${endTime - startTime}ms`);
      console.log('📊 真实测试结果:', {
        success: result.success,
        generated: result.generated,
        skipped: result.skipped,
        errors: result.errors,
        execution_time: result.execution_time,
        timeout_reached: result.timeout_reached
      });
      
      if (result.success) {
        console.log('✅ 生产环境测试成功！');
        console.log('🎉 可以开始执行大规模批量生成任务');
      } else {
        console.log('❌ 生产环境测试失败:', result.error);
      }
    } catch (realError) {
      console.log('❌ 生产环境测试异常:', realError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 建议：检查域名是否正确或网络连接');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 建议：检查生产环境服务是否正常运行');
    }
  }
}

// 运行测试
testProduction(); 