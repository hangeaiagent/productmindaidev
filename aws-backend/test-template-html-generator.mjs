#!/usr/bin/env node

/**
 * 模板HTML生成器测试脚本
 * 用于测试单个记录的HTML生成功能
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 模板HTML生成器测试');
console.log('═'.repeat(40));

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 环境变量未设置');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * 测试数据查询
 */
async function testDataQuery() {
  console.log('🔍 测试数据查询...');
  
  try {
    // 先测试简单查询
    const { data: allData, error: allError } = await supabase
      .from('template_versions')
      .select('id, template_id, project_id')
      .limit(5);
    
    if (allError) {
      throw new Error(`基础查询失败: ${allError.message}`);
    }
    
    console.log(`✅ 基础查询成功，找到 ${allData?.length || 0} 条记录`);
    
    if (allData && allData.length > 0) {
      console.log('📋 示例记录:');
      allData.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}, 模板ID: ${item.template_id}`);
      });
    }
    
    // 尝试使用 contains 查询
    const { data, error } = await supabase
      .from('template_versions')
      .select(`
        id,
        template_id,
        project_id,
        created_at,
        output_content_zh,
        output_content_en,
        mdcpromptcontent_zh,
        mdcpromptcontent_en,
        templates!inner (
          id,
          name_zh,
          name_en
        ),
        user_projects!inner (
          id,
          name,
          name_zh,
          name_en,
          description,
          description_zh,
          description_en
        )
      `)
      .contains('template_id', '10000000-0000-0000-0000-000000000')
      .limit(1);
    
    if (error) {
      console.log('⚠️  带条件查询失败，尝试使用第一条记录...');
      // 如果条件查询失败，使用第一条记录
      if (allData && allData.length > 0) {
        const { data: detailData, error: detailError } = await supabase
          .from('template_versions')
          .select(`
            id,
            template_id,
            project_id,
            created_at,
            output_content_zh,
            output_content_en,
            mdcpromptcontent_zh,
            mdcpromptcontent_en,
            templates!inner (
              id,
              name_zh,
              name_en
            ),
            user_projects!inner (
              id,
              name,
              name_zh,
              name_en,
              description,
              description_zh,
              description_en
            )
          `)
          .eq('id', allData[0].id)
          .limit(1);
        
        if (detailError) {
          throw new Error(`详细查询失败: ${detailError.message}`);
        }
        
        return detailData?.[0] || null;
      }
      throw new Error(`条件查询失败: ${error.message}`);
    }
    
    console.log(`✅ 条件查询成功，找到 ${data?.length || 0} 条记录`);
    
    if (data && data.length > 0) {
      console.log('📋 示例数据结构:');
      const sample = data[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   项目ID: ${sample.project_id}`);
      console.log(`   模板ID: ${sample.template_id}`);
      console.log(`   项目名称: ${sample.user_projects?.name || '未设置'}`);
      console.log(`   模板名称: ${sample.templates?.name_zh || '未设置'}`);
      console.log(`   中文内容: ${sample.output_content_zh ? '存在' : '不存在'}`);
      console.log(`   英文内容: ${sample.output_content_en ? '存在' : '不存在'}`);
      
      return sample;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 查询失败:', error);
    return null;
  }
}

/**
 * 测试HTML生成
 */
function testHtmlGeneration(data) {
  console.log('\n🔧 测试HTML生成...');
  
  // 模拟生成HTML内容
  const zhTitle = `${data.user_projects?.name_zh || data.user_projects?.name || 'Unknown Project'} - ${data.templates?.name_zh || 'Unknown Template'}`;
  const enTitle = `${data.user_projects?.name_en || data.user_projects?.name || 'Unknown Project'} - ${data.templates?.name_en || data.templates?.name_zh || 'Unknown Template'}`;
  
  console.log('📄 生成的页面信息:');
  console.log(`   中文标题: ${zhTitle}`);
  console.log(`   英文标题: ${enTitle}`);
  console.log(`   项目ID: ${data.project_id}`);
  console.log(`   模板版本ID: ${data.id}`);
  
  // 预览目录结构
  const outputDir = path.join(__dirname, '..', 'pdhtml');
  const projectDir = path.join(outputDir, data.project_id);
  // 使用template_version_id作为文件名（data.id就是template_version_id）
  const zhFilePath = path.join(projectDir, `${data.id}.html`);
  const enFilePath = path.join(projectDir, `${data.id}en.html`);
  
  console.log('\n📁 将要生成的文件:');
  console.log(`   中文版本: ${zhFilePath}`);
  console.log(`   英文版本: ${enFilePath}`);
  
  return { zhFilePath, enFilePath };
}

/**
 * 测试数据库字段
 */
async function testDatabaseFields() {
  console.log('\n🔧 测试数据库字段...');
  
  try {
    console.log('💡 提示：需要在template_versions表中添加以下字段:');
    console.log('   - cnhtmlpath (text): 中文HTML文件相对路径');
    console.log('   - enhtmlpath (text): 英文HTML文件相对路径');
    console.log('\n📋 SQL语句示例:');
    console.log('   ALTER TABLE template_versions ADD COLUMN cnhtmlpath text;');
    console.log('   ALTER TABLE template_versions ADD COLUMN enhtmlpath text;');
    
    // 测试字段是否存在（通过查询一条记录）
    const { data, error } = await supabase
      .from('template_versions')
      .select('id, cnhtmlpath, enhtmlpath')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('⚠️  字段不存在，需要手动添加');
      } else {
        console.log('❌ 测试字段时出错:', error.message);
      }
    } else {
      console.log('✅ 字段已存在或可以访问');
    }
    
  } catch (error) {
    console.error('❌ 测试字段失败:', error.message);
  }
}

/**
 * 测试目录创建
 */
function testDirectoryCreation() {
  console.log('\n📁 测试目录创建...');
  
  const outputDir = path.join(__dirname, '..', 'pdhtml');
  const testProjectDir = path.join(outputDir, 'test-project-id');
  
  try {
    // 创建测试目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ 创建主目录: ${outputDir}`);
    } else {
      console.log(`✅ 主目录已存在: ${outputDir}`);
    }
    
    if (!fs.existsSync(testProjectDir)) {
      fs.mkdirSync(testProjectDir, { recursive: true });
      console.log(`✅ 创建测试项目目录: ${testProjectDir}`);
    } else {
      console.log(`✅ 测试项目目录已存在: ${testProjectDir}`);
    }
    
    // 清理测试目录
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
      console.log(`🧹 清理测试目录: ${testProjectDir}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 目录操作失败:', error);
    return false;
  }
}

/**
 * 测试JSON解析
 */
function testJsonParsing() {
  console.log('\n🔧 测试JSON解析...');
  
  // 测试不同格式的JSON内容
  const testCases = [
    '{"content": "这是测试内容"}',
    '{"markdown": "# 标题\\n\\n这是**粗体**文本"}',
    '{"text": "简单文本内容"}',
    '直接字符串内容',
    null,
    undefined
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`   测试案例 ${index + 1}:`);
    try {
      let parsed = testCase;
      if (typeof testCase === 'string') {
        try {
          parsed = JSON.parse(testCase);
        } catch (e) {
          parsed = { content: testCase };
        }
      }
      
      const content = parsed?.content || parsed?.markdown || parsed?.text || '';
      console.log(`   ✅ 解析成功: "${content.substring(0, 30)}..."`);
    } catch (error) {
      console.log(`   ❌ 解析失败: ${error.message}`);
    }
  });
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始执行所有测试...\n');
  
  try {
    // 1. 测试数据查询
    const sampleData = await testDataQuery();
    
    if (!sampleData) {
      console.log('⚠️  没有找到测试数据，跳过后续测试');
      return;
    }
    
    // 2. 测试HTML生成
    testHtmlGeneration(sampleData);
    
    // 3. 测试数据库字段
    await testDatabaseFields();
    
    // 4. 测试目录创建
    testDirectoryCreation();
    
    // 5. 测试JSON解析
    testJsonParsing();
    
    console.log('\n' + '═'.repeat(40));
    console.log('✅ 所有测试完成！');
    console.log('\n💡 下一步操作:');
    console.log('   1. 确保数据库字段已添加 (cnhtmlpath, enhtmlpath)');
    console.log('   2. 运行主生成器: node template-html-generator.mjs');
    console.log('   3. 检查生成的HTML文件');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('\n🎉 测试脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试脚本执行失败:', error);
      process.exit(1);
    });
} 