import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: '只支持POST方法'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { projectId, templateId, content, language } = body;

    if (!projectId || !templateId || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少必要参数：projectId, templateId, content'
        })
      };
    }

    console.log('💾 保存模板内容:', { projectId, templateId, language });

    // 通过templateId查找对应的模板
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, name_zh, name_en')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('❌ 查询模板失败:', templateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '查询模板失败'
        })
      };
    }

    if (!template) {
      console.log('⚠️ 模板不存在');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '模板不存在'
        })
      };
    }

    const templateName = language === 'zh' ? template.name_zh : template.name_en;

    // 检查是否已存在该项目的模板版本
    const { data: existingVersions, error: versionError } = await supabase
      .from('template_versions')
      .select('id, version_number')
      .eq('template_id', template.id)
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError) {
      console.error('❌ 查询版本失败:', versionError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '查询版本失败'
        })
      };
    }

    const nextVersionNumber = (existingVersions && existingVersions.length > 0) 
      ? existingVersions[0].version_number + 1 
      : 1;

    // 先将现有版本设为非活跃
    if (existingVersions && existingVersions.length > 0) {
      await supabase
        .from('template_versions')
        .update({ is_active: false })
        .eq('template_id', template.id)
        .eq('project_id', projectId);
    }

    // 创建新的模板版本
    const { data: newVersion, error: insertError } = await supabase
      .from('template_versions')
      .insert({
        template_id: template.id,
        project_id: projectId,
        input_content: `AI生成的${templateName}模板`,
        output_content: content,
        version_number: nextVersionNumber,
        is_active: true,
        created_by: 'ai-system'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ 保存版本失败:', insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '保存版本失败'
        })
      };
    }

    console.log('✅ 模板保存成功:', { versionId: newVersion.id, versionNumber: nextVersionNumber });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        versionId: newVersion.id,
        versionNumber: nextVersionNumber,
        templateId: template.id
      })
    };

  } catch (error) {
    console.error('❌ 保存模板内容失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '服务器内部错误'
      })
    };
  }
}; 