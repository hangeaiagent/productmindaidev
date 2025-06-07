#!/usr/bin/env node

/**
 * 执行AI编程工具模板数据插入脚本
 */

const fs = require('fs');
const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';

async function executeSQLScript() {
  try {
    console.log('🚀 开始执行AI编程工具模板数据插入...');
    
    // 读取SQL脚本
    const sqlContent = fs.readFileSync('sql/add-ai-programming-templates.sql', 'utf8');
    console.log('📄 SQL脚本读取成功');
    
    // 分解SQL语句（简单分割）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📝 发现 ${sqlStatements.length} 条SQL语句`);
    
    // 模拟执行（实际需要通过Supabase客户端）
    console.log('⚠️  注意：此脚本需要直接数据库访问权限');
    console.log('📋 请手动在Supabase Dashboard中执行以下SQL：');
    console.log('=====================================');
    console.log(sqlContent);
    console.log('=====================================');
    
    // 验证分类和模板是否存在
    console.log('🔍 验证数据是否已存在...');
    
    const checkCategory = await fetch(`${BASE_URL}/test/categories`);
    if (checkCategory.ok) {
      const categories = await checkCategory.json();
      const aiCategory = categories.find(cat => 
        cat.name_en === 'Integrated AI Programming Tool Documentation'
      );
      
      if (aiCategory) {
        console.log('✅ AI编程工具文档分类已存在');
        
        // 检查模板
        const checkTemplates = await fetch(`${BASE_URL}/test/templates?category_id=${aiCategory.id}`);
        if (checkTemplates.ok) {
          const templates = await checkTemplates.json();
          console.log(`✅ 找到 ${templates.length} 个相关模板`);
        }
      } else {
        console.log('❌ AI编程工具文档分类不存在，需要执行SQL脚本');
      }
    }
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
  }
}

// 执行主函数
executeSQLScript(); 