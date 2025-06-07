#!/usr/bin/env node

/**
 * 增强的生产环境批量模板生成执行器
 * 针对Netlify Functions 30秒超时限制优化
 * 
 * 主要改进：
 * - 使用更短的超时时间（15秒）
 * - 单语言模式优先，避免双语超时
 * - 更详细的错误处理和响应分析
 * - 支持手工触发队列模式
 */

const http = require('http');
const https = require('https');
const fs = require('fs');

// 优化的生产环境配置
const ENHANCED_CONFIG = {
  baseUrl: 'http://productmindai.com/.netlify/functions/batch-generate-templates',
  queueUrl: 'http://productmindai.com/.netlify/functions/manual-batch-trigger',
  batchSize: 1,           // 每批处理的项目数
  templateBatchSize: 1,   // 每批处理的模板数
  maxExecutionTime: 15000, // 单次执行最大时间(毫秒)，避免30秒超时
  retryAttempts: 3,       // 失败重试次数
  retryDelay: 3000,       // 重试延迟(毫秒)
  requestTimeout: 25000,  // HTTP请求超时
  progressFile: './enhanced-production-progress.json',
  logFile: './enhanced-production.log'
};

// 全局统计
let totalStats = {
  generated: 0,
  skipped: 0,
  errors: 0,
  batches_completed: 0,
  start_time: new Date().toISOString(),
  last_update: new Date().toISOString()
};

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // 写入日志文件
  try {
    fs.appendFileSync(ENHANCED_CONFIG.logFile, logMessage + '\n');
  } catch (error) {
    console.error('写入日志失败:', error.message);
  }
}

// 增强的HTTP请求函数，包含详细的响应分析
function makeEnhancedRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: ENHANCED_CONFIG.requestTimeout,
      headers: {
        'User-Agent': 'ProductMindAI-EnhancedExecutor/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    };

    log(`发起请求: ${url}`);
    
    const req = requestModule.request(options, (res) => {
      let data = '';
      let dataLength = 0;
      
      log(`响应状态: ${res.statusCode} ${res.statusMessage}`);
      log(`响应头: ${JSON.stringify(res.headers)}`);
      
      res.on('data', (chunk) => {
        data += chunk;
        dataLength += chunk.length;
      });
      
      res.on('end', () => {
        log(`响应完成: 接收 ${dataLength} 字节数据`);
        log(`原始响应前500字符: ${data.substring(0, 500)}`);
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP错误: ${res.statusCode} ${res.statusMessage}`));
          return;
        }
        
        if (!data.trim()) {
          reject(new Error('响应为空'));
          return;
        }
        
        try {
          const result = JSON.parse(data);
          log(`解析成功: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
          resolve(result);
        } catch (error) {
          log(`JSON解析失败: ${error.message}`, 'ERROR');
          log(`响应数据: ${data}`, 'ERROR');
          reject(new Error(`解析响应失败: ${error.message} (数据长度: ${data.length})`));
        }
      });
    });

    req.on('error', (error) => {
      log(`请求错误: ${error.message}`, 'ERROR');
      reject(error);
    });

    req.on('timeout', () => {
      log('请求超时', 'ERROR');
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 执行单个批次（单语言模式）
async function executeSingleLanguageBatch(params, language, retryCount = 0) {
  try {
    const singleLangParams = {
      ...params,
      languages: language, // 单语言
      max_time: ENHANCED_CONFIG.maxExecutionTime
    };
    
    const queryParams = new URLSearchParams(singleLangParams);
    const url = `${ENHANCED_CONFIG.baseUrl}?${queryParams.toString()}`;
    
    log(`执行单语言批次 (${language}): offset=${params.start_offset}, template_offset=${params.template_offset}`);
    
    const result = await makeEnhancedRequest(url);
    
    if (!result.success) {
      throw new Error(result.error || '批次执行失败');
    }
    
    // 更新统计信息
    totalStats.generated += result.generated || 0;
    totalStats.skipped += result.skipped || 0;
    totalStats.errors += result.errors || 0;
    totalStats.batches_completed += 1;
    totalStats.last_update = new Date().toISOString();
    
    log(`批次完成 (${language}): 生成=${result.generated}, 跳过=${result.skipped}, 错误=${result.errors}, 耗时=${result.execution_time}ms`);
    
    return result;
    
  } catch (error) {
    log(`批次执行失败 (${language}): ${error.message}`, 'ERROR');
    
    if (retryCount < ENHANCED_CONFIG.retryAttempts) {
      log(`等待 ${ENHANCED_CONFIG.retryDelay}ms 后重试 (${retryCount + 1}/${ENHANCED_CONFIG.retryAttempts})`);
      await new Promise(resolve => setTimeout(resolve, ENHANCED_CONFIG.retryDelay));
      return executeSingleLanguageBatch(params, language, retryCount + 1);
    } else {
      throw error;
    }
  }
}

// 测试队列系统
async function testQueueSystem() {
  try {
    log('🧪 测试队列系统...');
    
    const testUrl = `${ENHANCED_CONFIG.queueUrl}?action=status`;
    const result = await makeEnhancedRequest(testUrl);
    
    log(`队列系统状态: ${JSON.stringify(result, null, 2)}`);
    return true;
    
  } catch (error) {
    log(`队列系统测试失败: ${error.message}`, 'ERROR');
    return false;
  }
}

// 使用队列系统执行
async function executeWithQueue(params) {
  try {
    log('🚀 使用队列系统执行批量生成...');
    
    // 添加任务到队列
    const addTaskUrl = `${ENHANCED_CONFIG.queueUrl}?action=add&${new URLSearchParams(params).toString()}`;
    const addResult = await makeEnhancedRequest(addTaskUrl);
    
    log(`任务添加结果: ${JSON.stringify(addResult, null, 2)}`);
    
    if (!addResult.success) {
      throw new Error(addResult.error || '添加任务失败');
    }
    
    // 监控队列状态
    let processing = true;
    let checkCount = 0;
    const maxChecks = 60; // 最多检查60次（5分钟）
    
    while (processing && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      checkCount++;
      
      try {
        const statusUrl = `${ENHANCED_CONFIG.queueUrl}?action=status`;
        const status = await makeEnhancedRequest(statusUrl);
        
        log(`队列状态检查 ${checkCount}: ${JSON.stringify(status, null, 2)}`);
        
        if (status.queue_length === 0 && !status.processing) {
          processing = false;
          log('✅ 队列处理完成');
        }
        
      } catch (error) {
        log(`状态检查失败: ${error.message}`, 'ERROR');
      }
    }
    
    if (checkCount >= maxChecks) {
      log('⚠️ 队列监控超时，但任务可能仍在后台执行', 'WARN');
    }
    
    return { success: true, message: '队列任务已提交' };
    
  } catch (error) {
    log(`队列执行失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

// 主执行函数
async function runEnhancedProductionBatch(options = {}) {
  try {
    log('🚀 开始增强的生产环境批量模板生成任务');
    log(`🌐 目标域名: http://productmindai.com`);
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const params = {
      user_id: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      languages: 'zh', // 默认单语言，避免超时
      table: 'user_projects',
      batch_size: ENHANCED_CONFIG.batchSize,
      template_batch_size: ENHANCED_CONFIG.templateBatchSize,
      max_time: ENHANCED_CONFIG.maxExecutionTime,
      start_offset: 0,
      template_offset: 0,
      limit: 5, // 减少每次查询的项目数量
      ...options
    };
    
    // 解析命令行参数
    args.forEach(arg => {
      const [key, value] = arg.replace('--', '').split('=');
      if (value !== undefined) {
        params[key] = value;
      }
    });
    
    log(`任务参数: ${JSON.stringify(params, null, 2)}`);
    
    // 检查是否使用队列模式
    if (args.includes('--use-queue')) {
      log('🔄 使用队列模式执行...');
      
      // 测试队列系统
      const queueAvailable = await testQueueSystem();
      if (queueAvailable) {
        return await executeWithQueue(params);
      } else {
        log('队列系统不可用，回退到直接模式', 'WARN');
      }
    }
    
    // 直接模式执行
    log('🎯 使用直接模式执行...');
    
    // 分离语言处理
    const languages = params.languages.split(',').map(lang => lang.trim());
    log(`处理语言: ${languages.join(', ')}`);
    
    for (const language of languages) {
      log(`\n=== 开始处理语言: ${language} ===`);
      
      let currentOffset = parseInt(params.start_offset);
      let templateOffset = parseInt(params.template_offset);
      let batchCount = 0;
      let hasMoreData = true;
      let consecutiveErrors = 0;
      
      while (hasMoreData && consecutiveErrors < 3) {
        try {
          batchCount++;
          log(`\n--- 执行第 ${batchCount} 个批次 (${language}) ---`);
          
          const batchParams = {
            ...params,
            start_offset: currentOffset,
            template_offset: templateOffset
          };
          
          const result = await executeSingleLanguageBatch(batchParams, language);
          
          // 重置连续错误计数
          consecutiveErrors = 0;
          
          // 检查是否还有更多数据
          const batchInfo = result.batch_info || {};
          hasMoreData = batchInfo.has_more_projects || batchInfo.has_more_templates;
          
          if (hasMoreData) {
            currentOffset = batchInfo.next_project_offset || currentOffset;
            templateOffset = batchInfo.next_template_offset || 0;
            
            log(`准备下一批次: project_offset=${currentOffset}, template_offset=${templateOffset}`);
            
            // 批次间延迟
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            log(`✅ 语言 ${language} 处理完成！`);
            break;
          }
          
        } catch (error) {
          consecutiveErrors++;
          log(`批次 ${batchCount} (${language}) 执行失败: ${error.message}`, 'ERROR');
          
          if (consecutiveErrors >= 3) {
            log(`语言 ${language} 连续错误次数过多，跳过`, 'ERROR');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, ENHANCED_CONFIG.retryDelay));
        }
      }
    }
    
    // 最终统计
    log('\n🎉 增强的生产环境批量生成任务完成！');
    log(`最终统计:`);
    log(`   总生成: ${totalStats.generated} 个模板`);
    log(`   总跳过: ${totalStats.skipped} 个模板`);
    log(`   总错误: ${totalStats.errors} 个模板`);
    log(`   总批次: ${totalStats.batches_completed} 个`);
    log(`   总耗时: ${new Date() - new Date(totalStats.start_time)}ms`);
    
  } catch (error) {
    log(`任务执行失败: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runEnhancedProductionBatch().catch(error => {
    console.error('任务执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runEnhancedProductionBatch,
  ENHANCED_CONFIG
}; 