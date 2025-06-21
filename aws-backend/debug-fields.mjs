#!/usr/bin/env node

/**
 * 调试字段内容脚本
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeRecord(id) {
  console.log(`🔍 分析记录: ${id}`);
  
  const { data, error } = await supabase
    .from('template_versions')
    .select('*')
    .eq('id', id);
    
  if (error) {
    console.error('查询错误:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('记录不存在');
    return;
  }
  
  const record = data[0];
  
  console.log('字段分析:');
  console.log('output_content_zh:', record.output_content_zh);
  console.log('output_content_en:', record.output_content_en);
  
  // 检查content字段
  const zhContent = record.output_content_zh?.content || '';
  const enContent = record.output_content_en?.content || '';
  
  console.log(`中文内容长度: ${zhContent.length}`);
  console.log(`英文内容长度: ${enContent.length}`);
  console.log(`中文内容: "${zhContent}"`);
  console.log(`英文内容: "${enContent}"`);
}

const id = process.argv[2];
if (id) {
  analyzeRecord(id);
} else {
  console.log('请提供记录ID');
} 