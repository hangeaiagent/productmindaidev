#!/usr/bin/env node

/**
 * 生产环境批量模板生成执行器
 * 域名: http://productmindai.com
 * 
 * 功能：
 * - 针对生产环境的大规模批量任务
 * - 自动分批处理，避免Netlify Functions 30秒超时
 * - 断点续传，支持中断后继续
 * - 实时进度跟踪和统计
 * - 错误处理和重试机制
 * 
 * 使用方法：
 * node scripts/production-batch-executor.cjs --languages=zh,en
 */

const http = require('http');
const https = require('https');
const fs = require('fs');

// 生产环境配置
const PRODUCTION_CONFIG = {
  baseUrl: 'http://productmindai.com/.netlify/functions/batch-generate-templates',
  batchSize: 1,           // 每批处理的项目数
  templateBatchSize: 1,   // 每批处理的模板数
  maxExecutionTime: 25000, // 单次执行最大时间(毫秒)，留5秒缓冲
  retryAttempts: 3,       // 失败重试次数
  retryDelay: 5000,       // 重试延迟(毫秒)
  progressFile: './production-batch-progress.json',
  logFile: './production-batch.log'
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
  fs.appendFileSync(PRODUCTION_CONFIG.logFile, logMessage + '\n');
}

// 保存进度
function saveProgress(progress) {
  try {
    fs.writeFileSync(PRODUCTION_CONFIG.progressFile, JSON.stringify(progress, null, 2));
    log(`进度已保存: ${progress.current_offset}/${progress.total_estimated}`);
  } catch (error) {
    log(`保存进度失败: ${error.message}`, 'ERROR');
  }
}

// 加载进度
function loadProgress() {
  try {
    if (fs.existsSync(PRODUCTION_CONFIG.progressFile)) {
      const progress = JSON.parse(fs.readFileSync(PRODUCTION_CONFIG.progressFile, 'utf8'));
      log(`加载已保存的进度: ${progress.current_offset}/${progress.total_estimated}`);
      return progress;
    }
  } catch (error) {
    log(`加载进度失败: ${error.message}`, 'ERROR');
  }
  return null;
}

// HTTP请求函数
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 35000, // 35秒超时
      headers: {
        'User-Agent': 'ProductMindAI-BatchExecutor/1.0'
      }
    };

    const req = requestModule.request(options, (res) => {
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

// 执行单个批次
async function executeBatch(params, retryCount = 0) {
  try {
    const queryParams = new URLSearchParams(params);
    const url = `${PRODUCTION_CONFIG.baseUrl}?${queryParams.toString()}`;
    
    log(`执行生产环境批次: offset=${params.start_offset}, template_offset=${params.template_offset}`);
    log(`请求URL: ${url}`);
    
    const result = await makeRequest(url);
    
    if (!result.success) {
      throw new Error(result.error || '批次执行失败');
    }
    
    // 更新统计信息
    totalStats.generated += result.generated || 0;
    totalStats.skipped += result.skipped || 0;
    totalStats.errors += result.errors || 0;
    totalStats.batches_completed += 1;
    totalStats.last_update = new Date().toISOString();
    
    log(`批次完成: 生成=${result.generated}, 跳过=${result.skipped}, 错误=${result.errors}, 耗时=${result.execution_time}ms`);
    
    return result;
    
  } catch (error) {
    log(`批次执行失败: ${error.message}`, 'ERROR');
    
    if (retryCount < PRODUCTION_CONFIG.retryAttempts) {
      log(`等待 ${PRODUCTION_CONFIG.retryDelay}ms 后重试 (${retryCount + 1}/${PRODUCTION_CONFIG.retryAttempts})`);
      await new Promise(resolve => setTimeout(resolve, PRODUCTION_CONFIG.retryDelay));
      return executeBatch(params, retryCount + 1);
    } else {
      throw error;
    }
  }
}

// 主执行函数
async function runProductionBatch(options = {}) {
  try {
    log('🚀 开始生产环境大规模批量模板生成任务');
    log(`🌐 目标域名: http://productmindai.com`);
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const params = {
      user_id: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      languages: 'zh,en', // 默认双语
      table: 'user_projects',
      batch_size: PRODUCTION_CONFIG.batchSize,
      template_batch_size: PRODUCTION_CONFIG.templateBatchSize,
      max_time: PRODUCTION_CONFIG.maxExecutionTime,
      start_offset: 0,
      template_offset: 0,
      limit: 10, // 每次查询的项目数量
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
    
    // 尝试加载之前的进度
    const savedProgress = loadProgress();
    if (savedProgress && !options.restart) {
      params.start_offset = savedProgress.current_offset;
      params.template_offset = savedProgress.template_offset;
      totalStats = { ...totalStats, ...savedProgress.stats };
      log('从上次中断的位置继续执行');
    }
    
    let currentOffset = parseInt(params.start_offset);
    let templateOffset = parseInt(params.template_offset);
    let batchCount = 0;
    let hasMoreData = true;
    let consecutiveErrors = 0;
    
    while (hasMoreData) {
      try {
        batchCount++;
        log(`\n=== 执行第 ${batchCount} 个生产环境批次 ===`);
        
        const batchParams = {
          ...params,
          start_offset: currentOffset,
          template_offset: templateOffset
        };
        
        const result = await executeBatch(batchParams);
        
        // 重置连续错误计数
        consecutiveErrors = 0;
        
        // 检查是否还有更多数据
        const batchInfo = result.batch_info || {};
        hasMoreData = batchInfo.has_more_projects || batchInfo.has_more_templates;
        
        if (hasMoreData) {
          currentOffset = batchInfo.next_project_offset || currentOffset;
          templateOffset = batchInfo.next_template_offset || 0;
          
          // 保存进度
          const progress = {
            current_offset: currentOffset,
            template_offset: templateOffset,
            total_estimated: 'unknown',
            stats: totalStats,
            last_batch_info: batchInfo
          };
          saveProgress(progress);
          
          log(`准备下一批次: project_offset=${currentOffset}, template_offset=${templateOffset}`);
          
          // 生产环境延迟，避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          log('✅ 所有批次处理完成！');
          break;
        }
        
        // 显示总体进度
        log(`\n📊 总体进度统计:`);
        log(`   生成: ${totalStats.generated} 个模板`);
        log(`   跳过: ${totalStats.skipped} 个模板`);
        log(`   错误: ${totalStats.errors} 个模板`);
        log(`   批次: ${totalStats.batches_completed} 个`);
        log(`   开始时间: ${totalStats.start_time}`);
        log(`   最后更新: ${totalStats.last_update}`);
        
      } catch (error) {
        consecutiveErrors++;
        log(`批次 ${batchCount} 执行失败: ${error.message}`, 'ERROR');
        
        // 保存当前进度，即使失败也要记录
        const progress = {
          current_offset: currentOffset,
          template_offset: templateOffset,
          total_estimated: 'unknown',
          stats: totalStats,
          error: error.message,
          failed_at: new Date().toISOString()
        };
        saveProgress(progress);
        
        // 如果连续错误过多，停止执行
        if (consecutiveErrors >= 5) {
          log('连续错误次数过多，停止执行', 'ERROR');
          break;
        }
        
        log('继续执行下一批次...');
        await new Promise(resolve => setTimeout(resolve, PRODUCTION_CONFIG.retryDelay));
      }
    }
    
    // 最终统计
    log('\n🎉 生产环境大规模批量生成任务完成！');
    log(`最终统计:`);
    log(`   总生成: ${totalStats.generated} 个模板`);
    log(`   总跳过: ${totalStats.skipped} 个模板`);
    log(`   总错误: ${totalStats.errors} 个模板`);
    log(`   总批次: ${totalStats.batches_completed} 个`);
    log(`   总耗时: ${new Date() - new Date(totalStats.start_time)}ms`);
    
    // 清理进度文件
    if (fs.existsSync(PRODUCTION_CONFIG.progressFile)) {
      fs.unlinkSync(PRODUCTION_CONFIG.progressFile);
      log('进度文件已清理');
    }
    
  } catch (error) {
    log(`任务执行失败: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 检查是否有重启参数
  const restart = process.argv.includes('--restart');
  
  runProductionBatch({ restart }).catch(error => {
    console.error('任务执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runProductionBatch,
  PRODUCTION_CONFIG
}; 