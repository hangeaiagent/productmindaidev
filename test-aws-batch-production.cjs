#!/usr/bin/env node

/**
 * AWS Backend 批量生产模板内容测试脚本
 */

const http = require('http');
const { URL } = require('url');

const config = {
  awsBackendUrl: 'http://localhost:3000'
};

async function fetch(url, options = {}) {
  const urlObj = new URL(url);
  const method = options.method || 'GET';
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, { 
      method, 
      headers: { 'Content-Type': 'application/json', ...options.headers }
    }, (res) => {
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
}

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  data: (msg) => console.log(`📊 ${msg}`)
};

async function testBatchProduction() {
  try {
    log.info('开始测试AWS Backend批量生产功能...');

    // 检查服务状态
    log.info('检查aws-backend服务状态');
    try {
      const response = await fetch(`${config.awsBackendUrl}/health`);
      if (response.ok) {
        log.success('aws-backend服务正在运行');
      } else {
        throw new Error('服务状态异常');
      }
    } catch (error) {
      log.error('aws-backend服务未启动，请先启动服务');
      log.error('在aws-backend目录下运行: npm start');
      return;
    }

    // 干预模式测试
    log.info('执行干预模式测试');
    const dryRunResponse = await fetch(`${config.awsBackendUrl}/api/batch/batch-production`, {
      method: 'POST',
      body: JSON.stringify({
        dryRun: true,
        batchSize: 2,
        limitProjects: 3,
        limitTemplates: 2
      })
    });

    if (dryRunResponse.ok) {
      const result = await dryRunResponse.json();
      log.success('干预模式测试成功');
      log.data(`总任务数: ${result.data?.stats?.total || 0}`);
    } else {
      log.error(`干预模式测试失败: ${dryRunResponse.status}`);
    }

    // 实际生产测试（小批量）
    log.info('执行小批量实际生产测试');
    const productionResponse = await fetch(`${config.awsBackendUrl}/api/batch/batch-production`, {
      method: 'POST',
      body: JSON.stringify({
        dryRun: false,
        batchSize: 1,
        limitProjects: 1,
        limitTemplates: 1
      })
    });

    if (productionResponse.ok) {
      const result = await productionResponse.json();
      log.success('实际生产测试完成');
      log.data(`成功: ${result.data?.stats?.generated || 0}`);
      log.data(`失败: ${result.data?.stats?.failed || 0}`);
    } else {
      log.error(`实际生产测试失败: ${productionResponse.status}`);
    }

    log.success('测试完成！');

  } catch (error) {
    log.error(`测试失败: ${error.message}`);
  }
}

testBatchProduction();
