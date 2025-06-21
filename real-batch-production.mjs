import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 加载环境变量
dotenv.config();

// 正式生产环境配置
const SUPABASE_URL = 'https://uobwbhvwrciaxloqdizc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA3MTI2NiwiZXhwIjoyMDYyNjQ3MjY2fQ.ryRmf_i-EYRweVLL4fj4acwifoknqgTbIomL-S22Zmo';
const DEEPSEEK_API_KEY = process.env.VITE_DEFAULT_API_KEY || 'sk-567abb67b99d4a65acaa2d9ed06c3782';

console.log('🚀 ProductMind AI - 正式生产批量生成系统');
console.log('📋 DeepSeek Reasoner AI技术文档生成服务');
console.log('═'.repeat(70));

console.log('🔧 生产环境配置检查:');
console.log(`  DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  SUPABASE_URL: ${SUPABASE_URL ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅ 已配置' : '❌ 未配置'}`);

if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 错误: 缺少必要的生产环境配置');
  process.exit(1);
}

// 使用DeepSeek AI生成技术文档内容
async function generateTechnicalContent(project, template, language = 'en') {
  console.log(`🤖 AI生成${language === 'zh' ? '中文' : '英文'}技术文档: ${template.name_zh}`);
  
  try {
    const systemPrompt = `你是一个资深的软件架构师和技术专家，拥有15年以上的大型项目经验。你专门负责为AI和技术项目生成高质量的技术文档。

你的专业能力包括：
1. 深度技术分析和架构设计
2. 前沿技术栈选型和最佳实践
3. 可扩展系统设计和性能优化
4. 完整的技术文档编写

请基于以下项目信息，生成专业、详细、实用的技术文档：

项目信息：
- 项目名称：${project.name}
- 项目描述：${project.description}

文档要求：
- 文档类型：${language === 'zh' ? template.name_zh : template.name_en}
- 语言要求：${language === 'zh' ? '请用中文回答，使用专业的技术术语' : 'Please answer in English with professional technical terminology'}

生成要求：
- 根据项目特点定制技术方案
- 包含具体的技术选型和版本号
- 提供详细的实施步骤和代码示例
- 考虑可扩展性、安全性和性能
- 结构化的文档格式，包含清晰的标题层级
- 长度控制在2000-4000字符之间`;

    const userPrompt = language === 'zh' 
      ? `请为"${project.name}"项目生成详细的${template.name_zh}。这个项目的核心特点是：${project.description.substring(0, 200)}...请根据这些特点生成针对性的技术方案。`
      : `Please generate a detailed ${template.name_en} for the "${project.name}" project. The core characteristics of this project are: ${project.description.substring(0, 200)}... Please generate targeted technical solutions based on these characteristics.`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 6000,
        temperature: 0.2,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message?.content || '';
    const usage = data.usage || {};

    console.log(`✅ AI生成成功: ${content.length}字符, ${usage.total_tokens}tokens, ${usage.reasoning_tokens || 0}推理tokens`);
    
    return {
      content,
      tokens: usage.total_tokens,
      reasoning_tokens: usage.reasoning_tokens || 0
    };

  } catch (error) {
    console.error(`❌ AI生成失败 (${language}):`, error.message);
    throw error;
  }
}

// 使用DeepSeek AI生成MDC开发规范
async function generateMDCContent(project, template, language = 'en') {
  if (!template.mdcprompt) {
    console.log('⚠️ 模板没有MDC prompt，跳过MDC生成');
    return '';
  }

  console.log(`🔧 AI生成${language === 'zh' ? '中文' : '英文'}MDC开发规范...`);
  
  try {
    const systemPrompt = `你是一个资深的软件架构师和技术专家，专门负责为具体项目生成详细的技术实施方案和开发规范。

请根据以下信息生成具体的技术实施方案：

项目信息：
- 项目名称：${project.name}
- 项目描述：${project.description}

MDC开发规范要求：
${template.mdcprompt}

语言要求：${language === 'zh' ? '请用中文回答，使用专业的技术术语' : 'Please answer in English with professional technical terminology'}

生成要求：
- 根据项目的具体特点来定制技术方案
- 提供具体的技术选型和精确的版本号
- 包含实际可行的实施建议和配置示例
- 考虑项目的业务特点和技术复杂度
- 保持结构化的格式，便于开发团队理解和执行
- 长度控制在800-1500字符之间`;

    const userPrompt = language === 'zh'
      ? `请为"${project.name}"项目生成具体的技术实施方案和开发规范。请特别考虑这个项目的特点：${project.description.substring(0, 150)}...`
      : `Please generate specific technical implementation plan and development guidelines for the "${project.name}" project. Please especially consider the characteristics of this project: ${project.description.substring(0, 150)}...`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2500,
        temperature: 0.2,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message?.content || '';
    const usage = data.usage || {};

    console.log(`✅ MDC生成成功: ${content.length}字符, ${usage.total_tokens}tokens`);
    
    return content;

  } catch (error) {
    console.error(`❌ MDC生成失败 (${language}):`, error.message);
    throw error;
  }
}

// 保存到数据库
async function saveToDatabase(project, template, englishContent, chineseContent, mdcEnglish, mdcChinese, stats) {
  console.log(`💾 保存到数据库: ${project.name} + ${template.name_zh}`);
  
  try {
    const saveData = {
      template_id: template.id,
      project_id: project.id,
      created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      input_content: JSON.stringify({
        project_name: project.name,
        project_description: project.description,
        template_name: template.name_en,
        template_prompt: template.prompt_content,
        mdc_prompt: template.mdcprompt,
        generation_timestamp: new Date().toISOString(),
        ai_model: 'deepseek-reasoner'
      }),
      output_content_en: {
        content: englishContent,
        language: 'en',
        generated_at: new Date().toISOString(),
        ai_model: 'deepseek-reasoner',
        tokens: stats.englishTokens,
        reasoning_tokens: stats.englishReasoningTokens
      },
      output_content_zh: {
        content: chineseContent,
        language: 'zh',
        generated_at: new Date().toISOString(),
        ai_model: 'deepseek-reasoner',
        tokens: stats.chineseTokens,
        reasoning_tokens: stats.chineseReasoningTokens
      },
      mdcpromptcontent_en: mdcEnglish,
      mdcpromptcontent_zh: mdcChinese,
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
      body: JSON.stringify(saveData)
    });

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`数据库保存失败: ${saveResponse.status} - ${errorText}`);
    }

    const savedVersion = await saveResponse.json();
    console.log(`✅ 数据库保存成功 - 版本ID: ${savedVersion[0].id}`);
    
    return savedVersion[0];

  } catch (error) {
    console.error('❌ 数据库保存失败:', error.message);
    throw error;
  }
}

// 主执行函数
async function executeProductionBatch(options = {}) {
  const { 
    limitProjects = 10, 
    limitTemplates = 10,
    batchDelay = 3000  // 3秒延迟避免API限制
  } = options;

  console.log('\n🚀 开始正式生产批量生成');
  console.log(`📋 配置: 最多${limitProjects}个项目, 最多${limitTemplates}个模板`);
  console.log('═'.repeat(70));

  const startTime = Date.now();
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    totalTokens: 0,
    totalReasoningTokens: 0,
    details: []
  };

  try {
    // 1. 获取项目数据
    console.log('📋 获取项目数据...');
    const projectsResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_projects?user_id=eq.afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1&limit=${limitProjects}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!projectsResponse.ok) throw new Error(`获取项目失败: ${projectsResponse.status}`);
    const projects = await projectsResponse.json();
    console.log(`✅ 加载了 ${projects.length} 个项目`);

    // 2. 获取模板数据
    console.log('📋 获取模板数据...');
    const templatesResponse = await fetch(`${SUPABASE_URL}/rest/v1/templates?limit=${limitTemplates}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!templatesResponse.ok) throw new Error(`获取模板失败: ${templatesResponse.status}`);
    const templates = await templatesResponse.json();
    console.log(`✅ 加载了 ${templates.length} 个模板`);

    results.total = projects.length * templates.length;
    console.log(`📊 总任务数: ${results.total}`);

    // 3. 逐个处理任务
    let taskNumber = 0;
    for (const project of projects) {
      for (const template of templates) {
        taskNumber++;
        console.log(`\n🔄 任务 ${taskNumber}/${results.total}: ${project.name} + ${template.name_zh}`);
        
        try {
          // 生成英文内容
          console.log('📝 步骤1: 生成英文技术文档...');
          const englishResult = await generateTechnicalContent(project, template, 'en');
          
          // 生成中文内容
          console.log('📝 步骤2: 生成中文技术文档...');
          const chineseResult = await generateTechnicalContent(project, template, 'zh');
          
          // 生成英文MDC内容
          console.log('📝 步骤3: 生成英文MDC规范...');
          const mdcEnglish = await generateMDCContent(project, template, 'en');
          
          // 生成中文MDC内容
          console.log('📝 步骤4: 生成中文MDC规范...');
          const mdcChinese = await generateMDCContent(project, template, 'zh');
          
          // 保存到数据库
          console.log('📝 步骤5: 保存到数据库...');
          const stats = {
            englishTokens: englishResult.tokens,
            englishReasoningTokens: englishResult.reasoning_tokens,
            chineseTokens: chineseResult.tokens,
            chineseReasoningTokens: chineseResult.reasoning_tokens
          };
          
          const savedVersion = await saveToDatabase(
            project, 
            template, 
            englishResult.content, 
            chineseResult.content, 
            mdcEnglish, 
            mdcChinese,
            stats
          );

          results.success++;
          results.totalTokens += stats.englishTokens + stats.chineseTokens;
          results.totalReasoningTokens += stats.englishReasoningTokens + stats.chineseReasoningTokens;
          
          results.details.push({
            task_number: taskNumber,
            project_name: project.name,
            template_name: template.name_zh,
            status: 'success',
            version_id: savedVersion.id,
            content_stats: {
              english_length: englishResult.content.length,
              chinese_length: chineseResult.content.length,
              mdc_english_length: mdcEnglish.length,
              mdc_chinese_length: mdcChinese.length
            },
            token_stats: stats
          });

          console.log(`✅ 任务${taskNumber}完成! 版本ID: ${savedVersion.id}`);
          console.log(`📊 统计: 英文${englishResult.content.length}字符, 中文${chineseResult.content.length}字符`);
          console.log(`🔧 MDC: 英文${mdcEnglish.length}字符, 中文${mdcChinese.length}字符`);
          console.log(`💰 Tokens: ${stats.englishTokens + stats.chineseTokens} (推理: ${stats.englishReasoningTokens + stats.chineseReasoningTokens})`);

        } catch (error) {
          console.error(`❌ 任务${taskNumber}失败:`, error.message);
          results.failed++;
          results.details.push({
            task_number: taskNumber,
            project_name: project.name,
            template_name: template.name_zh,
            status: 'failed',
            error: error.message
          });
        }

        // 任务间延迟
        if (taskNumber < results.total) {
          console.log(`⏸️ 等待${batchDelay/1000}秒...`);
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n🏁 正式生产批量生成完成!');
    console.log('═'.repeat(70));
    console.log('📊 最终统计:');
    console.log(`  总任务数: ${results.total}`);
    console.log(`  成功: ${results.success}`);
    console.log(`  失败: ${results.failed}`);
    console.log(`  成功率: ${((results.success / results.total) * 100).toFixed(1)}%`);
    console.log(`  总执行时间: ${totalTime}秒`);
    console.log(`  总消耗Tokens: ${results.totalTokens}`);
    console.log(`  推理Tokens: ${results.totalReasoningTokens}`);
    console.log(`  平均每任务时间: ${(parseFloat(totalTime) / results.total).toFixed(1)}秒`);

    return {
      success: true,
      stats: results,
      execution_time: `${totalTime}s`,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 批量生成执行失败:', error.message);
    return {
      success: false,
      error: error.message,
      stats: results,
      timestamp: new Date().toISOString()
    };
  }
}

// 执行正式生产批量生成
console.log('💡 启动正式生产批量生成...\n');
executeProductionBatch({ 
  limitProjects: 5, 
  limitTemplates: 5,
  batchDelay: 2000 
}).then(result => {
  if (result.success) {
    console.log('\n🎉 正式生产批量生成全部完成!');
  } else {
    console.log('\n💥 正式生产批量生成出现错误:', result.error);
  }
}).catch(error => {
  console.error('\n💥 系统错误:', error.message);
  process.exit(1);
}); 