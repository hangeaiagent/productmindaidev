import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function checkRealIds() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // 查询真实的AI产品
    const { data: products, error: productError } = await supabase
      .from('ai_products')
      .select('id, name')
      .limit(3);
    
    if (productError) {
      console.error('❌ 查询AI产品失败:', productError);
      return;
    }
    
    // 查询真实的模板
    const { data: templates, error: templateError } = await supabase
      .from('templates')
      .select('id, name')
      .limit(3);
    
    if (templateError) {
      console.error('❌ 查询模板失败:', templateError);
      return;
    }
    
    console.log('📋 可用AI产品:');
    products.forEach(p => console.log(`  ${p.id} - ${p.name}`));
    
    console.log('\n📋 可用模板:');
    templates.forEach(t => console.log(`  ${t.id} - ${t.name}`));
    
    if (products.length > 0 && templates.length > 0) {
      console.log('\n✅ 使用这些ID进行测试:');
      console.log(`产品ID: ${products[0].id}`);
      console.log(`模板ID: ${templates[0].id}`);
    }
    
  } catch (error) {
    console.error('💥 查询失败:', error.message);
  }
}

checkRealIds(); 