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

    console.log('📡 调用AI服务...');
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
      throw new Error(`AI API调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
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
    simulateTemplateGeneration(taskId);

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
async function simulateTemplateGeneration(taskId) {
  const state = generationStates.get(taskId);
  if (!state) return;

  try {
    const { projectId, templateId } = state;

    const steps = [
      { step: '验证项目信息', duration: 500, progress: 10 },
      { step: '加载模板配置', duration: 800, progress: 25 },
      { step: '分析内容结构', duration: 1200, progress: 45 },
      { step: '调用AI生成服务', duration: 2000, progress: 70 },
      { step: '格式化输出内容', duration: 600, progress: 85 },
      { step: '保存生成结果', duration: 400, progress: 95 },
      { step: '完成生成任务', duration: 200, progress: 100 }
    ];

    // 检查现有版本
    const { nextVersion, hasExisting } = await checkTemplateVersion(templateId, projectId);

    // 如果有现有版本，将其设为非活跃
    if (hasExisting) {
      await updateExistingVersions(templateId, projectId);
    }

    // 获取项目和模板信息
    console.log('🔍 查询项目信息:', projectId);
    const { data: project, error: projectError } = await supabase
      .from('user_projects')  // 修改为正确的表名
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('❌ 查询项目失败:', projectError);
      throw new Error(`查询项目失败: ${projectError.message}`);
    }

    if (!project) {
      throw new Error('项目不存在');
    }

    console.log('🔍 查询模板信息:', templateId);
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('❌ 查询模板失败:', templateError);
      throw new Error(`查询模板失败: ${templateError.message}`);
    }

    if (!template) {
      throw new Error('模板不存在');
    }

    // 更新任务状态并执行生成步骤
    for (const { step, duration, progress } of steps) {
      state.progress = progress;
      state.message = step;
      generationStates.set(taskId, state);
      console.log(`[PATCH-v2.1.3] 任务进度 ${taskId}: ${progress}% - ${step}`);
      await new Promise(resolve => setTimeout(resolve, duration));
    }

    // 构建prompt
    const prompt = `请为以下AI产品生成${template.name_zh || '模板'}文档：

项目信息：
- 产品名称：${project.name}
- 产品描述：${project.description}
- 主要功能：${project.features || '未提供'}
- 技术特点：${project.tech_highlights || '未提供'}
- 目标用户：${project.target_users || '未提供'}

要求：
1. 使用专业的产品文档格式
2. 突出产品的核心价值和创新点
3. 重点描述用户价值和应用场景
4. 使用清晰的结构和标题
5. 确保内容准确、专业、易懂`;

    // 调用AI生成内容
    const content = await callAI(prompt);

    // 保存生成结果
    const templateData = {
      template_id: templateId,
      project_id: projectId,
      created_by: SYSTEM_USER_ID,
      input_content: prompt,
      output_content: {
        content,
        language: 'zh',
        annotations: [],
        generated_at: new Date().toISOString()
      },
      is_active: true,
      version_number: nextVersion
    };

    await saveTemplateVersion(templateData);

    // 更新最终状态
    state.status = 'completed';
    state.progress = 100;
    state.message = '完成生成任务';
    generationStates.set(taskId, state);
    console.log(`[PATCH-v2.1.3] 生成任务完成: ${taskId}`);

  } catch (error) {
    console.error(`[PATCH-v2.1.3] 生成任务失败: ${taskId}`, error);
    state.status = 'failed';
    state.error = error.message;
    generationStates.set(taskId, state);
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