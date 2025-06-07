#!/usr/bin/env node

/**
 * 可中断可恢复的批量模板生成测试脚本
 * 支持状态管理和进度跟踪
 */

const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取项目模板生成统计信息
async function getStats() {
  console.log('📊 获取项目模板生成统计信息...');
  
  try {
    const response = await fetch(`${BASE_URL}/test/template-generation/stats/${USER_ID}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ 统计信息：');
    console.log(`   - 项目总数: ${result.data.total}`);
    console.log(`   - 待处理: ${result.data.pending}`);
    console.log(`   - 进行中: ${result.data.in_progress}`);
    console.log(`   - 已完成: ${result.data.completed}`);
    console.log(`   - 失败: ${result.data.failed}`);
    
    return result.data;
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error.message);
    return null;
  }
}

// 获取需要生成模板的项目列表
async function getPendingProjects() {
  console.log('🔍 获取需要生成模板的项目...');
  
  try {
    const response = await fetch(`${BASE_URL}/test/template-generation/pending/${USER_ID}?limit=50`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ 找到 ${result.total} 个需要生成模板的项目`);
    
    // 显示前几个项目信息
    if (result.data && result.data.length > 0) {
      console.log('📋 项目列表预览:');
      result.data.slice(0, 5).forEach((project, index) => {
        const status = project.template_generation_status || 'pending';
        const progress = project.template_generation_progress || 0;
        console.log(`   [${index + 1}] ${project.name} - 状态: ${status} (${progress}%)`);
      });
      
      if (result.data.length > 5) {
        console.log(`   ... 还有 ${result.data.length - 5} 个项目`);
      }
    }
    
    return result.data || [];
  } catch (error) {
    console.error('❌ 获取待处理项目失败:', error.message);
    return [];
  }
}

// 启动可恢复批量生成
async function startResumableBatchGeneration(options = {}) {
  console.log('🚀 启动可恢复批量模板生成...');
  
  const defaultOptions = {
    user_id: USER_ID,
    maxConcurrent: 3,
    batchSize: 5,
    languages: ['zh', 'en'],
    skipCompleted: true,
    resumeFromFailure: true
  };
  
  const requestOptions = { ...defaultOptions, ...options };
  
  console.log('⚙️ 生成参数:');
  console.log(`   - 最大并发: ${requestOptions.maxConcurrent}`);
  console.log(`   - 批次大小: ${requestOptions.batchSize}`);
  console.log(`   - 语言: ${requestOptions.languages.join(', ')}`);
  console.log(`   - 跳过已完成: ${requestOptions.skipCompleted}`);
  console.log(`   - 从失败恢复: ${requestOptions.resumeFromFailure}`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/test/template-generation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestOptions)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('🎉 批量生成完成！');
    console.log(`   - 处理项目数: ${result.project_count}`);
    console.log(`   - 处理批次数: ${result.batches_processed}`);
    console.log(`   - 生成模板数: ${result.total_generated}`);
    console.log(`   - 跳过模板数: ${result.total_skipped}`);
    console.log(`   - 失败模板数: ${result.total_failed}`);
    console.log(`   - 总耗时: ${result.execution_time}`);
    
    // 显示项目结果摘要
    if (result.results && result.results.length > 0) {
      console.log('\n📋 项目处理结果:');
      result.results.forEach((projectResult, index) => {
        const status = projectResult.success ? '✅' : '❌';
        console.log(`${status} [${index + 1}] ${projectResult.project_name} - ${projectResult.execution_time}`);
        if (projectResult.success) {
          console.log(`      生成: ${projectResult.generated_count}, 跳过: ${projectResult.skipped_count}, 失败: ${projectResult.failed_count}`);
        } else {
          console.log(`      错误: ${projectResult.error}`);
        }
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ 批量生成失败:', error.message);
    return null;
  }
}

async function main() {
  console.log('🎯 开始可中断可恢复批量模板生成测试...');
  console.log(`📋 目标用户ID: ${USER_ID}`);
  console.log(`🌐 服务器地址: ${BASE_URL}\n`);
  
  const mainStartTime = Date.now();
  
  // 1. 获取当前统计信息
  console.log('='.repeat(50));
  const initialStats = await getStats();
  
  if (!initialStats) {
    console.log('❌ 无法获取统计信息，程序结束');
    return;
  }
  
  // 2. 获取待处理项目
  console.log('\n' + '='.repeat(50));
  const pendingProjects = await getPendingProjects();
  
  if (pendingProjects.length === 0) {
    console.log('🎉 所有项目的模板都已生成完成！');
    return;
  }
  
  // 3. 启动批量生成
  console.log('\n' + '='.repeat(50));
  const batchResult = await startResumableBatchGeneration({
    maxConcurrent: 2, // 降低并发避免过载
    batchSize: 3,     // 小批次便于测试和观察
  });
  
  if (!batchResult) {
    console.log('❌ 批量生成失败');
    return;
  }
  
  // 4. 获取最终统计信息
  console.log('\n' + '='.repeat(50));
  const finalStats = await getStats();
  
  if (finalStats) {
    console.log('\n📈 前后对比:');
    console.log(`   - 已完成: ${initialStats.completed} → ${finalStats.completed} (+${finalStats.completed - initialStats.completed})`);
    console.log(`   - 待处理: ${initialStats.pending} → ${finalStats.pending} (${finalStats.pending - initialStats.pending})`);
    console.log(`   - 失败: ${initialStats.failed} → ${finalStats.failed} (+${finalStats.failed - initialStats.failed})`);
  }
  
  const totalTime = ((Date.now() - mainStartTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 测试完成！');
  console.log(`⏱️  总耗时: ${totalTime}s`);
  console.log('='.repeat(50));
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  main, 
  getStats, 
  getPendingProjects, 
  startResumableBatchGeneration 
}; 