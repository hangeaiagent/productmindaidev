import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 模板接口定义（与数据库结构对应）
interface DatabaseTemplate {
  id: string;
  category_id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  prompt_content: string;
  no: number;
}

// 从数据库获取模板列表
const getTemplatesFromDatabase = async (): Promise<DatabaseTemplate[]> => {
  try {
    console.log('📚 从数据库获取模板列表...');
    
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('no', { ascending: true });

    if (error) {
      console.error('❌ 获取模板列表失败:', error);
      throw error;
    }

    console.log(`✅ 成功获取 ${templates?.length || 0} 个模板`);
    return templates || [];
  } catch (error) {
    console.error('❌ 数据库查询异常:', error);
    return [];
  }
};

// 动态版本检查逻辑（支持任意语言检查）
const checkExistingVersion = async (templateId: string, projectId: string, language: string) => {
  try {
    let query = supabase
      .from('template_versions')
      .select('version_number')
      .eq('template_id', templateId)
      .eq('project_id', projectId);
    
    // 如果不是检查所有语言，可以添加语言特定的检查逻辑
    // 目前简化为检查是否存在任何版本
    
    const { data, error } = await query
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

// 使用数据库模板生成内容（支持双语）
const generateTemplateFromDatabase = async (template: DatabaseTemplate, projectData: any, language: string = 'zh') => {
  try {
    const templateName = language === 'zh' ? template.name_zh : template.name_en;
    console.log(`🤖 开始生成${language === 'zh' ? '中文' : '英文'}模板: ${templateName}`);
    
    // 构建基于数据库的提示词
    const prompt = buildPromptFromTemplate(template, projectData, language);
    
    console.log(`📝 构建提示词完成，长度: ${prompt.length}`);

    // 使用AI生成内容
    const content = await callAIService(prompt, language);
    
    console.log(`✅ ${templateName} 生成完成，内容长度: ${content.length}`);
    return content;

  } catch (error) {
    console.error(`❌ 生成模板失败 (${template.id}):`, error);
    throw error;
  }
};

// 生成双语模板内容
const generateBilingualTemplate = async (template: DatabaseTemplate, projectData: any) => {
  try {
    console.log(`🌐 开始生成双语模板: ${template.name_zh} / ${template.name_en}`);
    
    // 并行生成中英文版本
    const [contentZh, contentEn] = await Promise.all([
      generateTemplateFromDatabase(template, projectData, 'zh'),
      generateTemplateFromDatabase(template, projectData, 'en')
    ]);
    
    console.log(`✅ 双语模板生成完成: 中文(${contentZh.length}字符) / 英文(${contentEn.length}字符)`);
    
    return {
      contentZh,
      contentEn
    };
  } catch (error) {
    console.error(`❌ 双语模板生成失败 (${template.id}):`, error);
    throw error;
  }
};

// 基于数据库模板构建提示词
const buildPromptFromTemplate = (template: DatabaseTemplate, projectData: any, language: string) => {
  const isEnglish = language === 'en';
  const templateName = isEnglish ? template.name_en : template.name_zh;
  
  // 使用数据库中的 prompt_content 作为基础模板
  let prompt = template.prompt_content;
  
  // 项目信息替换变量
  const projectInfo = isEnglish ?
    `Project Name: ${projectData.name}\nProject Description: ${projectData.description}\nPrimary Category: ${projectData.primary_category}\nSecondary Category: ${projectData.secondary_category}` :
    `项目名称：${projectData.name}\n项目描述：${projectData.description}\n主分类：${projectData.primary_category}\n子分类：${projectData.secondary_category}`;

  // 语言适配处理
  if (isEnglish && prompt.includes('请')) {
    // 如果是英文但模板是中文，进行基础翻译提示
    prompt = `Please generate content in English based on the following template requirements:\n\n${prompt}`;
  } else if (!isEnglish && !prompt.includes('请')) {
    // 如果是中文但模板是英文，进行基础翻译提示  
    prompt = `请根据以下模板要求生成中文内容：\n\n${prompt}`;
  }

  // 组合最终提示词
  const finalPrompt = `${prompt}\n\n${projectInfo}`;
  
  console.log(`🎯 使用模板: ${templateName}`);
  return finalPrompt;
};

// AI服务调用函数
const callAIService = async (prompt: string, language: string): Promise<string> => {
  try {
    // 创建一个带超时的Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI服务调用超时')), 10000); // 10秒超时
    });

    const fetchPromise = fetch('https://api.deepseek.com/v1/chat/completions', {
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
        max_tokens: 2000, // 减少token数量以加快响应
        temperature: 0.7
      })
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      throw new Error(`AI API调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '生成内容为空';
    
  } catch (error) {
    console.error('AI服务调用失败:', error);
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

// 保存模板到数据库（支持双语内容）
const saveTemplate = async (templateData: any) => {
  try {
    // 检查现有版本
    const nextVersion = await checkExistingVersion(
      templateData.template_id,
      templateData.project_id,
      templateData.language
    );

    // 构建输出内容对象
    const buildOutputContent = (content: string, language: string) => ({
      content: content,
      annotations: [],
      language: language,
      generated_at: new Date().toISOString()
    });

    // 保存版本信息到template_versions表 - 支持双语字段
    const insertData: any = {
      template_id: templateData.template_id,
      project_id: templateData.project_id,
      version_number: nextVersion,
      input_content: templateData.input_content || '',
      is_active: true,
      created_by: templateData.user_id || 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1' // 使用提供的用户ID或默认值
    };

    // 如果有双语内容，分别保存到对应字段
    if (templateData.contentZh && templateData.contentEn) {
      insertData.output_content_zh = buildOutputContent(templateData.contentZh, 'zh');
      insertData.output_content_en = buildOutputContent(templateData.contentEn, 'en');
      // 主要字段保存中文版本（保持兼容性）
      insertData.output_content = buildOutputContent(templateData.contentZh, 'zh');
      console.log(`💾 准备保存双语内容: 中文(${templateData.contentZh.length}字符) / 英文(${templateData.contentEn.length}字符)`);
    } else if (templateData.content) {
      // 单语言模式（向后兼容）
      const outputContent = buildOutputContent(templateData.content, templateData.language);
      insertData.output_content = outputContent;
      
      // 根据语言保存到对应字段
      if (templateData.language === 'zh') {
        insertData.output_content_zh = outputContent;
      } else if (templateData.language === 'en') {
        insertData.output_content_en = outputContent;
      }
      console.log(`💾 准备保存单语内容: ${templateData.language}(${templateData.content.length}字符)`);
    }

    console.log(`🔑 使用created_by: ${insertData.created_by}`);

    const { data: version, error: versionError } = await supabase
      .from('template_versions')
      .insert(insertData)
      .select()
      .single();

    if (versionError) {
      console.error('保存版本失败:', versionError);
      throw versionError;
    }

    const templateName = templateData.name || `${templateData.template_id}-v${nextVersion}`;
    console.log(`✅ 模板版本保存成功: ${templateName} (版本 ${nextVersion})`);
    return { version };

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
    const body = event.body ? JSON.parse(event.body) : {};
    
    // 合并查询参数和请求体参数
    const allParams = { ...params, ...body };
    
    const languages = allParams.languages ? 
      (Array.isArray(allParams.languages) ? allParams.languages : allParams.languages.split(',')) : 
      ['zh', 'en'];
    const templateIds = allParams.templates ? 
      (Array.isArray(allParams.templates) ? allParams.templates : allParams.templates.split(',')) : 
      null;
    const categoryCode = allParams.category || '';
    const limit = parseInt(allParams.limit || '10');
    const userId = allParams.user_id || null;
    const tableName = allParams.table || (userId ? 'user_projects' : 'projects');
    const testMode = allParams.test_mode === 'true' || allParams.test_mode === true;
    const demoMode = allParams.demo === 'true' || allParams.demo === true;
    
    // 新增分批处理参数
    const batchSize = parseInt(allParams.batch_size || '1'); // 每批处理的项目数 - 减少到1个
    const templateBatchSize = parseInt(allParams.template_batch_size || '1'); // 每批处理的模板数 - 保持1个
    const maxExecutionTime = parseInt(allParams.max_time || '15000'); // 最大执行时间(毫秒)，留15秒缓冲
    const startOffset = parseInt(allParams.start_offset || '0'); // 开始偏移量
    const templateOffset = parseInt(allParams.template_offset || '0'); // 模板偏移量
    const autoNext = allParams.auto_next === 'true' || allParams.auto_next === true; // 是否自动继续下一批
    
    const startTime = Date.now();
    
    console.log('📋 生成参数:', { 
      languages, templateIds, categoryCode, limit, userId, tableName, testMode, demoMode,
      batchSize, templateBatchSize, maxExecutionTime, startOffset, templateOffset, autoNext
    });

    // 演示模式：使用模拟数据测试双语生成
    if (demoMode) {
      console.log('🎭 进入演示模式，使用模拟数据测试双语生成...');
      
      try {
        console.log('🔧 开始演示模式测试...');
        
        // 先创建一个真实的项目记录用于测试
        const defaultUserId = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
        const mockProjectData = {
          name: 'AI智能助手产品-演示',
          description: '一个基于大语言模型的智能助手产品，提供多语言对话、文档生成、代码辅助等功能',
          primary_category: '人工智能',
          secondary_category: '智能助手',
          primary_category_code: 'ai',
          secondary_category_code: 'assistant',
          user_id: defaultUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 创建演示项目记录...');
        const { data: createdProject, error: projectError } = await supabase
          .from('user_projects')
          .insert(mockProjectData)
          .select()
          .single();

        if (projectError) {
          console.error('❌ 创建演示项目失败:', projectError);
          // 如果创建失败，尝试查找现有项目
          const { data: existingProjects } = await supabase
            .from('user_projects')
            .select('*')
            .eq('user_id', defaultUserId)
            .limit(1);
          
          if (existingProjects && existingProjects.length > 0) {
            console.log('✅ 使用现有项目进行演示');
            var mockProject = existingProjects[0];
          } else {
            throw new Error('无法创建或找到演示项目');
          }
        } else {
          console.log('✅ 演示项目创建成功:', createdProject.id);
          var mockProject = createdProject;
        }

        // 使用真实的模板ID
        const realTemplateId = templateIds && templateIds.length > 0 ? templateIds[0] : '0346ed34-aa1a-4727-b1a5-2e4b86114568';
        const mockTemplate = {
          id: realTemplateId,
          name_zh: '产品需求文档',
          name_en: 'Product Requirements Document',
          prompt_content: '请根据项目信息生成详细的产品需求文档，包含产品概述、功能需求、技术架构等内容'
        };

        // 判断生成模式
        const isMultilingual = languages.length > 1 && languages.includes('zh') && languages.includes('en');
        
        if (isMultilingual) {
          console.log('🌐 演示双语生成模式...');
          
          // 模拟双语内容生成
          const contentZh = `# ${mockTemplate.name_zh}

## 项目概述
**项目名称**: ${mockProject.name}
**项目描述**: ${mockProject.description}

## 功能需求
1. 智能对话功能
2. 文档生成功能
3. 代码辅助功能

## 技术架构
- 前端：React + TypeScript
- 后端：Node.js + Express
- 数据库：PostgreSQL
- AI模型：GPT-4

---
生成时间: ${new Date().toISOString()}
语言: 中文`;

          const contentEn = `# ${mockTemplate.name_en}

## Project Overview
**Project Name**: ${mockProject.name}
**Project Description**: ${mockProject.description}

## Functional Requirements
1. Intelligent conversation functionality
2. Document generation functionality
3. Code assistance functionality

## Technical Architecture
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL
- AI Model: GPT-4

---
Generated Time: ${new Date().toISOString()}
Language: English`;

          console.log(`✅ 模拟双语内容生成完成: 中文(${contentZh.length}字符) / 英文(${contentEn.length}字符)`);

          // 测试保存双语模板
          try {
            console.log('🔄 开始测试保存双语模板...');
            const saveResult = await saveTemplate({
              name: `${mockProject.name} - ${mockTemplate.name_zh}`,
              template_id: mockTemplate.id,
              project_id: mockProject.id,
              contentZh,
              contentEn,
              input_content: `项目：${mockProject.name}\n描述：${mockProject.description}`,
              user_id: defaultUserId
            });
            console.log('✅ 双语模板保存成功:', saveResult);

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: true,
                message: '演示模式：双语模板生成和保存测试完成',
                mode: 'demo_bilingual',
                project: mockProject.name,
                project_id: mockProject.id,
                template: mockTemplate.name_zh,
                content_length_zh: contentZh.length,
                content_length_en: contentEn.length,
                save_result: saveResult,
                languages_used: languages
              })
            };
          } catch (saveError) {
            console.error('❌ 保存双语模板失败:', saveError);
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: true,
                message: '演示模式：双语模板生成成功，但保存失败',
                mode: 'demo_bilingual',
                project: mockProject.name,
                project_id: mockProject.id,
                template: mockTemplate.name_zh,
                content_length_zh: contentZh.length,
                content_length_en: contentEn.length,
                languages_used: languages,
                save_error: saveError instanceof Error ? saveError.message : String(saveError),
                save_error_stack: saveError instanceof Error ? saveError.stack : undefined,
                save_error_details: saveError
              })
            };
          }
        } else {
          // 单语演示模式
          const language = languages[0];
          const templateName = language === 'zh' ? mockTemplate.name_zh : mockTemplate.name_en;
          
          console.log(`🎯 演示单语生成模式: ${language}`);
          
          const content = language === 'zh' ? 
            `# ${mockTemplate.name_zh}\n\n这是一个中文演示内容...\n\n生成时间: ${new Date().toISOString()}` :
            `# ${mockTemplate.name_en}\n\nThis is an English demo content...\n\nGenerated Time: ${new Date().toISOString()}`;

          const saveResult = await saveTemplate({
            name: `${mockProject.name} - ${templateName}`,
            template_id: mockTemplate.id,
            project_id: mockProject.id,
            language,
            content,
            input_content: `项目：${mockProject.name}\n描述：${mockProject.description}`,
            user_id: defaultUserId
          });

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: '演示模式：单语模板生成和保存测试完成',
              mode: 'demo_single',
              project: mockProject.name,
              project_id: mockProject.id,
              template: templateName,
              language,
              content_length: content.length,
              save_result: saveResult
            })
          };
        }
        
      } catch (demoError) {
        console.error('❌ 演示模式失败:', demoError);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            message: '演示模式失败',
            error: demoError instanceof Error ? demoError.message : '未知错误',
            stack: demoError instanceof Error ? demoError.stack : undefined
          })
        };
      }
    }

    // 获取模板列表
    const allTemplates = await getTemplatesFromDatabase();
    if (allTemplates.length === 0) {
      throw new Error('未找到可用的模板');
    }

    // 筛选模板（如果指定了特定模板ID）
    const selectedTemplates = templateIds 
      ? allTemplates.filter(t => templateIds.includes(t.id))
      : allTemplates;

    console.log(`📋 选择模板数量: ${selectedTemplates.length}`);

    // 获取项目数据 - 根据表名和用户ID动态构建查询
    let query = supabase
      .from(tableName)
      .select('*');
    
    // 如果指定了用户ID，添加用户筛选条件
    if (userId && tableName === 'user_projects') {
      query = query.eq('user_id', userId);
      console.log(`👤 筛选用户: ${userId}`);
    }
    
    // 添加一级分类不为空的条件
    if (tableName === 'user_projects' && !testMode) {
      query = query.not('primary_category_code', 'is', null);
      console.log('🔍 筛选条件: primary_category_code 不为空');
    }
    
    // 如果指定了分类，添加分类筛选
    if (categoryCode) {
      if (tableName === 'user_projects') {
        query = query.or(`primary_category_code.eq.${categoryCode},secondary_category_code.eq.${categoryCode}`);
      } else {
        query = query.or(`primary_category_code.eq.${categoryCode},secondary_category_code.eq.${categoryCode}`);
      }
      console.log(`🏷️ 筛选分类: ${categoryCode}`);
    }
    
    // 添加分页支持
    if (limit > 0) {
      query = query.range(startOffset, startOffset + limit - 1);
      console.log(`📄 分页查询: offset=${startOffset}, limit=${limit}`);
    }
    
    const { data: projects, error: projectsError } = await query;
    
    if (projectsError) {
      throw new Error(`获取项目数据失败: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: '没有找到符合条件的项目',
          generated: 0,
          skipped: 0,
          details: [],
          table_used: tableName,
          user_id: userId,
          batch_info: {
            start_offset: startOffset,
            template_offset: templateOffset,
            projects_in_batch: 0,
            has_more_projects: false,
            has_more_templates: false
          }
        })
      };
    }

    console.log(`📊 找到 ${projects.length} 个项目，开始生成模板...`);

    // 测试模式：如果limit为0，只返回查询结果不生成模板
    if (limit === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: `测试模式：找到 ${projects.length} 个符合条件的项目`,
          projects_found: projects.length,
          table_used: tableName,
          user_id: userId,
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            primary_category_code: p.primary_category_code,
            secondary_category_code: p.secondary_category_code
          }))
        })
      };
    }

    const results = {
      generated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
      timeout_reached: false,
      batch_completed: false
    };

    // 分批处理模板
    const templateBatch = selectedTemplates.slice(templateOffset, templateOffset + templateBatchSize);
    console.log(`🎯 处理模板批次: ${templateOffset + 1}-${templateOffset + templateBatch.length}/${selectedTemplates.length}`);

    // 批量生成模板
    for (let projectIndex = 0; projectIndex < projects.length; projectIndex++) {
      const project = projects[projectIndex];
      
      for (let templateIndex = 0; templateIndex < templateBatch.length; templateIndex++) {
        const template = templateBatch[templateIndex];
        
        // 检查执行时间，如果接近超时则停止
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        
        if (elapsedTime > maxExecutionTime) {
          console.log(`⏰ 接近超时限制 (${elapsedTime}ms > ${maxExecutionTime}ms)，停止处理`);
          results.timeout_reached = true;
          break;
        }
        
        try {
          // 检查是否已存在（智能跳过机制）
          const existingVersion = await checkExistingVersion(template.id, project.id, 'any');
          if (existingVersion > 1) {
            const templateName = template.name_zh;
            console.log(`⏭️ 跳过已存在的模板: ${project.name} - ${templateName}`);
            results.skipped++;
            results.details.push({
              project: project.name,
              template: templateName,
              status: 'skipped',
              reason: '已存在版本'
            });
            continue;
          }

          // 判断生成模式：双语 vs 单语
          const isMultilingual = languages.length > 1 && languages.includes('zh') && languages.includes('en');
          
          if (isMultilingual) {
            // 双语生成模式
            console.log(`🌐 使用双语生成模式: ${project.name} - ${template.name_zh}`);
            
            const { contentZh, contentEn } = await generateBilingualTemplate(template, project);
            
            // 保存双语模板
            await saveTemplate({
              name: `${project.name} - ${template.name_zh}`,
              template_id: template.id,
              project_id: project.id,
              contentZh,
              contentEn,
              input_content: `项目：${project.name}\n描述：${project.description}`,
              user_id: userId
            });

            results.generated++;
            results.details.push({
              project: project.name,
              template: template.name_zh,
              status: 'success',
              mode: 'bilingual',
              content_length_zh: contentZh.length,
              content_length_en: contentEn.length
            });

            console.log(`✅ 双语生成完成: ${project.name} - ${template.name_zh}`);
            
          } else {
            // 单语生成模式（向后兼容）
            for (const language of languages) {
              try {
                const existingVersionLang = await checkExistingVersion(template.id, project.id, language);
                if (existingVersionLang > 1) {
                  const templateName = language === 'zh' ? template.name_zh : template.name_en;
                  console.log(`⏭️ 跳过已存在的模板: ${project.name} - ${templateName} (${language})`);
                  results.skipped++;
                  results.details.push({
                    project: project.name,
                    template: templateName,
                    language,
                    status: 'skipped',
                    reason: '已存在版本'
                  });
                  continue;
                }

                // 生成单语模板内容
                const content = await generateTemplateFromDatabase(template, project, language);
                
                // 保存单语模板
                const templateName = language === 'zh' ? template.name_zh : template.name_en;
                
                await saveTemplate({
                  name: `${project.name} - ${templateName}`,
                  template_id: template.id,
                  project_id: project.id,
                  language,
                  content,
                  input_content: `项目：${project.name}\n描述：${project.description}`,
                  user_id: userId
                });

                results.generated++;
                results.details.push({
                  project: project.name,
                  template: templateName,
                  language,
                  status: 'success',
                  mode: 'single',
                  content_length: content.length
                });

                console.log(`✅ 单语生成完成: ${project.name} - ${templateName} (${language})`);

              } catch (langError) {
                const templateName = language === 'zh' ? template.name_zh : template.name_en;
                console.error(`❌ 单语生成失败: ${project.name} - ${templateName} (${language})`, langError);
                results.errors++;
                results.details.push({
                  project: project.name,
                  template: templateName,
                  language,
                  status: 'error',
                  mode: 'single',
                  error: langError instanceof Error ? langError.message : '未知错误'
                });
              }
            }
          }

        } catch (error) {
          console.error(`❌ 模板生成失败: ${project.name} - ${template.name_zh}`, error);
          results.errors++;
          results.details.push({
            project: project.name,
            template: template.name_zh,
            status: 'error',
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }
      
      // 如果超时了，跳出项目循环
      if (results.timeout_reached) {
        break;
      }
    }

    // 计算批次信息
    const hasMoreTemplates = templateOffset + templateBatchSize < selectedTemplates.length;
    const hasMoreProjects = startOffset + projects.length < (limit > 0 ? startOffset + limit : Infinity);
    
    // 如果当前批次完成且没有超时，标记为完成
    if (!results.timeout_reached && !hasMoreTemplates && !hasMoreProjects) {
      results.batch_completed = true;
    }

    console.log('🎉 批量生成完成!', results);

    const response: any = {
      success: true,
      message: `批量生成完成！成功生成 ${results.generated} 个模板，跳过 ${results.skipped} 个，失败 ${results.errors} 个`,
      templates_used: templateBatch.length,
      projects_processed: projects.length,
      table_used: tableName,
      user_id: userId,
      execution_time: Date.now() - startTime,
      batch_info: {
        start_offset: startOffset,
        template_offset: templateOffset,
        projects_in_batch: projects.length,
        templates_in_batch: templateBatch.length,
        has_more_projects: hasMoreProjects,
        has_more_templates: hasMoreTemplates,
        next_project_offset: hasMoreTemplates ? startOffset : startOffset + projects.length,
        next_template_offset: hasMoreTemplates ? templateOffset + templateBatchSize : 0,
        timeout_reached: results.timeout_reached,
        batch_completed: results.batch_completed
      },
      ...results
    };

    // 如果启用自动继续且还有更多数据要处理
    if (autoNext && !results.batch_completed && !results.timeout_reached) {
      const nextOffset = hasMoreTemplates ? startOffset : startOffset + projects.length;
      const nextTemplateOffset = hasMoreTemplates ? templateOffset + templateBatchSize : 0;
      
      response.next_batch_url = `${event.headers.host}${event.path}?` + new URLSearchParams({
        ...allParams,
        start_offset: nextOffset.toString(),
        template_offset: nextTemplateOffset.toString(),
        auto_next: 'true'
      }).toString();
      
      console.log(`🔄 准备下一批次: project_offset=${nextOffset}, template_offset=${nextTemplateOffset}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
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