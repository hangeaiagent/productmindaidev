import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 加载环境变量
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 快速测试数据库保存');
console.log('═'.repeat(50));

async function quickTestDatabaseSave() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const testData = {
      id: crypto.randomUUID(),
      template_id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      created_by: '00000000-0000-0000-0000-000000000000', // 系统用户UUID
      output_content_en: {
        content: "Test English content",
        language: 'en',
        generated_at: new Date().toISOString()
      },
      output_content_zh: {
        content: "测试中文内容",
        language: 'zh',
        generated_at: new Date().toISOString()
      },
      mdcpromptcontent_en: "Test MDC English",
      mdcpromptcontent_zh: "测试MDC中文",
      is_active: true,
      created_at: new Date().toISOString()
    };

    console.log('💾 尝试保存测试数据到template_versions表...');
    
    const { data, error } = await supabase
      .from('template_versions')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('❌ 保存失败:', error);
      return false;
    }

    console.log('✅ 保存成功!');
    console.log('📋 保存的数据:', {
      id: data.id,
      template_id: data.template_id,
      project_id: data.project_id,
      size: JSON.stringify(data).length + ' 字节'
    });
    
    return true;
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    return false;
  }
}

quickTestDatabaseSave().then(success => {
  process.exit(success ? 0 : 1);
}); 