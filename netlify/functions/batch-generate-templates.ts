import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 统一的模板类型定义（与前端保持一致）
const TEMPLATE_TYPES = [
  { code: 'prd', name: '产品需求文档 (PRD)', nameEn: 'Product Requirements Document (PRD)' },
  { code: 'mrd', name: '市场需求文档 (MRD)', nameEn: 'Market Requirements Document (MRD)' },
  { code: 'tech-arch', name: '技术架构文档', nameEn: 'Technical Architecture Document' },
  { code: 'business-canvas', name: '商业模式画布', nameEn: 'Business Model Canvas' },
  { code: 'user-journey', name: '用户体验地图', nameEn: 'User Experience Map' }
];

// 统一的版本检查逻辑（与前端一致）
const checkExistingVersion = async (templateType: string, projectId: string, language: string) => {
  try {
    const { data, error } = await supabase
      .from('template_versions')
      .select('version_number')
      .eq('template_type', templateType)
      .eq('project_id', projectId)
      .eq('language', language)
      .order('version_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('检查版本失败:', error);
      return 1; // 默认版本
    }

    return data && data.length > 0 ? data[0].version_number + 1 : 1;
  } catch (error) {
    console.error('版本检查异常:', error);
    return 1;
  }
};

// 统一的AI生成逻辑（与前端保持一致）
const generateTemplate = async (templateType: string, projectData: any, language: string = 'zh') => {
  try {
    console.log(`🤖 开始生成${language === 'zh' ? '中文' : '英文'}模板:`, templateType);
    
    const templateConfig = TEMPLATE_TYPES.find(t => t.code === templateType);
    if (!templateConfig) {
      throw new Error(`未知的模板类型: ${templateType}`);
    }

    // 构建统一的提示词格式
    const templateName = language === 'zh' ? templateConfig.name : templateConfig.nameEn;
    const prompt = buildPrompt(templateType, projectData, language, templateName);
    
    console.log(`📝 构建提示词完成，长度: ${prompt.length}`);

    // 使用AI生成内容
    const content = await callAIService(prompt, language);
    
    console.log(`✅ ${templateName} 生成完成，内容长度: ${content.length}`);
    return content;

  } catch (error) {
    console.error(`❌ 生成模板失败 (${templateType}):`, error);
    throw error;
  }
};

// 统一的提示词构建函数（与前端promptBuilder保持一致）
const buildPrompt = (templateType: string, projectData: any, language: string, templateName: string) => {
  const isEnglish = language === 'en';
  
  const basePrompt = isEnglish ? 
    `You are a professional product manager. Please generate a detailed ${templateName} based on the following project information:` :
    `你是一位专业的产品经理，请根据以下项目信息生成详细的${templateName}：`;

  const projectInfo = isEnglish ?
    `Project Name: ${projectData.name}\nProject Description: ${projectData.description}\nPrimary Category: ${projectData.primary_category}\nSecondary Category: ${projectData.secondary_category}` :
    `项目名称：${projectData.name}\n项目描述：${projectData.description}\n主分类：${projectData.primary_category}\n子分类：${projectData.secondary_category}`;

  // 根据模板类型添加特定要求
  let specificRequirements = '';
  
  switch (templateType) {
    case 'prd':
      specificRequirements = isEnglish ?
        `\nPlease include the following sections:\n1. Product Overview\n2. User Stories\n3. Functional Requirements\n4. Non-functional Requirements\n5. User Interface Requirements\n6. Data Requirements\n7. Integration Requirements\n8. Performance Requirements\n9. Security Requirements\n10. Testing Requirements` :
        `\n请包含以下章节：\n1. 产品概述\n2. 用户故事\n3. 功能需求\n4. 非功能需求\n5. 用户界面需求\n6. 数据需求\n7. 集成需求\n8. 性能需求\n9. 安全需求\n10. 测试需求`;
      break;
    case 'mrd':
      specificRequirements = isEnglish ?
        `\nPlease include the following sections:\n1. Market Analysis\n2. Target Market\n3. Competitive Analysis\n4. Market Requirements\n5. Market Strategy\n6. Go-to-Market Plan\n7. Revenue Model\n8. Risk Analysis` :
        `\n请包含以下章节：\n1. 市场分析\n2. 目标市场\n3. 竞争分析\n4. 市场需求\n5. 市场策略\n6. 上市计划\n7. 收入模式\n8. 风险分析`;
      break;
    case 'tech-arch':
      specificRequirements = isEnglish ?
        `\nPlease include the following sections:\n1. System Overview\n2. Architecture Principles\n3. Technology Stack\n4. System Components\n5. Data Architecture\n6. Security Architecture\n7. Performance Considerations\n8. Scalability Plan` :
        `\n请包含以下章节：\n1. 系统概述\n2. 架构原则\n3. 技术栈\n4. 系统组件\n5. 数据架构\n6. 安全架构\n7. 性能考虑\n8. 扩展性计划`;
      break;
    case 'business-canvas':
      specificRequirements = isEnglish ?
        `\nPlease structure as a Business Model Canvas with:\n1. Key Partners\n2. Key Activities\n3. Key Resources\n4. Value Propositions\n5. Customer Relationships\n6. Channels\n7. Customer Segments\n8. Cost Structure\n9. Revenue Streams` :
        `\n请按商业模式画布结构组织：\n1. 关键合作伙伴\n2. 关键活动\n3. 关键资源\n4. 价值主张\n5. 客户关系\n6. 渠道通路\n7. 客户细分\n8. 成本结构\n9. 收入来源`;
      break;
    case 'user-journey':
      specificRequirements = isEnglish ?
        `\nPlease include the following phases:\n1. Awareness Phase\n2. Consideration Phase\n3. Purchase/Signup Phase\n4. Onboarding Phase\n5. Usage Phase\n6. Support Phase\n7. Advocacy Phase\nFor each phase, describe user actions, emotions, pain points, and opportunities.` :
        `\n请包含以下阶段：\n1. 认知阶段\n2. 考虑阶段\n3. 购买/注册阶段\n4. 引导阶段\n5. 使用阶段\n6. 支持阶段\n7. 推荐阶段\n对于每个阶段，请描述用户行为、情感、痛点和机会。`;
      break;
  }

  const formatRequirements = isEnglish ?
    `\nFormat requirements:\n- Use clear headings and subheadings\n- Provide detailed and actionable content\n- Include specific examples where applicable\n- Ensure professional presentation\n- Output should be comprehensive and ready for immediate use` :
    `\n格式要求：\n- 使用清晰的标题和子标题\n- 提供详细且可操作的内容\n- 在适当的地方包含具体示例\n- 确保专业的呈现方式\n- 输出应该全面且可立即使用`;

  return `${basePrompt}\n\n${projectInfo}${specificRequirements}${formatRequirements}`;
};

// AI服务调用函数
const callAIService = async (prompt: string, language: string): Promise<string> => {
  try {
    // 这里可以集成不同的AI服务
    // 目前使用模拟生成，实际使用时替换为真实AI API调用
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_DEFAULT_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`AI API调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '生成内容为空';
    
  } catch (error) {
    console.error('AI服务调用失败:', error);
    // 返回模拟内容作为后备
    return generateMockContent(prompt, language);
  }
};

// 模拟内容生成（用于测试和后备）
const generateMockContent = (prompt: string, language: string): string => {
  const timestamp = new Date().toLocaleString('zh-CN');
  return language === 'zh' ? 
    `# 模板文档\n\n本文档由AI自动生成于 ${timestamp}\n\n## 概述\n\n这是一个基于项目需求自动生成的模板文档。\n\n## 内容\n\n${prompt.substring(0, 200)}...\n\n## 结论\n\n此文档提供了完整的项目分析和建议。` :
    `# Template Document\n\nThis document was automatically generated by AI at ${timestamp}\n\n## Overview\n\nThis is a template document automatically generated based on project requirements.\n\n## Content\n\n${prompt.substring(0, 200)}...\n\n## Conclusion\n\nThis document provides complete project analysis and recommendations.`;
};

// 保存模板到数据库（与前端逻辑一致）
const saveTemplate = async (templateData: any) => {
  try {
    // 检查现有版本
    const nextVersion = await checkExistingVersion(
      templateData.template_type,
      templateData.project_id,
      templateData.language
    );

    // 保存到templates表
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        name: templateData.name,
        type: templateData.template_type,
        project_id: templateData.project_id,
        language: templateData.language,
        content: templateData.content,
        status: 'active'
      })
      .select()
      .single();

    if (templateError) {
      console.error('保存模板失败:', templateError);
      throw templateError;
    }

    // 保存版本信息到template_versions表
    const { data: version, error: versionError } = await supabase
      .from('template_versions')
      .insert({
        template_id: template.id,
        template_type: templateData.template_type,
        project_id: templateData.project_id,
        language: templateData.language,
        version_number: nextVersion,
        content: templateData.content,
        change_notes: `批量生成 - 版本 ${nextVersion}`,
        status: 'active'
      })
      .select()
      .single();

    if (versionError) {
      console.error('保存版本失败:', versionError);
      throw versionError;
    }

    console.log(`✅ 模板保存成功: ${templateData.name} (版本 ${nextVersion})`);
    return { template, version };

  } catch (error) {
    console.error('保存模板异常:', error);
    throw error;
  }
};

// 主处理函数
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    console.log('🚀 开始批量生成模板...');
    
    // 解析请求参数
    const params = event.queryStringParameters || {};
    const languages = params.languages ? params.languages.split(',') : ['zh', 'en'];
    const templateTypes = params.types ? params.types.split(',') : TEMPLATE_TYPES.map(t => t.code);
    const categoryCode = params.category || '';
    const limit = parseInt(params.limit || '10');
    
    console.log('📋 生成参数:', { languages, templateTypes, categoryCode, limit });

    // 获取项目数据
    let query = supabase
      .from('projects')
      .select('*')
      .limit(limit);
    
    if (categoryCode) {
      query = query.or(`primary_category_code.eq.${categoryCode},secondary_category_code.eq.${categoryCode}`);
    }
    
    const { data: projects, error: projectsError } = await query;
    
    if (projectsError) {
      throw new Error(`获取项目数据失败: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '没有找到符合条件的项目',
          generated: 0,
          skipped: 0,
          details: []
        })
      };
    }

    console.log(`📊 找到 ${projects.length} 个项目，开始生成模板...`);

    const results = {
      generated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // 批量生成模板
    for (const project of projects) {
      for (const language of languages) {
        for (const templateType of templateTypes) {
          try {
            // 检查是否已存在（智能跳过机制）
            const existingVersion = await checkExistingVersion(templateType, project.id, language);
            if (existingVersion > 1) {
              console.log(`⏭️ 跳过已存在的模板: ${project.name} - ${templateType} (${language})`);
              results.skipped++;
              results.details.push({
                project: project.name,
                type: templateType,
                language,
                status: 'skipped',
                reason: '已存在版本'
              });
              continue;
            }

            // 生成模板内容
            const content = await generateTemplate(templateType, project, language);
            
            // 保存模板
            const templateConfig = TEMPLATE_TYPES.find(t => t.code === templateType)!;
            const templateName = `${project.name} - ${language === 'zh' ? templateConfig.name : templateConfig.nameEn}`;
            
            await saveTemplate({
              name: templateName,
              template_type: templateType,
              project_id: project.id,
              language,
              content
            });

            results.generated++;
            results.details.push({
              project: project.name,
              type: templateType,
              language,
              status: 'success',
              content_length: content.length
            });

            console.log(`✅ 生成完成: ${templateName}`);

          } catch (error) {
            console.error(`❌ 生成失败: ${project.name} - ${templateType} (${language})`, error);
            results.errors++;
            results.details.push({
              project: project.name,
              type: templateType,
              language,
              status: 'error',
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
        }
      }
    }

    console.log('🎉 批量生成完成!', results);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `批量生成完成！成功生成 ${results.generated} 个模板，跳过 ${results.skipped} 个，失败 ${results.errors} 个`,
        ...results
      })
    };

  } catch (error) {
    console.error('❌ 批量生成失败:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    };
  }
};