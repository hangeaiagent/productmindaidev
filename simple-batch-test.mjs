import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 加载环境变量
dotenv.config();

// 使用正确的Supabase URL
const SUPABASE_URL = 'https://uobwbhvwrciaxloqdizc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA3MTI2NiwiZXhwIjoyMDYyNjQ3MjY2fQ.ryRmf_i-EYRweVLL4fj4acwifoknqgTbIomL-S22Zmo';

console.log('🔧 环境变量检查:');
console.log(`  SUPABASE_URL: ${SUPABASE_URL ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅ 已配置' : '❌ 未配置'}`);

async function main() {
  try {
    // 1. 获取项目数据
    const projectsResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_projects?user_id=eq.afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1&limit=2`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!projectsResponse.ok) throw new Error(`获取项目失败: ${projectsResponse.status}`);
    const projects = await projectsResponse.json();
    console.log('📋 项目数据:', projects);

    // 2. 获取模板数据
    const templatesResponse = await fetch(`${SUPABASE_URL}/rest/v1/templates?limit=2`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!templatesResponse.ok) throw new Error(`获取模板失败: ${templatesResponse.status}`);
    const templates = await templatesResponse.json();
    console.log('📋 模板数据:', templates);

    // 3. 保存测试版本
    const testVersion = {
      template_id: templates[0].id,
      project_id: projects[0].id,
      created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      input_content: JSON.stringify({
        project_name: projects[0].name,
        project_description: projects[0].description,
        template_name: templates[0].name_en
      }),
      output_content_en: {
        content: 'Test English Content',
        language: 'en',
        generated_at: new Date().toISOString()
      },
      output_content_zh: {
        content: '测试中文内容',
        language: 'zh',
        generated_at: new Date().toISOString()
      },
      mdcpromptcontent_en: 'Test MDC English',
      mdcpromptcontent_zh: '测试MDC中文',
      is_active: true,
      source_language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/template_versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testVersion)
    });

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`保存失败: ${saveResponse.status} ${errorText}`);
    }

    const savedVersion = await saveResponse.json();
    console.log('✅ 保存成功:', savedVersion);

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

main().catch(console.error); 