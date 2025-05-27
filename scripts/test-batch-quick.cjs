#!/usr/bin/env node

/**
 * 快速测试批量生成功能
 * 使用最小的批次大小和超时设置
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
      timeout: 35000
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

async function testBatchGeneration() {
  try {
    console.log('🧪 开始快速测试批量生成功能...');
    
    // 第一步：测试演示模式（不调用AI）
    console.log('\n📋 第一步：测试演示模式（模拟内容）');
    const demoParams = {
      demo: 'true',
      languages: 'zh,en',
      templates: '0a6f134b-44f0-496b-b396-04ba2c9daa96'
    };
    
    let queryParams = new URLSearchParams(demoParams);
    let url = `http://localhost:8888/.netlify/functions/batch-generate-templates?${queryParams.toString()}`;
    
    console.log('🔗 演示模式URL:', url);
    
    let startTime = Date.now();
    let result = await makeRequest(url);
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
    
    // 第二步：测试真实AI生成（使用最小配置）
    console.log('\n🤖 第二步：测试真实AI生成（最小配置）');
    const realParams = {
      user_id: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      languages: 'zh', // 只测试中文，减少时间
      templates: '0a6f134b-44f0-496b-b396-04ba2c9daa96',
      limit: 1,  // 只处理1个项目
      batch_size: 1,  // 每批1个项目
      template_batch_size: 1,  // 每批1个模板
      max_time: 12000,  // 12秒超时
      table: 'user_projects'
    };
    
    queryParams = new URLSearchParams(realParams);
    url = `http://localhost:8888/.netlify/functions/batch-generate-templates?${queryParams.toString()}`;
    
    console.log('📋 真实测试参数:', realParams);
    console.log('🔗 真实测试URL:', url);
    
    startTime = Date.now();
    try {
      result = await makeRequest(url);
      endTime = Date.now();
      
      console.log(`⏱️ 真实测试执行时间: ${endTime - startTime}ms`);
      console.log('📊 真实测试结果:', {
        success: result.success,
        generated: result.generated,
        skipped: result.skipped,
        errors: result.errors,
        execution_time: result.execution_time,
        timeout_reached: result.timeout_reached,
        batch_completed: result.batch_completed
      });
      
      if (result.success) {
        console.log('✅ 真实测试成功！批量生成功能正常工作');
        
        if (result.generated > 0) {
          console.log('🎉 成功生成了新的模板内容');
        } else if (result.skipped > 0) {
          console.log('⏭️ 跳过了已存在的模板（这是正常的）');
        }
        
        if (result.timeout_reached) {
          console.log('⚠️ 达到了超时限制，但这是预期的行为');
        }
      } else {
        console.log('❌ 真实测试失败:', result.error);
      }
    } catch (realError) {
      console.log('❌ 真实测试异常:', realError.message);
      
      if (realError.message.includes('请求超时')) {
        console.log('💡 建议：AI生成可能需要更长时间，这是正常的');
        console.log('💡 解决方案：使用分批处理脚本处理大量数据');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 建议：确保开发服务器正在运行 (npx netlify dev --port 8888)');
    }
  }
}

// 运行测试
testBatchGeneration(); 