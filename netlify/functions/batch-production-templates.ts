import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 默认的AI模型配置
const DEFAULT_AI_CONFIG = {
  apiKey: process.env.VITE_DEFAULT_API_KEY,
  model: 'deepseek-chat',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions'
};

// 结果类型定义
interface GenerationResult {
  success: boolean;
  projectId: string;
  templateId: string;
  templateName: string;
  projectName: string;
  versionId?: string;
  error?: string;
  generated?: {
    outputContentEn: string;
    outputContentZh: string;
    mdcPromptContentEn?: string;
    mdcPromptContentZh?: string;
  };
}

interface GenerationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: GenerationResult[];
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
    const params = event.queryStringParameters || {};
    const batchSize = parseInt(params.batch_size || '3');
    const dryRun = params.dry_run === 'true';

    console.log('🚀 开始批量生产模板内容...');

    // 获取可用模板
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select(`
        id, name_zh, name_en, prompt_content, mdcprompt,
        template_categories!inner (isshow)
      `)
      .eq('template_categories.isshow', 1)
      .limit(5);

    if (templatesError) throw new Error(`获取模板失败: ${templatesError.message}`);
    if (!templates?.length) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, message: '没有可用模板' })
      };
    }

    // 获取项目
    const { data: projects, error: projectsError } = await supabase
      .from('user_projects')
      .select('id, name, description, name_zh, description_zh')
      .not('name', 'is', null)
      .limit(batchSize);

    if (projectsError) throw new Error(`获取项目失败: ${projectsError.message}`);
    if (!projects?.length) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, message: '没有可用项目' })
      };
    }

    if (dryRun) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          success: true,
          dryRun: true,
          templates: templates.length,
          projects: projects.length,
          totalTasks: templates.length * projects.length
        })
      };
    }

    // 处理生成任务（进一步限制数量避免超时）
    const results: GenerationResult[] = [];
    let success = 0, failed = 0;
    
    // 更严格的限制：最多处理1个项目和1个模板
    const limitedProjects = projects.slice(0, 1);
    const limitedTemplates = templates.slice(0, 1);

    for (const project of limitedProjects) {
      for (const template of limitedTemplates) {
        try {
          // 检查是否已存在
          const { data: existing } = await supabase
            .from('template_versions')
            .select('id')
            .eq('project_id', project.id)
            .eq('template_id', template.id)
            .single();

          if (existing) {
            results.push({
              success: true,
              projectId: project.id,
              templateId: template.id,
              templateName: template.name_zh,
              projectName: project.name,
              error: 'Already exists'
            });
            continue;
          }

          // 生成内容
          const result = await processGeneration(project, template);
          results.push(result);
          if (result.success) success++; else failed++;

        } catch (error) {
          results.push({
            success: false,
            projectId: project.id,
            templateId: template.id,
            templateName: template.name_zh,
            projectName: project.name,
            error: error instanceof Error ? error.message : String(error)
          });
          failed++;
        }
      }
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        success: true,
        stats: { total: results.length, success, failed, results }
      })
    };

  } catch (error) {
    console.error('❌ 批量生成失败:', error);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function processGeneration(project: any, template: any): Promise<GenerationResult> {
  try {
    const projectName = project.name_zh || project.name || '';
    const projectDesc = project.description_zh || project.description || '';

    // 1. 生成英文内容
    const outputContentEn = await generateWithAI(
      `${template.prompt_content}\n\nProject: ${projectName}\nDescription: ${projectDesc}\n\nPlease provide output in English.`,
      'en'
    );

    // 2. 翻译成中文
    const outputContentZh = await translateToZh(outputContentEn);

    // 3. 生成MDC内容（如果有mdcprompt）
    let mdcPromptContentEn = '';
    let mdcPromptContentZh = '';
    
    if (template.mdcprompt) {
      mdcPromptContentEn = await generateWithAI(
        `${template.mdcprompt}\n\nProject: ${projectName}\nDescription: ${projectDesc}\n\nPlease provide output in English.`,
        'en'
      );
      mdcPromptContentZh = await translateToZh(mdcPromptContentEn);
    }

    // 4. 保存到数据库
    const { data: version, error: saveError } = await supabase
      .from('template_versions')
      .insert({
        template_id: template.id,
        project_id: project.id,
        input_content: `项目: ${projectName}\n描述: ${projectDesc}`,
        output_content_en: { content: outputContentEn, annotations: [], language: 'en', generated_at: new Date().toISOString() },
        output_content_zh: { content: outputContentZh, annotations: [], language: 'zh', generated_at: new Date().toISOString() },
        output_content: { content: outputContentZh, annotations: [], language: 'zh', generated_at: new Date().toISOString() },
        mdcpromptcontent_en: mdcPromptContentEn,
        mdcpromptcontent_zh: mdcPromptContentZh,
        is_active: true,
        created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1'
      })
      .select('id')
      .single();

    if (saveError) throw saveError;

    return {
      success: true,
      projectId: project.id,
      templateId: template.id,
      templateName: template.name_zh,
      projectName: project.name,
      versionId: version.id,
      generated: { outputContentEn, outputContentZh, mdcPromptContentEn, mdcPromptContentZh }
    };

  } catch (error) {
    return {
      success: false,
      projectId: project.id,
      templateId: template.id,
      templateName: template.name_zh,
      projectName: project.name,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function generateWithAI(prompt: string, language: string): Promise<string> {
  try {
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(DEFAULT_AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEFAULT_AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_AI_CONFIG.model,
        messages: [
          { role: 'system', content: 'You are a professional product manager AI assistant.' },
          { role: 'user', content: prompt.substring(0, 1000) } // 限制prompt长度
        ],
        max_tokens: 800, // 减少token数量
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`API调用失败: ${response.status}`);
    
    const data = await response.json();
    return data.choices[0]?.message?.content || generateFallbackContent(prompt, language);

  } catch (error) {
    console.error('AI生成失败:', error);
    return generateFallbackContent(prompt, language);
  }
}

function generateFallbackContent(prompt: string, language: string): string {
  const timestamp = new Date().toISOString();
  const isZh = language === 'zh';
  
  if (isZh) {
    return `# 模板文档\n\n本文档由AI自动生成于 ${timestamp}\n\n## 概述\n\n这是一个基于项目需求生成的模板文档。\n\n## 主要内容\n\n基于提供的项目信息和模板要求，本文档提供了相应的分析和建议。\n\n---\n*注：由于网络或服务限制，使用了简化版本的内容生成。*`;
  } else {
    return `# Template Document\n\nGenerated by AI at ${timestamp}\n\n## Overview\n\nThis is a template document generated based on project requirements.\n\n## Main Content\n\nBased on the provided project information and template requirements, this document provides corresponding analysis and recommendations.\n\n---\n*Note: Due to network or service limitations, a simplified version of content generation was used.*`;
  }
}

async function translateToZh(content: string): Promise<string> {
  try {
    // 添加超时控制和简化处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

    const response = await fetch(DEFAULT_AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEFAULT_AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_AI_CONFIG.model,
        messages: [
          { role: 'system', content: '你是专业的翻译助手，将英文简洁地翻译成中文。' },
          { role: 'user', content: `请翻译：\n\n${content.substring(0, 800)}` } // 限制内容长度
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`翻译API调用失败: ${response.status}`);
    
    const data = await response.json();
    return data.choices[0]?.message?.content || content;

  } catch (error) {
    console.error('翻译失败:', error);
    // 简单的英文转中文处理
    return content.replace(/Template Document/g, '模板文档')
                 .replace(/Overview/g, '概述')
                 .replace(/Main Content/g, '主要内容')
                 .replace(/Generated by AI at/g, '由AI生成于');
  }
} 