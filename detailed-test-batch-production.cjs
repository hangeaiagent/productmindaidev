#!/usr/bin/env node

/**
 * 详细的AWS Backend 批量生产模板内容测试脚本
 * 包含详细日志、性能分析和错误监控
 */

const http = require('http');
const { URL } = require('url');

const config = {
  awsBackendUrl: 'http://localhost:3000'
};

async function fetch(url, options = {}) {
  const startTime = Date.now();
  const method = options.method || 'GET';
  
  log.debug(`📡 发起请求: ${method} ${url}`);
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, { 
      method, 
      headers: { 'Content-Type': 'application/json', ...options.headers }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        log.debug(`📡 请求完成: ${res.statusCode} (${duration}ms)`);
        
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => JSON.parse(data),
          text: () => data,
          duration
        });
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      log.error(`📡 请求失败: ${error.message} (${duration}ms)`);
      reject(error);
    });
    
    if (options.body) {
      log.debug(`📤 请求数据: ${options.body}`);
      req.write(options.body);
    }
    req.end();
  });
}

const log = {
  info: (msg) => console.log(`${getTimestamp()} ℹ️  ${msg}`),
  success: (msg) => console.log(`${getTimestamp()} ✅ ${msg}`),
  error: (msg) => console.log(`${getTimestamp()} ❌ ${msg}`),
  warn: (msg) => console.log(`${getTimestamp()} ⚠️  ${msg}`),
  debug: (msg) => console.log(`${getTimestamp()} 🔍 ${msg}`),
  data: (msg) => console.log(`${getTimestamp()} 📊 ${msg}`),
  perf: (msg, duration) => console.log(`${getTimestamp()} ⏱️  ${msg} (${duration}ms)`)
};

function getTimestamp() {
  return new Date().toISOString().substr(11, 12);
}

async function sleep(ms) {
  log.debug(`😴 等待 ${ms}ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServiceHealth() {
  const startTime = Date.now();
  try {
    log.info('检查aws-backend服务健康状态...');
    const response = await fetch(`${config.awsBackendUrl}/health`);
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const healthData = await response.json();
      log.success(`服务健康检查通过 (${duration}ms)`);
      log.data(`服务器信息: PID=${healthData.pid}, 运行时间=${Math.round(healthData.uptime)}s`);
      log.data(`内存使用: ${Math.round(healthData.memory.heapUsed/1024/1024)}MB / ${Math.round(healthData.memory.heapTotal/1024/1024)}MB`);
      return true;
    } else {
      log.error(`健康检查失败: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`服务连接失败 (${duration}ms): ${error.message}`);
    return false;
  }
}

async function testDryRun() {
  const startTime = Date.now();
  log.info('🧪 开始干预模式测试...');
  
  try {
    const requestData = {
      dryRun: true,
      batchSize: 2,
      limitProjects: 3,
      limitTemplates: 2
    };
    
    log.debug(`请求参数: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await fetch(`${config.awsBackendUrl}/api/batch/batch-production`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      log.success(`干预模式测试完成 (${duration}ms)`);
      
      if (result.data) {
        log.data(`统计信息:`);
        log.data(`  - 总任务数: ${result.data.stats?.total || 0}`);
        log.data(`  - 生成: ${result.data.stats?.generated || 0}`);
        log.data(`  - 跳过: ${result.data.stats?.skipped || 0}`);
        log.data(`  - 失败: ${result.data.stats?.failed || 0}`);
        log.data(`  - 执行时间: ${result.data.execution?.duration || 'N/A'}`);
        
        if (result.data.details && result.data.details.length > 0) {
          log.data(`详细信息:`);
          result.data.details.slice(0, 3).forEach((detail, index) => {
            log.data(`  ${index + 1}. 项目: ${detail.projectName} | 模板: ${detail.templateName} | 状态: ${detail.status}`);
          });
        }
      } else {
        log.warn('响应中缺少数据字段');
        log.debug(`完整响应: ${JSON.stringify(result, null, 2)}`);
      }
      
      return true;
    } else {
      log.error(`干预模式测试失败: HTTP ${response.status}`);
      const errorText = await response.text();
      log.error(`错误详情: ${errorText}`);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`干预模式测试异常 (${duration}ms): ${error.message}`);
    return false;
  }
}

async function testActualProduction() {
  const startTime = Date.now();
  log.info('🚀 开始实际生产测试（小批量）...');
  
  try {
    const requestData = {
      dryRun: false,
      batchSize: 1,
      limitProjects: 1,
      limitTemplates: 1
    };
    
    log.debug(`请求参数: ${JSON.stringify(requestData, null, 2)}`);
    log.warn('注意: 这将进行实际的AI内容生成，可能需要较长时间...');
    
    const response = await fetch(`${config.awsBackendUrl}/api/batch/batch-production`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      log.success(`实际生产测试完成 (${duration}ms)`);
      
      if (result.data) {
        log.data(`生产统计:`);
        log.data(`  - 成功生成: ${result.data.stats?.generated || 0}`);
        log.data(`  - 跳过项目: ${result.data.stats?.skipped || 0}`);
        log.data(`  - 失败项目: ${result.data.stats?.failed || 0}`);
        log.data(`  - 总执行时间: ${result.data.execution?.duration || 'N/A'}`);
        
        if (result.data.details && result.data.details.length > 0) {
          log.data(`生成详情:`);
          result.data.details.forEach((detail, index) => {
            log.data(`  ${index + 1}. 项目ID: ${detail.projectId}`);
            log.data(`     项目名: ${detail.projectName}`);
            log.data(`     模板ID: ${detail.templateId}`);
            log.data(`     模板名: ${detail.templateName}`);
            log.data(`     状态: ${detail.status}`);
            
            if (detail.status === 'generated') {
              log.data(`     版本ID: ${detail.versionId}`);
              if (detail.contentLengths) {
                log.data(`     内容长度:`);
                log.data(`       - 英文: ${detail.contentLengths.outputContentEn} 字符`);
                log.data(`       - 中文: ${detail.contentLengths.outputContentZh} 字符`);
                if (detail.contentLengths.mdcPromptContentEn) {
                  log.data(`       - MDC英文: ${detail.contentLengths.mdcPromptContentEn} 字符`);
                  log.data(`       - MDC中文: ${detail.contentLengths.mdcPromptContentZh} 字符`);
                }
              }
            } else if (detail.status === 'failed') {
              log.error(`     错误: ${detail.error}`);
            }
          });
        }
      }
      
      return true;
    } else {
      log.error(`实际生产测试失败: HTTP ${response.status}`);
      const errorText = await response.text();
      log.error(`错误详情: ${errorText}`);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`实际生产测试异常 (${duration}ms): ${error.message}`);
    return false;
  }
}

async function checkServiceStatus() {
  log.info('检查后台服务状态...');
  
  try {
    const response = await fetch(`${config.awsBackendUrl}/api/batch/batch-production/status`);
    
    if (response.ok) {
      const statusData = await response.json();
      log.success('服务状态查询成功');
      log.data(`最近生成数量: ${statusData.data?.recent_generations || 0}`);
      log.data(`最后生成时间: ${statusData.data?.last_generation || 'N/A'}`);
      log.data(`服务状态: ${statusData.data?.status || 'unknown'}`);
    } else {
      log.error(`状态查询失败: HTTP ${response.status}`);
    }
  } catch (error) {
    log.error(`状态查询异常: ${error.message}`);
  }
}

async function main() {
  const totalStartTime = Date.now();
  
  log.info('🚀 开始详细的AWS Backend批量生产功能测试...');
  log.info('========================================');
  
  // 步骤1: 健康检查
  log.info('📋 步骤1: 服务健康检查');
  const healthOk = await checkServiceHealth();
  if (!healthOk) {
    log.error('服务健康检查失败，测试终止');
    log.error('请确保aws-backend服务正在运行在端口3000');
    return;
  }
  
  await sleep(1000);
  
  // 步骤2: 服务状态检查
  log.info('📋 步骤2: 批量生产服务状态检查');
  await checkServiceStatus();
  
  await sleep(1000);
  
  // 步骤3: 干预模式测试
  log.info('📋 步骤3: 干预模式测试');
  const dryRunOk = await testDryRun();
  if (!dryRunOk) {
    log.warn('干预模式测试失败，但继续执行实际测试...');
  }
  
  await sleep(2000);
  
  // 步骤4: 实际生产测试
  log.info('📋 步骤4: 实际生产测试（小批量）');
  const productionOk = await testActualProduction();
  
  // 总结
  const totalDuration = Date.now() - totalStartTime;
  log.info('========================================');
  log.info(`🏁 测试完成！总耗时: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
  
  if (healthOk && dryRunOk && productionOk) {
    log.success('所有测试通过！');
  } else {
    log.warn('部分测试失败，请检查上面的错误信息');
  }
}

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  log.error(`未捕获的异常: ${error.message}`);
  log.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

main().catch(error => {
  log.error(`主程序异常: ${error.message}`);
  log.error(error.stack);
  process.exit(1);
}); 