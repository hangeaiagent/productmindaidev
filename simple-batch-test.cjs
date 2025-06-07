#!/usr/bin/env node

/**
 * 简化版批量项目模板生成
 * 基于之前成功的生成案例
 */

const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchProjects() {
  console.log('🔍 搜索符合条件的项目...');
  
  try {
    const response = await fetch(`${BASE_URL}/test/projects/search?user_id=${USER_ID}&has_category=true&limit=10`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ 找到 ${result.total} 个符合条件的项目`);
    
    // 只选择前几个项目进行测试
    return result.data?.slice(0, 5) || [];
  } catch (error) {
    console.error('❌ 搜索项目失败:', error.message);
    return [];
  }
}

async function generateTemplatesForProject(project) {
  console.log(`🚀 开始为项目生成模板: ${project.name}`);
  
  try {
    const startTime = Date.now();
    
    // 使用之前成功的双语生成参数
    const requestBody = {
      project_id: project.id,
      languages: ['zh', 'en'], 
      batchSize: 25,
      testMode: false,
      concurrent: true,
      maxConcurrent: 5
    };
    
    // 直接调用test/batch-projects-generate接口，这个接口支持多项目批量生成
    const response = await fetch(`${BASE_URL}/test/batch-projects-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_ids: [project.id], // 指定单个项目ID
        testMode: false,
        concurrent: true,
        maxConcurrent: 5
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ 项目 ${project.name} 处理完成:`);
    console.log(`   - 状态: ${result.success ? '成功' : '失败'}`);
    console.log(`   - 项目数: ${result.project_count || 0}`);
    console.log(`   - 生成总数: ${result.total_generated || 0}`);
    console.log(`   - 耗时: ${duration}s`);
    
    if (result.results && result.results.length > 0) {
      const projectResult = result.results[0];
      console.log(`   - 项目状态: ${projectResult.success ? '成功' : '失败'}`);
      if (projectResult.error) {
        console.log(`   - 错误: ${projectResult.error}`);
      }
    }
    
    return {
      project_id: project.id,
      project_name: project.name,
      success: result.success,
      result: result,
      duration: `${duration}s`
    };
    
  } catch (error) {
    console.error(`❌ 项目 ${project.name} 生成失败:`, error.message);
    
    return {
      project_id: project.id,
      project_name: project.name,
      success: false,
      error: error.message,
      duration: '0s'
    };
  }
}

async function main() {
  console.log('🎯 开始简化版批量项目模板生成...');
  console.log(`📋 目标用户ID: ${USER_ID}`);
  console.log(`🌐 服务器地址: ${BASE_URL}`);
  
  const startTime = Date.now();
  
  // 1. 搜索符合条件的项目（限制数量进行测试）
  const projects = await searchProjects();
  
  if (projects.length === 0) {
    console.log('❌ 未找到符合条件的项目，程序结束');
    return;
  }
  
  console.log(`📊 准备为 ${projects.length} 个项目生成模板\n`);
  
  // 2. 为每个项目生成模板
  const results = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    console.log(`\n[${i + 1}/${projects.length}] 处理项目: ${project.name}`);
    console.log(`   分类: ${project.primary_category} / ${project.secondary_category || '无'}`);
    
    const result = await generateTemplatesForProject(project);
    results.push(result);
    
    if (result.success) {
      totalSuccess++;
    } else {
      totalFailed++;
    }
    
    // 在项目之间稍作延迟
    if (i < projects.length - 1) {
      console.log('   ⏳ 等待5秒...');
      await delay(5000);
    }
  }
  
  // 3. 输出总结
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 批量生成完成！');
  console.log('='.repeat(60));
  console.log(`📊 项目总数: ${projects.length}`);
  console.log(`✅ 成功项目: ${totalSuccess} 个`);
  console.log(`❌ 失败项目: ${totalFailed} 个`);
  console.log(`⏱️  总耗时: ${totalTime}s`);
  console.log('='.repeat(60));
  
  // 详细结果
  console.log('\n📋 详细结果:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} [${index + 1}] ${result.project_name} - ${result.duration}`);
    if (!result.success && result.error) {
      console.log(`      错误: ${result.error}`);
    }
  });
  
  console.log('\n✨ 任务完成！');
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 