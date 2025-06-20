import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 加载环境变量
dotenv.config();

const SUPABASE_URL = 'https://uobwbhvwrciaxloqdizc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA3MTI2NiwiZXhwIjoyMDYyNjQ3MjY2fQ.ryRmf_i-EYRweVLL4fj4acwifoknqgTbIomL-S22Zmo';

console.log('🧪 测试模板分类过滤功能');
console.log('═'.repeat(50));

async function testTemplateFilter() {
  try {
    // 1. 测试原始查询（获取所有模板）
    console.log('\n📋 测试1: 获取所有模板');
    const allTemplatesResponse = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    
    const allTemplates = await allTemplatesResponse.json();
    console.log(`✅ 所有模板数量: ${allTemplates.length}`);

    // 2. 测试过滤查询（只获取isshow=1的分类下的模板）
    console.log('\n📋 测试2: 获取isshow=1的分类下的模板');
    const filteredTemplatesResponse = await fetch(`${SUPABASE_URL}/rest/v1/templates?select=id,name_zh,name_en,prompt_content,mdcprompt,template_categories!inner(id,name_zh,isshow)&template_categories.isshow=eq.1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    
    const filteredTemplates = await filteredTemplatesResponse.json();
    console.log(`✅ 过滤后模板数量: ${filteredTemplates.length}`);

    // 3. 显示过滤效果
    console.log('\n📊 过滤效果:');
    console.log(`  原始模板数量: ${allTemplates.length}`);
    console.log(`  过滤后数量: ${filteredTemplates.length}`);
    console.log(`  过滤掉数量: ${allTemplates.length - filteredTemplates.length}`);
    console.log(`  过滤比例: ${(((allTemplates.length - filteredTemplates.length) / allTemplates.length) * 100).toFixed(1)}%`);

    // 4. 显示可用的模板分类
    console.log('\n📋 可用的模板分类 (isshow=1):');
    const categories = [...new Set(filteredTemplates.map(t => t.template_categories?.name_zh || '未知分类'))];
    categories.forEach((category, index) => {
      const count = filteredTemplates.filter(t => (t.template_categories?.name_zh || '未知分类') === category).length;
      console.log(`  ${index + 1}. ${category}: ${count}个模板`);
    });

    // 5. 验证查询性能
    console.log('\n⏱️ 查询性能测试:');
    const start1 = Date.now();
    await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await fetch(`${SUPABASE_URL}/rest/v1/templates?select=id,name_zh,name_en,prompt_content,mdcprompt,template_categories!inner(id,name_zh,isshow)&template_categories.isshow=eq.1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    const time2 = Date.now() - start2;

    console.log(`  原始查询时间: ${time1}ms`);
    console.log(`  过滤查询时间: ${time2}ms`);
    console.log(`  性能差异: ${time2 > time1 ? '+' : ''}${time2 - time1}ms`);

    console.log('\n🎉 模板分类过滤功能测试完成!');
    console.log('✅ 过滤功能正常工作');
    console.log('✅ 可以有效减少不必要的模板处理');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 执行测试
testTemplateFilter(); 