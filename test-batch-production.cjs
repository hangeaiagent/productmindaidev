#!/usr/bin/env node

/**
 * 批量生产模板内容测试脚本
 */

// 使用内置fetch或node-fetch
let fetch;
try {
  // 尝试使用Node.js 18+的内置fetch
  if (global.fetch) {
    fetch = global.fetch;
  } else {
    fetch = require('node-fetch');
  }
} catch (e) {
  // 如果都没有，使用简单的http请求替代
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');
  
  fetch = async (url, options = {}) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const method = options.method || 'GET';
    
    return new Promise((resolve, reject) => {
      const req = client.request(url, { method, headers: options.headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => JSON.parse(data),
            text: () => data
          });
        });
      });
      
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  };
}

const config = {
  baseUrl: 'http://localhost:8888/.netlify/functions',
  batchSize: 2
};

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  data: (msg) => console.log(`📊 ${msg}`)
};

async function testBatchProduction() {
  try {
    log.info('开始测试批量生产模板内容功能...');

    // 1. 干预模式测试
    log.info('步骤 1: 执行干预模式测试');
    const dryRunUrl = `${config.baseUrl}/batch-production-templates?dry_run=true&batch_size=${config.batchSize}`;
    
    const dryRunResponse = await fetch(dryRunUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!dryRunResponse.ok) {
      throw new Error(`干预模式测试失败: ${dryRunResponse.status}`);
    }

    const dryRunResult = await dryRunResponse.json();
    log.success('干预模式测试成功');
    log.data(`可用模板: ${dryRunResult.templates || 0}`);
    log.data(`可用项目: ${dryRunResult.projects || 0}`);
    log.data(`总任务数: ${dryRunResult.totalTasks || 0}`);

    if (dryRunResult.totalTasks === 0) {
      log.warning('没有待处理任务，请检查数据');
      return;
    }

    // 2. 实际生产测试
    log.info('步骤 2: 执行小批量实际生产测试');
    const productionUrl = `${config.baseUrl}/batch-production-templates?batch_size=1`;
    
    const productionResponse = await fetch(productionUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!productionResponse.ok) {
      throw new Error(`生产测试失败: ${productionResponse.status}`);
    }

    const productionResult = await productionResponse.json();
    log.success('生产测试完成');
    
    if (productionResult.stats) {
      log.data(`总任务: ${productionResult.stats.total}`);
      log.data(`成功: ${productionResult.stats.success}`);
      log.data(`失败: ${productionResult.stats.failed}`);
      
      if (productionResult.stats.results?.length > 0) {
        log.info('详细结果:');
        productionResult.stats.results.forEach((result, i) => {
          if (result.success) {
            log.success(`${i + 1}. ${result.projectName} + ${result.templateName}`);
            if (result.generated) {
              log.data(`   英文: ${result.generated.outputContentEn?.length || 0} 字符`);
              log.data(`   中文: ${result.generated.outputContentZh?.length || 0} 字符`);
            }
          } else {
            log.error(`${i + 1}. ${result.projectName} + ${result.templateName} -> ${result.error}`);
          }
        });
      }
    }

    log.success('测试完成！');

  } catch (error) {
    log.error(`测试失败: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 批量生产模板内容测试脚本\n');
  
  try {
    const response = await fetch('http://localhost:8888', { timeout: 3000 });
    log.success('服务正在运行');
  } catch (error) {
    log.error('服务未启动，请先运行: npx netlify dev --port 8888');
    process.exit(1);
  }

  await testBatchProduction();
}

if (require.main === module) {
  main();
}
