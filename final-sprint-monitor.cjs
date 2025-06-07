#!/usr/bin/env node

/**
 * 最终冲刺监控脚本
 * 持续跟踪直到全部436个项目完成
 */

const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
const CHECK_INTERVAL = 30 * 1000; // 30秒检查一次
const TARGET_TOTAL = 436;

let startTime = Date.now();
let lastCompleted = 413; // 当前已完成数量

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

// 启动任务（如果需要）
async function startTaskIfNeeded(stats) {
  if (stats.in_progress === 0 && stats.pending > 0) {
    console.log('🚀 启动最终批次处理...');
    try {
      const response = await fetch(`${BASE_URL}/test/template-generation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          maxConcurrent: 2,
          batchSize: 5,
          languages: ['zh', 'en'],
          skipCompleted: true,
          resumeFromFailure: true
        })
      });
      
      if (response.ok) {
        console.log('✅ 任务启动成功');
      }
    } catch (error) {
      console.error(`❌ 启动任务失败: ${error.message}`);
    }
  }
}

// 格式化时间
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
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

// 计算预计完成时间
function estimateCompletion(completed, pending, timeElapsed) {
  if (completed <= lastCompleted) return "计算中...";
  
  const progress = completed - lastCompleted;
  const rate = progress / (timeElapsed / 60000); // 每分钟完成数
  
  if (rate > 0) {
    const remainingMinutes = pending / rate;
    return `约${Math.ceil(remainingMinutes)}分钟`;
  }
  return "计算中...";
}

// 主监控循环
async function monitor() {
  console.log('🏁 最终冲刺监控启动！');
  console.log(`🎯 目标: 完成全部 ${TARGET_TOTAL} 个项目`);
  console.log(`📊 起始状态: ${lastCompleted} 个已完成\n`);
  
  while (true) {
    const stats = await getStats();
    
    if (!stats) {
      await delay(CHECK_INTERVAL);
      continue;
    }
    
    const { total, pending, in_progress, completed, failed } = stats;
    const timeElapsed = Date.now() - startTime;
    const progress = ((completed / total) * 100).toFixed(1);
    const newCompletions = completed - lastCompleted;
    
    // 检查是否需要启动任务
    await startTaskIfNeeded(stats);
    
    // 显示当前状态
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    if (newCompletions > 0) {
      console.log(`[${timestamp}] 🎉 新完成 ${newCompletions} 个项目！总进度: ${completed}/${total} (${progress}%)`);
      lastCompleted = completed;
    } else {
      console.log(`[${timestamp}] 📊 进度: ${completed}/${total} (${progress}%) | 进行中: ${in_progress} | 待处理: ${pending}`);
    }
    
    // 检查是否全部完成
    if (completed >= TARGET_TOTAL) {
      console.log('\n🎊🎊🎊 恭喜！批量模板生成任务全部完成！🎊🎊🎊');
      console.log(`✅ 总共完成: ${completed}/${total} 个项目`);
      console.log(`⏰ 总耗时: ${formatTime(timeElapsed)}`);
      console.log(`🚀 成功率: ${((completed / total) * 100).toFixed(1)}%`);
      break;
    }
    
    // 每5分钟显示详细报告
    if (Math.floor(timeElapsed / 300000) > Math.floor((timeElapsed - CHECK_INTERVAL) / 300000)) {
      console.log('\n' + '='.repeat(60));
      console.log('📊 【最终冲刺报告】');
      console.log('='.repeat(60));
      console.log(`📈 总体进度: ${completed}/${total} (${progress}%)`);
      console.log(`⏳ 剩余项目: ${pending + in_progress}个`);
      console.log(`🔄 进行中: ${in_progress}个`);
      console.log(`⏰ 运行时间: ${formatTime(timeElapsed)}`);
      console.log(`🎯 预计完成: ${estimateCompletion(completed, pending + in_progress, timeElapsed)}`);
      console.log('='.repeat(60) + '\n');
    }
    
    await delay(CHECK_INTERVAL);
  }
}

// 启动监控
monitor().catch(console.error); 