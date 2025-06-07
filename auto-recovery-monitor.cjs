#!/usr/bin/env node

/**
 * 智能自动恢复监控脚本
 * 当检测到任务停止时自动重启
 */

const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
const CHECK_INTERVAL = 60 * 1000; // 1分钟检查一次
const REPORT_INTERVAL = 10 * 60 * 1000; // 10分钟详细报告一次
const AUTO_RECOVERY_THRESHOLD = 5 * 60 * 1000; // 5分钟无进度则自动恢复

let startTime = Date.now();
let lastReportTime = Date.now();
let lastStats = null;
let lastProgressTime = Date.now();
let recoveryCount = 0;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取当前统计信息
async function getStats() {
  try {
    const response = await fetch(`${BASE_URL}/test/template-generation/stats/${USER_ID}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`❌ 获取统计信息失败: ${error.message}`);
    return null;
  }
}

// 检查服务器健康状态
async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 自动恢复任务
async function autoRecover() {
  console.log(`🔄 执行自动恢复... (第${++recoveryCount}次)`);
  
  try {
    const response = await fetch(`${BASE_URL}/test/template-generation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: USER_ID,
        maxConcurrent: 3,
        batchSize: 10,
        languages: ['zh', 'en'],
        skipCompleted: true,
        resumeFromFailure: true
      })
    });
    
    if (response.ok) {
      console.log(`✅ 自动恢复成功！等待任务重新启动...`);
      lastProgressTime = Date.now(); // 重置进度时间
      await delay(10000); // 等待10秒让任务启动
      return true;
    } else {
      console.error(`❌ 自动恢复失败: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 自动恢复出错: ${error.message}`);
    return false;
  }
}

// 格式化时间
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

// 显示详细报告
function showDetailedReport(stats) {
  const runTime = Date.now() - startTime;
  const completionRate = (stats.completed / stats.total * 100).toFixed(2);
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 【智能监控报告】 - ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(70));
  console.log(`📈 总体进度: ${stats.completed}/${stats.total} (${completionRate}%)`);
  console.log(`⏳ 待处理: ${stats.pending}个`);
  console.log(`🔄 进行中: ${stats.in_progress}个`);
  console.log(`✅ 已完成: ${stats.completed}个`);
  console.log(`❌ 失败: ${stats.failed}个`);
  console.log(`🔧 自动恢复次数: ${recoveryCount}次`);
  console.log(`⏰ 总运行时间: ${formatDuration(runTime)}`);
  
  if (lastStats) {
    const progressDiff = stats.completed - lastStats.completed;
    const timeDiff = (Date.now() - lastReportTime) / 1000 / 60; // 分钟
    const rate = progressDiff / timeDiff;
    console.log(`🚀 完成速度: ${rate.toFixed(2)}项目/分钟`);
    
    const remaining = stats.pending + stats.in_progress;
    if (rate > 0) {
      const remainingTime = remaining / rate * 60 * 1000; // 毫秒
      console.log(`🎯 预计完成: ${formatDuration(remainingTime)}`);
    }
  }
  
  console.log('='.repeat(70));
  
  lastReportTime = Date.now();
  lastStats = { ...stats };
}

// 主监控循环
async function monitor() {
  console.log(`🤖 启动智能自动恢复监控...`);
  console.log(`🎯 目标: 完成剩余${436-122}个项目的模板生成`);
  console.log(`⏱️  检查间隔: ${CHECK_INTERVAL / 1000}秒`);
  console.log(`🔄 自动恢复阈值: ${AUTO_RECOVERY_THRESHOLD / 1000 / 60}分钟无进度\n`);
  
  while (true) {
    // 检查服务器健康状态
    const isHealthy = await checkHealth();
    if (!isHealthy) {
      console.error('❌ 服务器不可用！请检查AWS后端服务');
      await delay(30000); // 等待30秒后重试
      continue;
    }
    
    // 获取统计信息
    const stats = await getStats();
    if (!stats) {
      await delay(CHECK_INTERVAL);
      continue;
    }
    
    // 检查是否完成
    if (stats.completed >= stats.total) {
      const totalTime = Date.now() - startTime;
      console.log('\n🎉🎉🎉 恭喜！所有项目的模板生成已完成！ 🎉🎉🎉');
      console.log(`✅ 总项目数: ${stats.total}`);
      console.log(`✅ 完成数量: ${stats.completed}`);
      console.log(`❌ 失败数量: ${stats.failed}`);
      console.log(`🔧 自动恢复次数: ${recoveryCount}`);
      console.log(`⏰ 总耗时: ${formatDuration(totalTime)}`);
      console.log(`🚀 平均速度: ${(stats.completed / (totalTime / 1000 / 60)).toFixed(2)}项目/分钟`);
      break;
    }
    
    // 检查是否有进度
    const hasProgress = !lastStats || stats.completed > lastStats.completed || stats.in_progress > 0;
    if (hasProgress) {
      lastProgressTime = Date.now();
    }
    
    // 检查是否需要自动恢复
    const timeSinceProgress = Date.now() - lastProgressTime;
    if (timeSinceProgress > AUTO_RECOVERY_THRESHOLD && stats.in_progress === 0 && stats.pending > 0) {
      console.log(`⚠️ 检测到任务停止 ${formatDuration(timeSinceProgress)}，开始自动恢复...`);
      const recovered = await autoRecover();
      if (!recovered) {
        console.log('⏸️ 自动恢复失败，等待手动干预...');
        await delay(60000); // 等待1分钟后继续监控
      }
      continue;
    }
    
    // 简要进度显示
    const now = new Date().toLocaleTimeString();
    const progress = (stats.completed / stats.total * 100).toFixed(1);
    const statusIcon = stats.in_progress > 0 ? '🟢' : (stats.pending > 0 ? '🟡' : '🔴');
    console.log(`[${now}] ${statusIcon} 进度: ${stats.completed}/${stats.total} (${progress}%) | 进行中: ${stats.in_progress} | 失败: ${stats.failed}`);
    
    // 定期详细报告
    if (Date.now() - lastReportTime >= REPORT_INTERVAL) {
      showDetailedReport(stats);
    }
    
    await delay(CHECK_INTERVAL);
  }
}

// 优雅退出处理
process.on('SIGINT', () => {
  console.log('\n📊 收到中断信号，正在生成最终报告...');
  getStats().then(stats => {
    if (stats) {
      const totalTime = Date.now() - startTime;
      console.log(`\n📋 最终状态报告:`);
      console.log(`✅ 已完成: ${stats.completed}/${stats.total}`);
      console.log(`🔧 自动恢复次数: ${recoveryCount}`);
      console.log(`⏰ 运行时间: ${formatDuration(totalTime)}`);
    }
    process.exit(0);
  });
});

// 开始监控
monitor().catch(error => {
  console.error('监控脚本出错:', error);
  process.exit(1);
}); 