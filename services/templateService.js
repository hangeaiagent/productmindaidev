const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 初始化Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 系统用户ID
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

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

    return version;
  } catch (error) {
    console.error('保存模板版本失败:', error);
    throw error;
  }
}

/**
 * 生成模板内容
 */
async function generateTemplateContent(projectId, templateId, options = {}) {
  try {
    // 1. 检查版本
    const { nextVersion, hasExisting } = await checkTemplateVersion(templateId, projectId);

    // 2. 如果有现有版本，将其设为非活跃
    if (hasExisting) {
      await updateExistingVersions(templateId, projectId);
    }

    // 3. 准备模板数据
    const templateData = {
      template_id: templateId,
      project_id: projectId,
      created_by: SYSTEM_USER_ID,
      input_content: `项目ID: ${projectId}\n模板ID: ${templateId}`,
      output_content: {
        content: options.content || '模拟生成的内容...',
        annotations: [],
        language: options.language || 'zh',
        generated_at: new Date().toISOString()
      },
      is_active: true,
      version_number: nextVersion
    };

    // 4. 保存模板版本
    const version = await saveTemplateVersion(templateData);

    return {
      success: true,
      versionId: version.id,
      versionNumber: nextVersion,
      content: templateData.output_content
    };

  } catch (error) {
    console.error('生成模板内容失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateTemplateContent,
  checkTemplateVersion,
  updateExistingVersions,
  saveTemplateVersion
}; 