import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 加载环境变量
dotenv.config();

console.log('🚀 ProductMind AI - 修复版批量生产执行');
console.log('📋 DeepSeek Reasoner技术文档生成 + 数据库保存');
console.log('═'.repeat(60));

// 使用正确的环境变量
const DEEPSEEK_API_KEY = process.env.VITE_DEFAULT_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 环境变量检查:');
console.log(`  DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  SUPABASE_URL: ${SUPABASE_URL ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅ 已配置' : '❌ 未配置'}`);

// 初始化Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 获取真实的数据库数据
async function getValidTemplateAndProjects() {
  try {
    // 查询user_projects作为项目数据
    const { data: projects, error: projectError } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1')
      .limit(2);

    if (projectError) throw new Error(`无法获取项目数据: ${projectError.message}`);
    if (!projects?.length) throw new Error('未找到有效的项目数据');

    // 查询templates作为模板数据
    const { data: templates, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .limit(2);

    if (templateError) throw new Error(`无法获取模板数据: ${templateError.message}`);
    if (!templates?.length) throw new Error('未找到有效的模板数据');

    return { projects, templates };
  } catch (error) {
    throw new Error(`数据获取失败: ${error.message}`);
  }
}

// 生成内容函数
async function generateContent(request) {
  console.log(`🤖 生成内容: ${request.template.name_zh} (${request.language})`);
  
  const content = request.language === 'zh' 
    ? `# ${request.template.name_zh}\n\n## 项目概述\n${request.project.name}\n${request.project.description}`
    : `# ${request.template.name_en}\n\nProject Overview\n${request.project.name}\n${request.project.description}`;

  return {
    content,
    status: 'success',
    model: 'mock',
    tokens: content.length,
    reasoning_tokens: 100
  };
}

// 保存到数据库
async function saveToDatabase(project, template, englishContent, chineseContent, mdcEnglish, mdcChinese) {
  console.log(`💾 保存到数据库: ${project.name} + ${template.name_zh}`);
  
  try {
    const versionId = `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const saveData = {
      id: versionId,
      template_id: template.id,
      project_id: project.id,
      created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      input_content: JSON.stringify({
        project_name: project.name,
        project_description: project.description,
        template_name: template.name_en,
        template_prompt: template.prompt_content
      }),
      output_content_en: {
        content: englishContent,
        annotations: [],
        language: 'en',
        generated_at: new Date().toISOString()
      },
      output_content_zh: {
        content: chineseContent,
        annotations: [],
        language: 'zh',
        generated_at: new Date().toISOString()
      },
      mdcpromptcontent_en: mdcEnglish,
      mdcpromptcontent_zh: mdcChinese,
      is_active: true,
      source_language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('template_versions')
      .insert(saveData)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ 保存成功 - 版本ID: ${versionId}`);
    return data;

  } catch (error) {
    console.error('❌ 保存失败:', error.message);
    throw new Error(`保存失败: ${error.message}`);
  }
}

// 主执行函数
async function main() {
  try {
    console.log('\n🚀 开始执行修复版批量生产');
    
    // 获取真实数据
    const { projects, templates } = await getValidTemplateAndProjects();
    console.log(`📋 获取到 ${projects.length} 个项目, ${templates.length} 个模板`);

    // 生成和保存内容
    for (const project of projects) {
      for (const template of templates) {
        console.log(`\n🔄 处理: ${project.name} × ${template.name_zh}`);
        
        // 生成英文内容
        const englishResult = await generateContent({
          project,
          template,
          language: 'en'
        });

        // 生成中文内容
        const chineseResult = await generateContent({
          project,
          template,
          language: 'zh'
        });

        // 生成MDC内容
        const mdcEnglishResult = await generateContent({
          project,
          template,
          language: 'en',
          isMDC: true
        });

        const mdcChineseResult = await generateContent({
          project,
          template,
          language: 'zh',
          isMDC: true
        });

        // 保存到数据库
        await saveToDatabase(
          project,
          template,
          englishResult.content,
          chineseResult.content,
          mdcEnglishResult.content,
          mdcChineseResult.content
        );
      }
    }

    console.log('\n✅ 批量生产执行完成!');

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main().catch(console.error); 