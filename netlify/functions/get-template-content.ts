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

  try {
    const { queryStringParameters } = event;
    const projectId = queryStringParameters?.projectId;
    const templateId = queryStringParameters?.templateId;
    const language = queryStringParameters?.lang || 'zh';

    if (!projectId || !templateId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少必要参数：projectId 和 templateId'
        })
      };
    }

    console.log('📋 获取模板内容:', { projectId, templateId, language });

    // 方法1: 直接查询template_versions表 - 使用projectId + templateId
    console.log('🔍 方法1: 查询template_versions表...');
    const { data: templateVersions, error } = await supabase
      .from('template_versions')
      .select(`
        *,
        template:templates (
          id,
          name_zh,
          name_en,
          category_id
        )
      `)
      .eq('project_id', projectId)
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ 查询模板版本失败:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '查询模板版本失败'
        })
      };
    }

    console.log(`📊 找到 ${templateVersions?.length || 0} 个活跃的模板版本`);

    // 如果找到模板版本
    if (templateVersions && templateVersions.length > 0) {
      const templateVersion = templateVersions[0];
      console.log('✅ 方法1成功: 找到项目模板版本');
      
      // 格式化模板内容
      let content = '';
      if (language === 'zh' && templateVersion.output_content_zh) {
        content = typeof templateVersion.output_content_zh === 'string' 
          ? templateVersion.output_content_zh 
          : templateVersion.output_content_zh.content || JSON.stringify(templateVersion.output_content_zh, null, 2);
      } else if (language === 'en' && templateVersion.output_content_en) {
        content = typeof templateVersion.output_content_en === 'string' 
          ? templateVersion.output_content_en 
          : templateVersion.output_content_en.content || JSON.stringify(templateVersion.output_content_en, null, 2);
      } else if (templateVersion.output_content) {
        content = typeof templateVersion.output_content === 'string' 
          ? templateVersion.output_content 
          : templateVersion.output_content.content || JSON.stringify(templateVersion.output_content, null, 2);
      }

      if (content) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            content: content,
            templateId: templateVersion.template?.id,
            versionId: templateVersion.id,
            source: 'project_template_version'
          })
        };
      }
    }

    // 方法2: 查询模板基础信息，生成默认内容
    console.log('🔍 方法2: 查询模板基础信息...');
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.warn('⚠️ 查询模板信息失败:', templateError);
    } else if (templateData) {
      console.log('✅ 方法2成功: 找到模板基础信息');
      
      // 检查是否有默认内容
      const defaultContent = language === 'zh' 
        ? templateData.default_content_zh 
        : templateData.default_content_en;
      
      if (defaultContent) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            content: defaultContent,
            templateId: templateData.id,
            source: 'template_default_content'
          })
        };
      }
      
      // 如果没有默认内容，使用prompt_content生成基础框架
      if (templateData.prompt_content) {
        const templateName = language === 'zh' ? templateData.name_zh : templateData.name_en;
        const basicContent = generateBasicContentFromPrompt(templateData.prompt_content, language, templateName);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            content: basicContent,
            templateId: templateData.id,
            source: 'generated_from_prompt'
          })
        };
      }
    }

    console.log('⚠️ 所有方法都未找到匹配的模板');
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: '未找到对应的模板内容',
        debug: {
          projectId,
          templateId,
          language,
          templateVersionsFound: templateVersions?.length || 0,
          templateDataFound: !!templateData
        }
      })
    };

  } catch (error) {
    console.error('❌ 获取模板内容失败:', error);
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

// 从prompt内容生成基础模板框架
function generateBasicContentFromPrompt(promptContent: string, language: string, templateName: string): string {
  const currentTime = new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  
  if (language === 'zh') {
    return `# ${templateName}

## 📋 基本信息
- **生成时间**: ${currentTime}
- **模板来源**: 基于prompt生成
- **模板名称**: ${templateName}

## 📖 内容说明
${promptContent}

## 🔧 使用指南
1. 请根据以上提示内容填写相关信息
2. 可以根据实际需求调整结构
3. 确保内容的完整性和准确性

## 📝 待填写内容
请根据prompt中的要求，填写具体的项目信息和数据。

---
*此模板框架由系统生成，请根据实际需求进行调整*`;
  } else {
    return `# ${templateName}

## 📋 Basic Information
- **Generated Time**: ${currentTime}
- **Template Source**: Generated based on prompt
- **Template Name**: ${templateName}

## 📖 Content Description
${promptContent}

## 🔧 Usage Guide
1. Please fill in relevant information according to the above prompt content
2. You can adjust the structure according to actual needs
3. Ensure the completeness and accuracy of content

## 📝 Content to be Filled
Please fill in specific project information and data according to the requirements in the prompt.

---
*This template framework is generated by the system, please adjust according to actual needs*`;
  }
} 