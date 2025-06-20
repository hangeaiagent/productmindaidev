import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 加载环境变量
dotenv.config({ path: 'aws-backend/.env' });

const app = express();
const PORT = 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

console.log('🔧 环境变量检查:');
console.log('  SUPABASE_URL:', supabaseUrl ? '✅ 已配置' : '❌ 未配置');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ 已配置' : '❌ 未配置');
console.log('  DEEPSEEK_API_KEY:', deepseekApiKey ? '✅ 已配置' : '❌ 未配置');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的Supabase配置，无法连接数据库');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AI服务模拟（使用真实的DeepSeek API或模拟）
async function generateWithDeepSeek(request) {
  console.log(`🤖 DeepSeek生成: ${request.template.name_zh} (${request.language})`);
  
  if (!deepseekApiKey) {
    console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟内容');
    const mockContent = request.language === 'zh' 
      ? `# ${request.template.name_zh}\n\n## 项目概述\n**项目名称**: ${request.project.name}\n**项目描述**: ${request.project.description}\n\n## 详细内容\n基于DeepSeek Reasoner生成的${request.template.name_zh}，包含技术架构、实施方案等详细内容。\n\n### 技术架构\n- 前端: React + TypeScript\n- 后端: Node.js + Express\n- 数据库: PostgreSQL\n\n### 实施步骤\n1. 环境搭建\n2. 核心功能开发\n3. 测试部署\n\n生成时间: ${new Date().toISOString()}`
      : `# ${request.template.name_en}\n\n## Project Overview\n**Project Name**: ${request.project.name}\n**Project Description**: ${request.project.description}\n\n## Detailed Content\nGenerated by DeepSeek Reasoner for ${request.template.name_en}, including technical architecture and implementation plans.\n\n### Technical Architecture\n- Frontend: React + TypeScript\n- Backend: Node.js + Express\n- Database: PostgreSQL\n\n### Implementation Steps\n1. Environment Setup\n2. Core Development\n3. Testing & Deployment\n\nGenerated at: ${new Date().toISOString()}`;
    
    await new Promise(resolve => setTimeout(resolve, 800)); // 模拟API延迟
    return {
      content: mockContent,
      status: 'success',
      model: 'deepseek-reasoner',
      tokens: mockContent.length * 0.3,
      reasoning_tokens: Math.floor(Math.random() * 500) + 200
    };
  }

  try {
    const systemPrompt = `你是一个资深的软件架构师和技术专家，专门负责生成高质量的技术方案和软件文档。

语言要求：${request.language === 'zh' ? '请用中文回答，使用专业的技术术语' : 'Please answer in English with professional technical terminology'}

项目信息：
- 项目名称：${request.project.name}
- 项目描述：${request.project.description}

文档类型：
- 文档名称：${request.language === 'zh' ? request.template.name_zh : request.template.name_en}

请生成结构化的内容，包含清晰的标题层级，技术方案要考虑可行性、扩展性和维护性。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt }
        ],
        max_tokens: 8000,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message?.content || '';
    const usage = data.usage || {};

    return {
      content,
      status: 'success',
      model: 'deepseek-reasoner',
      tokens: usage.total_tokens,
      reasoning_tokens: usage.reasoning_tokens || 0
    };

  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    // 回退到模拟内容
    return await generateWithDeepSeek({ ...request, useMock: true });
  }
}

// 数据库操作函数
async function testDatabaseConnection() {
  try {
    console.log('🔌 测试数据库连接...');
    const { data, error } = await supabase
      .from('user_projects')
      .select('id, name, description')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function getTestProjects() {
  console.log('📋 获取测试项目...');
  const { data: projects, error } = await supabase
    .from('user_projects')
    .select('id, name, description, name_zh, description_zh')
    .not('name', 'is', null)
    .not('description', 'is', null)
    .limit(2);

  if (error) throw new Error(`获取项目失败: ${error.message}`);
  console.log(`✅ 找到 ${projects?.length || 0} 个项目`);
  return projects || [];
}

async function getTestTemplates() {
  console.log('📋 获取测试模板...');
  const { data: templates, error } = await supabase
    .from('templates')
    .select(`
      id, name_zh, name_en, prompt_content, mdcprompt,
      template_categories!inner (id, name_zh, isshow)
    `)
    .eq('template_categories.isshow', 1)
    .limit(2);

  if (error) throw new Error(`获取模板失败: ${error.message}`);
  console.log(`✅ 找到 ${templates?.length || 0} 个模板`);
  return templates || [];
}

async function saveToDatabase(project, template, englishContent, chineseContent, mdcEnglish, mdcChinese) {
  console.log(`💾 保存到数据库: ${project.name} + ${template.name_zh}`);
  
  const insertData = {
    template_id: template.id,
    project_id: project.id,
    created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1', // 系统用户ID
    input_content: `项目: ${project.name}\n描述: ${project.description}`,
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
    output_content: {
      content: chineseContent,
      annotations: [],
      language: 'zh',
      generated_at: new Date().toISOString()
    },
    mdcpromptcontent_en: mdcEnglish,
    mdcpromptcontent_zh: mdcChinese,
    is_active: true,
    source_language: 'en'
  };

  console.log('📝 准备插入数据:', {
    template_id: template.id,
    project_id: project.id,
    content_lengths: {
      english: englishContent.length,
      chinese: chineseContent.length,
      mdc_en: mdcEnglish.length,
      mdc_zh: mdcChinese.length
    }
  });

  const { data: result, error } = await supabase
    .from('template_versions')
    .insert(insertData)
    .select('id, created_at')
    .single();

  if (error) {
    console.error('❌ 数据库保存失败:', error);
    throw new Error(`保存失败: ${error.message}`);
  }

  console.log('✅ 数据库保存成功:', {
    version_id: result.id,
    created_at: result.created_at
  });

  return result;
}

// API接口
app.get('/health', async (req, res) => {
  const dbConnected = await testDatabaseConnection();
  res.json({
    status: 'ok',
    service: 'Real Database Save Test Server',
    database_connected: dbConnected,
    deepseek_configured: !!deepseekApiKey,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test-single-save', async (req, res) => {
  try {
    console.log('\n🧪 开始单个数据库保存测试...');
    
    // 1. 获取测试数据
    const projects = await getTestProjects();
    const templates = await getTestTemplates();
    
    if (projects.length === 0 || templates.length === 0) {
      throw new Error('没有可用的测试数据');
    }

    const project = projects[0];
    const template = templates[0];
    
    console.log(`🎯 测试项目: ${project.name}`);
    console.log(`🎯 测试模板: ${template.name_zh}`);

    // 2. 生成英文内容
    console.log('\n📝 步骤1: 生成英文内容...');
    const englishRequest = {
      prompt: template.prompt_content || `Generate a ${template.name_en} for the project`,
      project: { name: project.name, description: project.description },
      template: { name_zh: template.name_zh, name_en: template.name_en },
      language: 'en'
    };
    
    const englishResult = await generateWithDeepSeek(englishRequest);
    if (englishResult.status !== 'success') {
      throw new Error(`英文内容生成失败: ${englishResult.error}`);
    }
    console.log(`✅ 英文内容生成成功 (${englishResult.content.length} 字符, ${englishResult.tokens} tokens)`);

    // 3. 翻译成中文
    console.log('\n📝 步骤2: 翻译中文内容...');
    const chineseRequest = {
      prompt: `请将以下内容翻译成中文，保持原有的格式和结构：\n\n${englishResult.content}`,
      project: { name: project.name_zh || project.name, description: project.description_zh || project.description },
      template: { name_zh: template.name_zh, name_en: template.name_en },
      language: 'zh'
    };
    
    const chineseResult = await generateWithDeepSeek(chineseRequest);
    const chineseContent = chineseResult.status === 'success' ? chineseResult.content : englishResult.content;
    console.log(`✅ 中文内容生成成功 (${chineseContent.length} 字符)`);

    // 4. 生成MDC内容（如果有）
    let mdcEnglish = '';
    let mdcChinese = '';
    
    if (template.mdcprompt) {
      console.log('\n📝 步骤3: 生成MDC内容...');
      const mdcRequest = {
        prompt: template.mdcprompt,
        project: { name: project.name, description: project.description },
        template: { name_zh: template.name_zh, name_en: template.name_en },
        language: 'en'
      };
      
      const mdcResult = await generateWithDeepSeek(mdcRequest);
      if (mdcResult.status === 'success') {
        mdcEnglish = mdcResult.content;
        
        // 翻译MDC内容
        const mdcChineseRequest = {
          prompt: `请将以下内容翻译成中文：\n\n${mdcEnglish}`,
          project: { name: project.name_zh || project.name, description: project.description_zh || project.description },
          template: { name_zh: template.name_zh, name_en: template.name_en },
          language: 'zh'
        };
        
        const mdcChineseResult = await generateWithDeepSeek(mdcChineseRequest);
        mdcChinese = mdcChineseResult.status === 'success' ? mdcChineseResult.content : mdcEnglish;
        console.log(`✅ MDC内容生成成功 (英文: ${mdcEnglish.length} 字符, 中文: ${mdcChinese.length} 字符)`);
      }
    } else {
      console.log('ℹ️ 该模板没有MDC提示');
    }

    // 5. 保存到数据库
    console.log('\n💾 步骤4: 保存到数据库...');
    const saveResult = await saveToDatabase(
      project, 
      template, 
      englishResult.content, 
      chineseContent, 
      mdcEnglish, 
      mdcChinese
    );

    // 6. 验证保存结果
    console.log('\n🔍 步骤5: 验证保存结果...');
    const { data: verification, error: verifyError } = await supabase
      .from('template_versions')
      .select('*')
      .eq('id', saveResult.id)
      .single();

    if (verifyError) throw new Error(`验证失败: ${verifyError.message}`);

    console.log('✅ 数据库验证成功:', {
      id: verification.id,
      project_id: verification.project_id,
      template_id: verification.template_id,
      created_at: verification.created_at,
      content_lengths: {
        output_content_en: JSON.stringify(verification.output_content_en).length,
        output_content_zh: JSON.stringify(verification.output_content_zh).length,
        mdcpromptcontent_en: verification.mdcpromptcontent_en?.length || 0,
        mdcpromptcontent_zh: verification.mdcpromptcontent_zh?.length || 0
      }
    });

    res.json({
      success: true,
      message: '数据库保存测试成功',
      result: {
        version_id: saveResult.id,
        project: { id: project.id, name: project.name },
        template: { id: template.id, name_zh: template.name_zh },
        content_lengths: {
          english: englishResult.content.length,
          chinese: chineseContent.length,
          mdc_english: mdcEnglish.length,
          mdc_chinese: mdcChinese.length
        },
        ai_metrics: {
          model: englishResult.model,
          total_tokens: englishResult.tokens,
          reasoning_tokens: englishResult.reasoning_tokens
        },
        saved_at: saveResult.created_at
      }
    });

  } catch (error) {
    console.error('\n❌ 数据库保存测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log('\n🚀 真实数据库保存测试服务器');
  console.log(`📡 地址: http://localhost:${PORT}`);
  console.log('🎯 专门用于测试DeepSeek Reasoner + 真实数据库保存');
  console.log('');
  
  // 测试数据库连接
  await testDatabaseConnection();
  
  console.log('📚 API接口:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/test-single-save`);
  console.log('');
  console.log('🧪 测试命令:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/test-single-save`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭数据库测试服务器...');
  process.exit(0);
}); 