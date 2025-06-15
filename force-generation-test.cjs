#!/usr/bin/env node
const http = require('http');

const config = { awsBackendUrl: 'http://localhost:3000' };

async function fetch(url, options = {}) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const req = http.request(url, { 
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => JSON.parse(data),
          text: () => data,
          duration
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const log = {
  info: (msg) => console.log(`${getTimestamp()} ℹ️  ${msg}`),
  success: (msg) => console.log(`${getTimestamp()} ✅ ${msg}`),
  error: (msg) => console.log(`${getTimestamp()} ❌ ${msg}`),
  warn: (msg) => console.log(`${getTimestamp()} ⚠️  ${msg}`),
  data: (msg) => console.log(`${getTimestamp()} 📊 ${msg}`)
};

function getTimestamp() {
  return new Date().toISOString().substr(11, 12);
}

async function testForceGeneration() {
  const startTime = Date.now();
  log.info('🔥 开始强制生成测试（skipExisting=false）...');
  
  try {
    const requestData = {
      dryRun: false,
      batchSize: 1,
      limitProjects: 1,
      limitTemplates: 1,
      skipExisting: false  // 关键：强制重新生成
    };
    
    log.warn('⚠️  注意：skipExisting=false，将强制重新生成已存在的内容');
    log.data(`请求参数: ${JSON.stringify(requestData, null, 2)}`);
    
    const response = await fetch(`${config.awsBackendUrl}/api/batch/batch-production`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      log.success(`强制生成测试完成 (${duration}ms)`);
      
      if (result.data) {
        log.data(`=== 详细生成统计 ===`);
        log.data(`总任务数: ${result.data.stats?.total || 0}`);
        log.data(`成功生成: ${result.data.stats?.generated || 0}`);
        log.data(`跳过项目: ${result.data.stats?.skipped || 0}`);
        log.data(`失败项目: ${result.data.stats?.failed || 0}`);
        log.data(`总执行时间: ${result.data.execution?.duration || 'N/A'}`);
        
        if (result.data.details && result.data.details.length > 0) {
          log.data(`=== 生成详情 ===`);
          result.data.details.forEach((detail, index) => {
            log.data(`${index + 1}. 项目: ${detail.projectName} (${detail.projectId})`);
            log.data(`   模板: ${detail.templateName} (${detail.templateId})`);
            log.data(`   状态: ${detail.status}`);
            
            if (detail.status === 'generated') {
              log.success(`   ✅ 生成成功！版本ID: ${detail.versionId}`);
              if (detail.contentLengths) {
                log.data(`   📝 内容长度:`);
                log.data(`      - 英文输出: ${detail.contentLengths.outputContentEn} 字符`);
                log.data(`      - 中文输出: ${detail.contentLengths.outputContentZh} 字符`);
                if (detail.contentLengths.mdcPromptContentEn) {
                  log.data(`      - MDC英文: ${detail.contentLengths.mdcPromptContentEn} 字符`);
                  log.data(`      - MDC中文: ${detail.contentLengths.mdcPromptContentZh} 字符`);
                }
              }
            } else if (detail.status === 'failed') {
              log.error(`   ❌ 生成失败: ${detail.error}`);
            } else if (detail.status === 'skipped') {
              log.warn(`   ⏭️  已跳过: ${detail.reason || '未知原因'}`);
            }
          });
        }
        
        // 性能分析
        const totalTime = parseFloat(result.data.execution?.duration?.replace('s', '') || '0');
        if (totalTime > 0 && result.data.stats?.generated > 0) {
          const avgTimePerGeneration = totalTime / result.data.stats.generated;
          log.data(`⏱️  平均每个生成耗时: ${avgTimePerGeneration.toFixed(2)}s`);
        }
      }
      
      return true;
    } else {
      log.error(`强制生成测试失败: HTTP ${response.status}`);
      const errorText = await response.text();
      log.error(`错误详情: ${errorText}`);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`强制生成测试异常 (${duration}ms): ${error.message}`);
    return false;
  }
}

async function main() {
  const totalStartTime = Date.now();
  
  log.info('🚀 开始AI内容生成性能测试...');
  log.info('==========================================');
  
  const result = await testForceGeneration();
  
  const totalDuration = Date.now() - totalStartTime;
  log.info('==========================================');
  log.info(`🏁 测试完成！总耗时: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
  
  if (result) {
    log.success('测试成功完成！');
  } else {
    log.error('测试失败！');
  }
}

main().catch(error => {
  log.error(`程序异常: ${error.message}`);
  process.exit(1);
}); 