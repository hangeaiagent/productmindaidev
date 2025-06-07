#!/usr/bin/env node

/**
 * 夜间批量模板生成监控脚本
 * 持续运行直到所有436个项目完成模板生成
 */

const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
const CHECK_INTERVAL = 60 * 1000; // 1分钟检查一次
const REPORT_INTERVAL = 10 * 60 * 1000; // 10分钟详细报告一次

let startTime = Date.now();
let lastReportTime = Date.now();
let lastStats = null;

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

// 计算预估完成时间
function estimateCompletion(currentStats, previousStats) {
  if (!previousStats || !currentStats) return null;
  
  const completedDiff = currentStats.completed - previousStats.completed;
  const timeDiff = (Date.now() - lastReportTime) / 1000; // 秒
  
  if (completedDiff <= 0) return null;
  
  const rate = completedDiff / timeDiff; // 项目/秒
  const remaining = currentStats.pending + currentStats.in_progress;
  const remainingTime = remaining / rate; // 秒
  
  return remainingTime * 1000; // 毫秒
}

// 显示详细报告
function showDetailedReport(stats) {
  const runTime = Date.now() - startTime;
  const completionRate = (stats.completed / stats.total * 100).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 【夜间批量生成监控报告】 - ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(60));
  console.log(`📈 总体进度: ${stats.completed}/${stats.total} (${completionRate}%)`);
  console.log(`⏳ 待处理: ${stats.pending}个`);
  console.log(`🔄 进行中: ${stats.in_progress}个`);
  console.log(`✅ 已完成: ${stats.completed}个`);
  console.log(`❌ 失败: ${stats.failed}个`);
  console.log(`⏰ 运行时间: ${formatDuration(runTime)}`);
  
  if (lastStats) {
    const progressDiff = stats.completed - lastStats.completed;
    const timeDiff = (Date.now() - lastReportTime) / 1000 / 60; // 分钟
    const rate = progressDiff / timeDiff;
    console.log(`🚀 完成速度: ${rate.toFixed(2)}项目/分钟`);
    
    const remainingTime = estimateCompletion(stats, lastStats);
    if (remainingTime) {
      console.log(`🎯 预计完成: ${formatDuration(remainingTime)}`);
    }
  }
  
  console.log('='.repeat(60));
  
  lastReportTime = Date.now();
  lastStats = { ...stats };
}

// 主监控循环
async function monitor() {
  console.log(`🌙 开始夜间批量生成监控...`);
  console.log(`🎯 目标: 完成所有436个项目的模板生成`);
  console.log(`⏱️  检查间隔: ${CHECK_INTERVAL / 1000}秒`);
  console.log(`📋 报告间隔: ${REPORT_INTERVAL / 1000 / 60}分钟\n`);
  
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
      console.log(`⏰ 总耗时: ${formatDuration(totalTime)}`);
      console.log(`🚀 平均速度: ${(stats.completed / (totalTime / 1000 / 60)).toFixed(2)}项目/分钟`);
      break;
    }
    
    // 简要进度显示
    const now = new Date().toLocaleTimeString();
    const progress = (stats.completed / stats.total * 100).toFixed(1);
    console.log(`[${now}] 进度: ${stats.completed}/${stats.total} (${progress}%) | 进行中: ${stats.in_progress} | 失败: ${stats.failed}`);
    
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