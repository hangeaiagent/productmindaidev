#!/usr/bin/env node

/**
 * 大规模批量模板生成管理脚本
 * 
 * 功能：
 * - 支持500+项目 × 25个模板的大规模任务
 * - 自动分批处理，避免超时
 * - 断点续传，支持中断后继续
 * - 实时进度跟踪和统计
 * - 错误处理和重试机制
 * 
 * 使用方法：
 * node scripts/run-large-batch-generation.js --user_id=xxx --languages=zh,en
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置参数
const CONFIG = {
  baseUrl: 'http://localhost:8888/.netlify/functions/batch-generate-templates',
  batchSize: 3,           // 每批处理的项目数
  templateBatchSize: 2,   // 每批处理的模板数
  maxExecutionTime: 25000, // 单次执行最大时间(毫秒)
  retryAttempts: 3,       // 失败重试次数
  retryDelay: 5000,       // 重试延迟(毫秒)
  progressFile: './batch-progress.json', // 进度保存文件
  logFile: './batch-generation.log'      // 日志文件
};

// 全局状态
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
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// 保存进度
function saveProgress(progress) {
  try {
    fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
    log(`进度已保存: ${progress.current_offset}/${progress.total_estimated}`);
  } catch (error) {
    log(`保存进度失败: ${error.message}`, 'ERROR');
  }
}

// 加载进度
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.progressFile)) {
      const progress = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
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
      timeout: 35000 // 35秒超时
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
    const url = `${CONFIG.baseUrl}?${queryParams.toString()}`;
    
    log(`执行批次: offset=${params.start_offset}, template_offset=${params.template_offset}`);
    
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
    
    if (retryCount < CONFIG.retryAttempts) {
      log(`等待 ${CONFIG.retryDelay}ms 后重试 (${retryCount + 1}/${CONFIG.retryAttempts})`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return executeBatch(params, retryCount + 1);
    } else {
      throw error;
    }
  }
}

// 主执行函数
async function runLargeBatchGeneration(options = {}) {
  try {
    log('🚀 开始大规模批量模板生成任务');
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const params = {
      user_id: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      languages: 'zh,en',
      table: 'user_projects',
      batch_size: CONFIG.batchSize,
      template_batch_size: CONFIG.templateBatchSize,
      max_time: CONFIG.maxExecutionTime,
      start_offset: 0,
      template_offset: 0,
      limit: 50, // 每次查询的项目数量
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
    
    while (hasMoreData) {
      try {
        batchCount++;
        log(`\n=== 执行第 ${batchCount} 个批次 ===`);
        
        const batchParams = {
          ...params,
          start_offset: currentOffset,
          template_offset: templateOffset
        };
        
        const result = await executeBatch(batchParams);
        
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
          
          // 短暂延迟，避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        
        // 决定是否继续或停止
        if (totalStats.errors > 10) {
          log('错误次数过多，停止执行', 'ERROR');
          break;
        }
        
        log('继续执行下一批次...');
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
    
    // 最终统计
    log('\n🎉 大规模批量生成任务完成！');
    log(`最终统计:`);
    log(`   总生成: ${totalStats.generated} 个模板`);
    log(`   总跳过: ${totalStats.skipped} 个模板`);
    log(`   总错误: ${totalStats.errors} 个模板`);
    log(`   总批次: ${totalStats.batches_completed} 个`);
    log(`   总耗时: ${new Date() - new Date(totalStats.start_time)}ms`);
    
    // 清理进度文件
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
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
  
  runLargeBatchGeneration({ restart }).catch(error => {
    console.error('任务执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runLargeBatchGeneration,
  CONFIG
}; 