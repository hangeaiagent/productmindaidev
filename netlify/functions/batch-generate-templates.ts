import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 默认用户ID
const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

// 默认AI模型配置
const DEFAULT_MODEL_CONFIG = {
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0
};

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Template {
  id: string;
  name_zh: string;
  name_en: string;
  prompt_content: string;
  category: {
    name_zh: string;
    name_en: string;
  };
}

interface ExistingVersion {
  template_id: string;
  project_id: string;
  is_active: boolean;
}

// 构建提示词
function buildPrompt(template: Template, projectName: string, projectDescription: string, language: string = 'zh'): string {
  const isZh = language === 'zh';
  const templateName = isZh ? template.name_zh : template.name_en;
  const categoryName = isZh ? template.category.name_zh : template.category.name_en;
  
  return `作为专业的产品经理，请根据以下模板和项目信息生成详细的${templateName}：

项目信息：
- 项目名称：${projectName}
- 项目描述：${projectDescription}
- 模板类型：${templateName}
- 分类：${categoryName}

模板要求：
${template.prompt_content}

请用${isZh ? '中文' : '英文'}输出，确保内容专业、详细、可操作。格式要求：
1. 使用Markdown格式
2. 包含清晰的标题和章节
3. 提供具体的实施建议
4. 结合项目特点定制内容

请开始生成：`;
}

// 调用AI模型生成内容
async function generateWithAI(prompt: string): Promise<string> {
  try {
    // 这里可以集成多种AI模型，目前使用默认的模拟生成
    // 实际使用时可以替换为真实的AI API调用
    
    // 模拟AI生成的内容
    const response = await simulateAIGeneration(prompt);
    return response;
    
  } catch (error) {
    console.error('AI生成失败:', error);
    throw new Error(`AI生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 模拟AI生成（实际使用时替换为真实AI API）
async function simulateAIGeneration(prompt: string): Promise<string> {
  // 这里可以集成OpenAI、Anthropic Claude、或其他AI模型
  // 目前返回模拟内容
  return `# 根据模板生成的内容

## 概述
这是基于项目需求和模板要求生成的专业文档内容。

## 详细分析
${prompt.substring(0, 200)}...

## 结论和建议
1. 基于项目特点制定具体方案
2. 结合市场趋势进行优化
3. 持续迭代和改进

---
生成时间: ${new Date().toISOString()}
`;
}

// 批量生成模板版本
async function batchGenerateTemplates(userId: string, language: string = 'zh'): Promise<any> {
  console.log(`🚀 开始批量生成模板，用户ID: ${userId}, 语言: ${language}`);
  
  try {
    // 1. 获取用户的所有项目
    const { data: projects, error: projectsError } = await supabase
      .from('user_projects')
      .select('id, name, description, created_at')
      .eq('user_id', userId)
      .not('name', 'is', null)
      .not('name', 'eq', '')
      .order('created_at', { ascending: false });

    if (projectsError) {
      throw new Error(`获取项目失败: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      return {
        success: true,
        message: '该用户没有项目需要生成模板',
        statistics: { totalProjects: 0, totalGenerated: 0, totalSkipped: 0 }
      };
    }

    console.log(`📊 找到 ${projects.length} 个项目`);

    // 2. 获取所有模板
    const { data: templatesData, error: templatesError } = await supabase
      .from('templates')
      .select(`
        id,
        name_zh,
        name_en,
        prompt_content,
        category:template_categories!inner (
          name_zh,
          name_en
        )
      `)
      .order('created_at', { ascending: true });

    if (templatesError) {
      throw new Error(`获取模板失败: ${templatesError.message}`);
    }

    if (!templatesData || templatesData.length === 0) {
      return {
        success: true,
        message: '系统中没有可用的模板',
        statistics: { totalProjects: projects.length, totalGenerated: 0, totalSkipped: 0 }
      };
    }

    // 转换模板数据格式
    const templates: Template[] = templatesData.map(t => ({
      id: t.id,
      name_zh: t.name_zh,
      name_en: t.name_en,
      prompt_content: t.prompt_content,
      category: {
        name_zh: t.category[0]?.name_zh || '',
        name_en: t.category[0]?.name_en || ''
      }
    }));

    console.log(`📝 找到 ${templates.length} 个模板`);

    // 3. 获取现有的模板版本
    const { data: existingVersions, error: versionsError } = await supabase
      .from('template_versions')
      .select('template_id, project_id, is_active')
      .in('project_id', projects.map(p => p.id));

    if (versionsError) {
      throw new Error(`获取现有版本失败: ${versionsError.message}`);
    }

    console.log(`🔍 找到 ${existingVersions?.length || 0} 个现有版本`);

    // 4. 确定需要生成的模板版本
    const toGenerate: Array<{ project: Project; template: Template }> = [];
    
    for (const project of projects) {
      for (const template of templates) {
        // 检查是否已存在活跃版本
        const hasActiveVersion = existingVersions?.some(
          (version: ExistingVersion) => 
            version.template_id === template.id && 
            version.project_id === project.id && 
            version.is_active
        );

        if (!hasActiveVersion) {
          toGenerate.push({ project, template });
        }
      }
    }

    console.log(`⏳ 需要生成 ${toGenerate.length} 个模板版本`);

    if (toGenerate.length === 0) {
      return {
        success: true,
        message: '所有项目的模板版本都已生成',
        statistics: {
          totalProjects: projects.length,
          totalTemplates: templates.length,
          totalGenerated: 0,
          totalSkipped: projects.length * templates.length
        }
      };
    }

    // 5. 批量生成模板版本
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < toGenerate.length; i++) {
      const { project, template } = toGenerate[i];
      const templateName = language === 'zh' ? template.name_zh : template.name_en;
      
      console.log(`🔄 生成 ${i + 1}/${toGenerate.length}: ${project.name} - ${templateName}`);

      try {
        // 构建提示词
        const prompt = buildPrompt(template, project.name, project.description || '', language);
        
        // 调用AI生成内容
        const generatedContent = await generateWithAI(prompt);
        
        // 保存到数据库
        const { error: insertError } = await supabase
          .from('template_versions')
          .insert({
            template_id: template.id,
            project_id: project.id,
            input_content: project.description || '',
            output_content: {
              content: generatedContent,
              annotations: []
            },
            created_by: userId,
            is_active: true
          });

        if (insertError) {
          throw new Error(`保存失败: ${insertError.message}`);
        }

        results.success++;
        console.log(`✅ 成功生成: ${project.name} - ${templateName}`);

        // 添加延迟避免过快调用
        if (i < toGenerate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        const errorMessage = `${project.name} - ${templateName}: ${error instanceof Error ? error.message : '未知错误'}`;
        results.failed++;
        results.errors.push(errorMessage);
        console.error(`❌ 生成失败: ${errorMessage}`);
        
        // 如果连续失败太多次，停止生成
        if (results.failed > 10) {
          console.log('❌ 连续失败次数过多，停止批量生成');
          break;
        }
      }
    }

    return {
      success: true,
      message: '批量生成完成',
      statistics: {
        totalProjects: projects.length,
        totalTemplates: templates.length,
        totalToGenerate: toGenerate.length,
        successCount: results.success,
        failedCount: results.failed,
        totalGenerated: results.success,
        totalSkipped: (projects.length * templates.length) - toGenerate.length
      },
      errors: results.errors
    };

  } catch (error) {
    console.error('❌ 批量生成失败:', error);
    throw error;
  }
}

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
    const userId = queryStringParameters?.user_id || DEFAULT_USER_ID;
    const language = queryStringParameters?.lang || 'zh';
    const force = queryStringParameters?.force === 'true';

    console.log(`🚀 批量生成模板请求: 用户=${userId}, 语言=${language}, 强制=${force}`);

    // 验证语言参数
    if (!['zh', 'en'].includes(language)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Unsupported language. Use "zh" or "en".' 
        })
      };
    }

    // 执行批量生成
    const result = await batchGenerateTemplates(userId, language);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ 批量生成模板失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '批量生成模板失败',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 