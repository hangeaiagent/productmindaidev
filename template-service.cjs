const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 检查环境变量
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEFAULT_API_KEY;

// 输出环境变量状态
console.log('🔧 配置状态:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey,
  hasDeepseekKey: !!DEEPSEEK_API_KEY
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase配置缺失');
  process.exit(1);
}

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// 存储生成状态
const generationStates = new Map();

/**
 * 调用AI服务生成内容
 */
async function callAI(prompt, language = 'zh') {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('AI API密钥未配置');
    }

    console.log('📡 调用AI服务开始...');
    console.log('🔍 生成参数:', {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 2000,
      promptLength: prompt.length,
      language
    });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: language === 'zh' ? 
              '你是一个专业的产品经理AI助手，请用中文回答。' :
              'You are a professional product manager AI assistant. Please answer in English.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI API调用失败:', {
        status: response.status,
        error: errorText
      });
      throw new Error(`AI API调用失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('❌ AI返回内容为空');
      throw new Error('AI返回内容为空');
    }

    console.log('✅ AI生成成功:', {
      contentLength: content.length,
      tokens: data.usage?.total_tokens,
      timeTaken: new Date().toISOString()
    });

    return content;
  } catch (error) {
    console.error('❌ AI调用失败:', error);
    throw error;
  }
}

/**
 * 检查模板版本
 */
async function checkTemplateVersion(templateId, projectId) {
  try {
    const { data: existingVersions, error: versionError } = await supabase
      .from('template_versions')
      .select('version_number')
      .eq('template_id', templateId)
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError) {
      throw new Error(`检查版本失败: ${versionError.message}`);
    }

    return {
      nextVersion: (existingVersions && existingVersions.length > 0)
        ? existingVersions[0].version_number + 1
        : 1,
      hasExisting: existingVersions && existingVersions.length > 0
    };
  } catch (error) {
    console.error('检查模板版本失败:', error);
    throw error;
  }
}

/**
 * 更新现有版本状态
 */
async function updateExistingVersions(templateId, projectId) {
  try {
    const { error: updateError } = await supabase
      .from('template_versions')
      .update({ is_active: false })
      .eq('template_id', templateId)
      .eq('project_id', projectId);

    if (updateError) {
      throw new Error(`更新版本状态失败: ${updateError.message}`);
    }
  } catch (error) {
    console.error('更新版本状态失败:', error);
    throw error;
  }
}

/**
 * 保存模板版本
 */
async function saveTemplateVersion(templateData) {
  try {
    const { data: version, error: saveError } = await supabase
      .from('template_versions')
      .insert(templateData)
      .select()
      .single();

    if (saveError) {
      throw new Error(`保存模板版本失败: ${saveError.message}`);
    }

    console.log('[PATCH-v2.1.3] 模板版本保存成功:', {
      versionId: version.id,
      templateId: version.template_id,
      versionNumber: version.version_number
    });

    return version;
  } catch (error) {
    console.error('保存模板版本失败:', error);
    throw error;
  }
}

/**
 * 启动模板生成任务
 */
async function startTemplateGeneration(projectId, templateId) {
  try {
    // 验证参数
    if (typeof projectId !== 'string' || typeof templateId !== 'string') {
      throw new Error('无效的参数格式');
    }

    // 生成任务ID
    const taskId = `${projectId}-${templateId}-${Date.now()}`;
    
    // 启动生成任务
    generationStates.set(taskId, {
      status: 'processing',
      progress: 0,
      message: '初始化任务',
      projectId,
      templateId
    });

    // 异步处理生成过程
    await simulateTemplateGeneration(projectId, templateId);

    return {
      success: true,
      taskId,
      message: '[PATCH-v2.1.3] 生成任务已启动'
    };
  } catch (error) {
    console.error('[PATCH-v2.1.3] 启动生成任务失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取生成任务状态
 */
function getGenerationStatus(taskId) {
  const state = generationStates.get(taskId);
  
  if (!state) {
    return {
      success: false,
      message: '[PATCH-v2.1.3] 任务状态未找到'
    };
  }

  return {
    success: true,
    ...state
  };
}

/**
 * 模拟模板生成过程
 */
async function simulateTemplateGeneration(projectId, templateId) {
  const taskId = `${projectId}-${templateId}-${Date.now()}`;
  console.log('🚀 开始生成任务:', {
    taskId,
    projectId,
    templateId,
    startTime: new Date().toISOString()
  });

  try {
    // 验证项目信息
    console.log('🔍 查询项目信息:', projectId);
    const project = await supabase
      .from('user_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project.data) {
      throw new Error('项目不存在');
    }

    console.log('✅ 项目信息验证成功:', {
      projectName: project.data.name,
      projectType: project.data.type
    });

    updateTaskProgress(taskId, 10, '验证项目信息');

    // 加载模板配置
    console.log('📑 加载模板配置:', templateId);
    const template = await loadTemplateConfig(templateId);
    updateTaskProgress(taskId, 25, '加载模板配置');

    // 分析内容结构
    console.log('🔄 分析内容结构');
    const contentStructure = await analyzeContent(project.data, template);
    updateTaskProgress(taskId, 45, '分析内容结构');

    // 调用AI生成
    console.log('🤖 准备调用AI生成服务');
    const prompt = buildPrompt(contentStructure, template);
    updateTaskProgress(taskId, 70, '调用AI生成服务');

    const content = await callAI(prompt);
    console.log('✨ AI生成完成:', {
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });

    // 格式化输出
    console.log('📝 格式化输出内容');
    const formattedContent = formatContent(content, template);
    updateTaskProgress(taskId, 85, '格式化输出内容');

    // 保存结果
    console.log('💾 保存生成结果');
    const result = await saveGeneratedContent(projectId, templateId, formattedContent);
    updateTaskProgress(taskId, 95, '保存生成结果');

    // 保存版本信息
    const versionInfo = await saveTemplateVersion(templateId);
    console.log('📦 模板版本保存成功:', versionInfo);

    updateTaskProgress(taskId, 100, '完成生成任务');
    console.log('✅ 生成任务完成:', taskId);

    return {
      taskId,
      status: 'completed',
      content: formattedContent,
      ...versionInfo
    };

  } catch (error) {
    console.error('❌ 生成任务失败:', taskId, error);
    throw error;
  }
}

// 定期清理已完成的任务状态
setInterval(() => {
  for (const [taskId, state] of generationStates.entries()) {
    if (state.status === 'completed' || state.status === 'failed') {
      console.log(`[PATCH-v2.1.3] 清理已完成任务: ${taskId}`);
      generationStates.delete(taskId);
    }
  }
}, 5 * 60 * 1000); // 5分钟清理一次

module.exports = {
  startTemplateGeneration,
  getGenerationStatus
}; 