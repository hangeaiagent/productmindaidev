#!/usr/bin/env node

/**
 * 批量为符合条件的项目生成模板
 * 查询 user_projects 表中 user_id='afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1' 且 primary_category is not null 的项目
 * 然后为每个项目调用模板生成接口
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
    const response = await fetch(`${BASE_URL}/test/projects/search?user_id=${USER_ID}&has_category=true&limit=50`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ 找到 ${result.total} 个符合条件的项目`);
    
    return result.data || [];
  } catch (error) {
    console.error('❌ 搜索项目失败:', error.message);
    return [];
  }
}

async function generateTemplatesForProject(project) {
  console.log(`🚀 开始为项目生成模板: ${project.name} (${project.id})`);
  
  try {
    const startTime = Date.now();
    
    const requestBody = {
      project_id: project.id,
      batchSize: 25,
      testMode: false, // 真实模式
      concurrent: true,
      maxConcurrent: 5
    };
    
    const response = await fetch(`${BASE_URL}/test/batch-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ 项目 ${project.name} 完成:`);
    console.log(`   - 生成: ${result.generated_count || 0} 个模板`);
    console.log(`   - 跳过: ${result.skipped_count || 0} 个模板`);
    console.log(`   - 失败: ${result.failed_count || 0} 个模板`);
    console.log(`   - 耗时: ${duration}s`);
    
    return {
      project_id: project.id,
      project_name: project.name,
      success: true,
      ...result,
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
  console.log('🎯 开始批量项目模板生成...');
  console.log(`📋 目标用户ID: ${USER_ID}`);
  console.log(`🌐 服务器地址: ${BASE_URL}`);
  
  const startTime = Date.now();
  
  // 1. 搜索符合条件的项目
  const projects = await searchProjects();
  
  if (projects.length === 0) {
    console.log('❌ 未找到符合条件的项目，程序结束');
    return;
  }
  
  console.log(`📊 准备为 ${projects.length} 个项目生成模板\n`);
  
  // 2. 为每个项目生成模板
  const results = [];
  let totalGenerated = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    console.log(`\n[${i + 1}/${projects.length}] 处理项目: ${project.name}`);
    console.log(`   分类: ${project.primary_category} / ${project.secondary_category || '无'}`);
    
    const result = await generateTemplatesForProject(project);
    results.push(result);
    
    if (result.success) {
      totalGenerated += result.generated_count || 0;
    } else {
      totalFailed++;
    }
    
    // 在项目之间稍作延迟，避免过度请求
    if (i < projects.length - 1) {
      console.log('   ⏳ 等待3秒...');
      await delay(3000);
    }
  }
  
  // 3. 输出总结
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 批量生成完成！');
  console.log('='.repeat(60));
  console.log(`📊 项目总数: ${projects.length}`);
  console.log(`✅ 成功生成: ${totalGenerated} 个模板`);
  console.log(`❌ 项目失败: ${totalFailed} 个`);
  console.log(`⏱️  总耗时: ${totalTime}s`);
  console.log('='.repeat(60));
  
  // 详细结果
  console.log('\n📋 详细结果:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} [${index + 1}] ${result.project_name} - ${result.duration}`);
    if (result.success) {
      console.log(`      生成: ${result.generated_count || 0}, 跳过: ${result.skipped_count || 0}, 失败: ${result.failed_count || 0}`);
    } else {
      console.log(`      错误: ${result.error}`);
    }
  });
  
  console.log('\n✨ 所有任务完成！');
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, searchProjects, generateTemplatesForProject }; 