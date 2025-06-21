#!/usr/bin/env node

/**
 * 调试版模板生成器 - 用于分析字段内容
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 提取内容
 */
function extractContent(outputContent) {
  if (!outputContent || typeof outputContent !== 'object' || !outputContent.content) {
    return '';
  }
  return outputContent.content;
}

/**
 * 调试单条记录
 */
async function debugRecord(templateVersionId) {
  console.log('🔍 调试模式：详细分析记录内容');
  console.log(`目标ID: ${templateVersionId}`);
  console.log('='.repeat(60));
  
  try {
    const { data, error } = await supabase
      .from('template_versions')
      .select(`
        id, 
        project_id, 
        template_id,
        output_content_zh, 
        output_content_en, 
        created_at,
        updated_at,
        templates:template_id (
          name_zh,
          name_en,
          template_categories:category_id (
            name_zh,
            name_en,
            isshow
          )
        )
      `)
      .eq('id', templateVersionId);

    if (error) {
      console.error('❌ 查询失败:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  未找到ID为 ${templateVersionId} 的记录`);
      return;
    }

    const record = data[0];
    
    console.log('📋 记录基本信息:');
    console.log(`   ID: ${record.id}`);
    console.log(`   Project ID: ${record.project_id}`);
    console.log(`   Template ID: ${record.template_id}`);
    console.log(`   Created: ${record.created_at}`);
    console.log(`   Updated: ${record.updated_at}`);
    
    console.log('\n📝 模板信息:');
    if (record.templates) {
      console.log(`   中文名称: ${record.templates.name_zh || 'NULL'}`);
      console.log(`   英文名称: ${record.templates.name_en || 'NULL'}`);
      
      if (record.templates.template_categories) {
        console.log(`   分类中文: ${record.templates.template_categories.name_zh || 'NULL'}`);
        console.log(`   分类英文: ${record.templates.template_categories.name_en || 'NULL'}`);
        console.log(`   分类可见: ${record.templates.template_categories.isshow}`);
      } else {
        console.log('   分类信息: NULL');
      }
    } else {
      console.log('   模板信息: NULL');
    }
    
    console.log('\n📄 内容字段详细分析:');
    
    // 分析中文内容字段
    console.log('🇨🇳 output_content_zh:');
    console.log(`   类型: ${typeof record.output_content_zh}`);
    console.log(`   是否为null: ${record.output_content_zh === null}`);
    console.log(`   是否为undefined: ${record.output_content_zh === undefined}`);
    console.log(`   原始值:`, record.output_content_zh);
    
    if (record.output_content_zh && typeof record.output_content_zh === 'object') {
      console.log(`   对象键: [${Object.keys(record.output_content_zh).join(', ')}]`);
      if (record.output_content_zh.content !== undefined) {
        const zhContent = record.output_content_zh.content;
        console.log(`   content字段类型: ${typeof zhContent}`);
        console.log(`   content字段长度: ${zhContent?.length || 0}`);
        console.log(`   content内容预览: "${String(zhContent).substring(0, 100)}..."`);
      } else {
        console.log(`   content字段: 不存在`);
      }
    }
    
    const extractedZh = extractContent(record.output_content_zh);
    console.log(`   提取后内容长度: ${extractedZh.length}`);
    console.log(`   提取后内容: "${extractedZh.substring(0, 200)}..."`);
    
    // 分析英文内容字段
    console.log('\n🇺🇸 output_content_en:');
    console.log(`   类型: ${typeof record.output_content_en}`);
    console.log(`   是否为null: ${record.output_content_en === null}`);
    console.log(`   是否为undefined: ${record.output_content_en === undefined}`);
    console.log(`   原始值:`, record.output_content_en);
    
    if (record.output_content_en && typeof record.output_content_en === 'object') {
      console.log(`   对象键: [${Object.keys(record.output_content_en).join(', ')}]`);
      if (record.output_content_en.content !== undefined) {
        const enContent = record.output_content_en.content;
        console.log(`   content字段类型: ${typeof enContent}`);
        console.log(`   content字段长度: ${enContent?.length || 0}`);
        console.log(`   content内容预览: "${String(enContent).substring(0, 100)}..."`);
      } else {
        console.log(`   content字段: 不存在`);
      }
    }
    
    const extractedEn = extractContent(record.output_content_en);
    console.log(`   提取后内容长度: ${extractedEn.length}`);
    console.log(`   提取后内容: "${extractedEn.substring(0, 200)}..."`);
    
    // 内容质量判断
    console.log('\n📊 内容质量判断:');
    const hasValidZh = extractedZh && extractedZh.length > 10;
    const hasValidEn = extractedEn && extractedEn.length > 10;
    const hasValidContent = hasValidZh || hasValidEn;
    
    console.log(`   中文内容有效: ${hasValidZh} (长度 > 10: ${extractedZh.length} > 10)`);
    console.log(`   英文内容有效: ${hasValidEn} (长度 > 10: ${extractedEn.length} > 10)`);
    console.log(`   整体内容有效: ${hasValidContent}`);
    
    if (!hasValidContent) {
      console.log('\n⚠️  结论: 记录内容为空，会被跳过处理');
      console.log('   原因: 中文和英文内容长度都 ≤ 10 字符');
    } else {
      console.log('\n✅ 结论: 记录内容有效，可以处理');
    }
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  }
}

// 主执行
async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  const targetId = idIndex !== -1 && args[idIndex + 1] ? args[idIndex + 1] : null;
  
  if (!targetId) {
    console.log('❌ 请提供要调试的记录ID');
    console.log('用法: node debug-template-generator.mjs --id <record_id>');
    process.exit(1);
  }
  
  await debugRecord(targetId);
}

main().catch(console.error); 