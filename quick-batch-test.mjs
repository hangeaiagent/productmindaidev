import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 加载环境变量
dotenv.config();

console.log('🚀 ProductMind AI - 快速批量测试');
console.log('═'.repeat(50));

// 环境变量
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 环境检查:');
console.log(`  数据库: ${SUPABASE_URL ? '✅' : '❌'}`);
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 生成技术文档内容
function generateTechDoc(project, lang = 'zh') {
  const isZh = lang === 'zh';
  return isZh 
    ? `# 技术架构设计文档

## 项目: ${project.name}
${project.description || '智能AI解决方案'}

## 技术栈
- 前端: React + TypeScript
- 后端: Node.js + Express  
- 数据库: PostgreSQL + Redis
- 部署: Docker + AWS

## 核心特性
1. 微服务架构设计
2. 高性能数据处理
3. 智能算法优化
4. 用户体验提升`
    : `# Technical Architecture Document

## Project: ${project.name}
${project.description || 'Smart AI Solution'}

## Tech Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL + Redis
- Deploy: Docker + AWS

## Key Features
1. Microservice Architecture
2. High Performance Processing
3. Smart Algorithm Optimization
4. Enhanced User Experience`;
}

// 主测试函数
async function runQuickTest() {
  try {
    // 1. 获取AI项目数据
    console.log('📋 获取用户项目数据...');
    const { data: projects, error } = await supabase
      .from('user_projects')
      .select('id, name, description')
      .limit(2);
    
    if (error) {
      throw new Error(`获取数据失败: ${error.message}`);
    }
    
    console.log(`✅ 获取到 ${projects.length} 个项目`);
    
    // 2. 处理每个项目
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      console.log(`\n🔄 [${i + 1}/${projects.length}] 处理: ${project.name}`);
      
      // 生成技术文档
      console.log('   📝 生成技术文档...');
      const techDocZh = generateTechDoc(project, 'zh');
      const techDocEn = generateTechDoc(project, 'en');
      
      // 更新项目描述
      console.log('   💾 更新数据库...');
      const newDescription = `${project.description || ''}

--- AI生成技术文档 ---
${techDocZh}

--- AI Generated Technical Doc ---
${techDocEn}

--- 生成时间: ${new Date().toLocaleString()} ---`;

      const { data, error: updateError } = await supabase
        .from('user_projects')
        .update({ 
          description: newDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .select('id, name')
        .single();

      if (updateError) {
        console.error(`   ❌ 更新失败: ${updateError.message}`);
      } else {
        console.log(`   ✅ 更新成功: ${data.name}`);
      }
    }
    
    console.log('\n🎉 快速测试完成!');
    return true;
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    return false;
  }
}

// 执行测试
runQuickTest().then(success => {
  process.exit(success ? 0 : 1);
}); 