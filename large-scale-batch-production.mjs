import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

// 加载环境变量
dotenv.config();

// 正式生产环境配置
const SUPABASE_URL = 'https://uobwbhvwrciaxloqdizc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA3MTI2NiwiZXhwIjoyMDYyNjQ3MjY2fQ.ryRmf_i-EYRweVLL4fj4acwifoknqgTbIomL-S22Zmo';
const DEEPSEEK_API_KEY = process.env.VITE_DEFAULT_API_KEY || 'sk-567abb67b99d4a65acaa2d9ed06c3782';

// 大规模生产配置
const BATCH_SIZE = 1; // 一次处理一个任务，避免API限制
const API_DELAY = 3000; // 3秒延迟
const SAVE_PROGRESS_INTERVAL = 10; // 每10个任务保存一次进度
const LOG_FILE = 'batch-production.log';

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('日志写入失败:', error.message);
  }
}

// 保存进度到文件
function saveProgress(progress) {
  try {
    fs.writeFileSync('batch-progress.json', JSON.stringify(progress, null, 2));
  } catch (error) {
    log(`保存进度失败: ${error.message}`);
  }
}

// 读取进度文件
function loadProgress() {
  try {
    if (fs.existsSync('batch-progress.json')) {
      const data = fs.readFileSync('batch-progress.json', 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    log(`读取进度文件失败: ${error.message}`);
  }
  return { completedTasks: [], currentIndex: 0 };
}

log('🚀 ProductMind AI - 大规模批量生产系统启动');
log('📋 适用于400+项目的DeepSeek AI技术文档生成');
log('═'.repeat(70));

log('🔧 生产环境配置检查:');
log(`  DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
log(`  SUPABASE_URL: ${SUPABASE_URL ? '✅ 已配置' : '❌ 未配置'}`);
log(`  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅ 已配置' : '❌ 未配置'}`);

if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  log('❌ 错误: 缺少必要的生产环境配置');
  process.exit(1);
}

// 使用DeepSeek AI生成技术文档内容
async function generateTechnicalContent(project, template, language = 'en') {
  log(`🤖 AI生成${language === 'zh' ? '中文' : '英文'}技术文档: ${template.name_zh}`);
  
  try {
    const systemPrompt = `你是一个资深的软件架构师和技术专家，拥有15年以上的大型项目经验。

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
- 提供详细的实施步骤
- 考虑可扩展性、安全性和性能
- 结构化的文档格式
- 长度控制在2000-4000字符之间`;

    const userPrompt = language === 'zh' 
      ? `请为"${project.name}"项目生成详细的${template.name_zh}。`
      : `Please generate a detailed ${template.name_en} for the "${project.name}" project.`;

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
        max_tokens: 4000,
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
    const content = data.choices[0]?.message?.content || '';
    const usage = data.usage || {};

    log(`✅ AI生成成功: ${content.length}字符, ${usage.total_tokens || 0}tokens`);
    
    return {
      content,
      tokens: usage.total_tokens || 0,
      reasoning_tokens: usage.reasoning_tokens || 0
    };

  } catch (error) {
    log(`❌ AI生成失败 (${language}): ${error.message}`);
    throw error;
  }
}

// 使用DeepSeek AI生成MDC开发规范
async function generateMDCContent(project, template, language = 'en') {
  if (!template.mdcprompt) {
    log('⚠️ 模板没有MDC prompt，跳过MDC生成');
    return '';
  }

  log(`🔧 AI生成${language === 'zh' ? '中文' : '英文'}MDC开发规范...`);
  
  try {
    const systemPrompt = `你是一个资深的软件架构师，专门负责为具体项目生成技术实施方案。

项目信息：
- 项目名称：${project.name}
- 项目描述：${project.description}

MDC开发规范要求：
${template.mdcprompt}

语言要求：${language === 'zh' ? '请用中文回答' : 'Please answer in English'}

请生成具体的技术实施方案，长度控制在800-1500字符之间。`;

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
          { role: 'user', content: `请为"${project.name}"项目生成技术实施方案。` }
        ],
        max_tokens: 2000,
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
    const content = data.choices[0]?.message?.content || '';

    log(`✅ MDC生成成功: ${content.length}字符`);
    return content;

  } catch (error) {
    log(`❌ MDC生成失败 (${language}): ${error.message}`);
    return ''; // MDC失败不影响主流程
  }
}

// 保存到数据库
async function saveToDatabase(project, template, englishContent, chineseContent, mdcEnglish, mdcChinese, stats) {
  log(`💾 保存到数据库: ${project.name} + ${template.name_zh}`);
  
  try {
    const saveData = {
      template_id: template.id,
      project_id: project.id,
      created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      input_content: JSON.stringify({
        project_name: project.name,
        project_description: project.description,
        template_name: template.name_en,
        generation_timestamp: new Date().toISOString(),
        ai_model: 'deepseek-reasoner'
      }),
      output_content_en: {
        content: englishContent,
        language: 'en',
        generated_at: new Date().toISOString(),
        ai_model: 'deepseek-reasoner',
        tokens: stats.englishTokens
      },
      output_content_zh: {
        content: chineseContent,
        language: 'zh',
        generated_at: new Date().toISOString(),
        ai_model: 'deepseek-reasoner',
        tokens: stats.chineseTokens
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
    log(`✅ 数据库保存成功 - 版本ID: ${savedVersion[0]?.id || 'unknown'}`);
    
    return savedVersion[0] || {};

  } catch (error) {
    log(`❌ 数据库保存失败: ${error.message}`);
    throw error;
  }
}

// 主执行函数
async function executeLargeScaleBatch() {
  log('\n🚀 开始大规模批量生成');
  log('═'.repeat(70));

  const startTime = Date.now();
  const progress = loadProgress();
  const results = {
    total: 0,
    success: progress.completedTasks ? progress.completedTasks.length : 0,
    failed: 0,
    totalTokens: 0,
    errors: []
  };

  try {
    // 1. 获取所有项目数据
    log('📋 获取所有项目数据...');
    const projectsResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_projects?user_id=eq.afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();
      throw new Error(`获取项目失败: ${projectsResponse.status} - ${errorText}`);
    }
    
    const projects = await projectsResponse.json();
    if (!projects || !Array.isArray(projects)) {
      throw new Error('获取项目数据格式错误');
    }
    
    log(`✅ 加载了 ${projects.length} 个项目`);

    // 2. 获取所有模板数据
    log('📋 获取所有模板数据...');
    const templatesResponse = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!templatesResponse.ok) {
      const errorText = await templatesResponse.text();
      throw new Error(`获取模板失败: ${templatesResponse.status} - ${errorText}`);
    }
    
    const templates = await templatesResponse.json();
    if (!templates || !Array.isArray(templates)) {
      throw new Error('获取模板数据格式错误');
    }
    
    log(`✅ 加载了 ${templates.length} 个模板`);

    // 生成任务列表
    const allTasks = [];
    for (const project of projects) {
      for (const template of templates) {
        const taskId = `${project.id}-${template.id}`;
        if (!progress.completedTasks || !progress.completedTasks.includes(taskId)) {
          allTasks.push({ project, template, taskId });
        }
      }
    }

    results.total = projects.length * templates.length;
    log(`📊 总任务数: ${results.total}`);
    log(`📊 剩余任务数: ${allTasks.length}`);
    log(`📊 已完成任务数: ${progress.completedTasks ? progress.completedTasks.length : 0}`);

    if (allTasks.length === 0) {
      log('🎉 所有任务已完成!');
      return results;
    }

    // 3. 逐个处理剩余任务
    for (let i = 0; i < allTasks.length; i++) {
      const { project, template, taskId } = allTasks[i];
      const taskNumber = (progress.completedTasks ? progress.completedTasks.length : 0) + i + 1;
      
      log(`\n🔄 任务 ${taskNumber}/${results.total}: ${project.name} + ${template.name_zh}`);
      log(`📊 进度: ${((taskNumber / results.total) * 100).toFixed(1)}%`);
      
      try {
        // 生成英文内容
        log('📝 步骤1: 生成英文技术文档...');
        const englishResult = await generateTechnicalContent(project, template, 'en');
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        
        // 生成中文内容
        log('📝 步骤2: 生成中文技术文档...');
        const chineseResult = await generateTechnicalContent(project, template, 'zh');
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        
        // 生成英文MDC内容
        log('📝 步骤3: 生成英文MDC规范...');
        const mdcEnglish = await generateMDCContent(project, template, 'en');
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        
        // 生成中文MDC内容
        log('📝 步骤4: 生成中文MDC规范...');
        const mdcChinese = await generateMDCContent(project, template, 'zh');
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        
        // 保存到数据库
        log('📝 步骤5: 保存到数据库...');
        const stats = {
          englishTokens: englishResult.tokens,
          chineseTokens: chineseResult.tokens
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
        
        if (!progress.completedTasks) {
          progress.completedTasks = [];
        }
        progress.completedTasks.push(taskId);

        log(`✅ 任务${taskNumber}完成! 版本ID: ${savedVersion.id || 'unknown'}`);
        log(`📊 统计: 英文${englishResult.content.length}字符, 中文${chineseResult.content.length}字符`);
        log(`💰 Tokens: ${stats.englishTokens + stats.chineseTokens}`);

        // 定期保存进度
        if (taskNumber % SAVE_PROGRESS_INTERVAL === 0) {
          saveProgress(progress);
          log(`💾 进度已保存 (${taskNumber}/${results.total})`);
        }

      } catch (error) {
        log(`❌ 任务${taskNumber}失败: ${error.message}`);
        results.failed++;
        results.errors.push({
          task_number: taskNumber,
          project_name: project.name,
          template_name: template.name_zh,
          error: error.message
        });
        
        // 失败后等待更长时间
        await new Promise(resolve => setTimeout(resolve, API_DELAY * 2));
      }
    }

    // 保存最终进度
    saveProgress(progress);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    log('\n🏁 大规模批量生成完成!');
    log('═'.repeat(70));
    log('📊 最终统计:');
    log(`  总任务数: ${results.total}`);
    log(`  成功: ${results.success}`);
    log(`  失败: ${results.failed}`);
    log(`  成功率: ${((results.success / results.total) * 100).toFixed(1)}%`);
    log(`  总执行时间: ${totalTime}秒`);
    log(`  总消耗Tokens: ${results.totalTokens}`);
    log(`  平均每任务时间: ${(parseFloat(totalTime) / allTasks.length).toFixed(1)}秒`);

    return results;

  } catch (error) {
    log(`❌ 批量生成执行失败: ${error.message}`);
    throw error;
  }
}

// 错误处理和重启机制
process.on('uncaughtException', (error) => {
  log(`💥 未捕获异常: ${error.message}`);
  log('🔄 系统将在5秒后重启...');
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`💥 未处理的Promise拒绝: ${reason}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  log('\n🛑 接收到中断信号，正在优雅关闭...');
  log('📁 进度已保存到 batch-progress.json');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 接收到终止信号，正在优雅关闭...');
  log('📁 进度已保存到 batch-progress.json');
  process.exit(0);
});

// 启动大规模批量生成
log('💡 启动大规模批量生成...\n');
executeLargeScaleBatch().then(result => {
  log('\n🎉 大规模批量生成全部完成!');
  log(`📊 最终成功率: ${((result.success / result.total) * 100).toFixed(1)}%`);
}).catch(error => {
  log(`\n💥 系统错误: ${error.message}`);
  process.exit(1);
}); 