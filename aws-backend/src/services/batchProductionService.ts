import { logger } from '../utils/logger';
import * as supabaseService from './supabaseService';
import * as aiService from './aiService';
import { supabase } from './supabaseService';

// 结果类型定义
export interface BatchProductionResult {
  success: boolean;
  stats: {
    total: number;
    generated: number;
    skipped: number;
    failed: number;
  };
  details: Array<{
    projectId: string;
    projectName: string;
    templateId: string;
    templateName: string;
    status: 'generated' | 'skipped' | 'failed';
    error?: string;
    versionId?: string;
    contentLengths?: {
      outputContentEn: number;
      outputContentZh: number;
      mdcPromptContentEn?: number;
      mdcPromptContentZh?: number;
    };
  }>;
  execution: {
    startTime: string;
    endTime: string;
    duration: string;
  };
}

export interface BatchProductionOptions {
  batchSize?: number;
  dryRun?: boolean;
  skipExisting?: boolean;
  limitProjects?: number;
  limitTemplates?: number;
}

/**
 * 批量生产模板内容主函数
 * 实现用户需求：
 * 1. 对template_categories表中isshow=1的数据对应的templates
 * 2. 对应的user_projects的模板内容进行生成到template_versions
 * 3. 检查template_versions表中不存在对应的project_id和template_id记录
 * 4. 利用templates的prompt_content结合项目描述生成英文版本，保存到output_content_en
 * 5. 再翻译成中文版本，保存到output_content_zh
 * 6. 利用templates的mdcprompt结合项目描述，生成mdcpromptcontent_en再翻译成mdcpromptcontent_zh
 */
export async function batchProductionTemplates(
  options: BatchProductionOptions = {}
): Promise<BatchProductionResult> {
  const startTime = new Date();
  const {
    batchSize = 3,
    dryRun = false,
    skipExisting = true,
    limitProjects = 10,
    limitTemplates = 10
  } = options;

  logger.info('🚀 开始批量生产模板内容', {
    batchSize, dryRun, skipExisting, limitProjects, limitTemplates
  });

  const result: BatchProductionResult = {
    success: true,
    stats: { total: 0, generated: 0, skipped: 0, failed: 0 },
    details: [],
    execution: { startTime: startTime.toISOString(), endTime: '', duration: '' }
  };

  try {
    // 第一步：获取isshow=1的template_categories对应的templates
    const templates = await getAvailableTemplates(limitTemplates);
    if (templates.length === 0) {
      return completeResult(result, startTime, '没有找到isshow=1的可用模板');
    }
    logger.info(`✅ 找到 ${templates.length} 个可用模板`);

    // 第二步：获取user_projects
    const projects = await getUserProjects(limitProjects);
    if (projects.length === 0) {
      return completeResult(result, startTime, '没有可用项目');
    }
    logger.info(`✅ 找到 ${projects.length} 个项目`);

    // 第三步：生成任务列表，检查template_versions中不存在的记录
    const tasks = await generateTaskList(projects, templates, skipExisting);
    result.stats.total = tasks.length;
    logger.info(`📋 生成 ${tasks.length} 个处理任务`);

    if (dryRun) {
      logger.info('🧪 干预模式：不执行实际生成');
      return completeResult(result, startTime, '干预模式完成');
    }

    // 第四步：执行批量生成任务
    await executeBatchTasks(tasks, batchSize, result);
    return completeResult(result, startTime);

  } catch (error) {
    logger.error('❌ 批量生产失败', error);
    result.success = false;
    return completeResult(result, startTime, error instanceof Error ? error.message : '未知错误');
  }
}

/**
 * 获取isshow=1的template_categories对应的templates
 */
async function getAvailableTemplates(limit: number) {
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select(`
        id, name_zh, name_en, prompt_content, mdcprompt,
        template_categories!inner (id, name_zh, isshow)
      `)
      .eq('template_categories.isshow', 1)
      .limit(limit);

    if (error) throw new Error(`获取模板失败: ${error.message}`);
    return templates || [];
  } catch (error) {
    logger.error('获取可用模板失败', error);
    throw error;
  }
}

/**
 * 获取user_projects列表
 */
async function getUserProjects(limit: number) {
  try {
    const { data: projects, error } = await supabase
      .from('user_projects')
      .select('id, name, description, name_zh, description_zh, name_en, description_en')
      .not('name', 'is', null)
      .not('description', 'is', null)
      .limit(limit);

    if (error) throw new Error(`获取项目失败: ${error.message}`);
    return projects || [];
  } catch (error) {
    logger.error('获取用户项目失败', error);
    throw error;
  }
}

/**
 * 生成任务列表，排除template_versions中已存在project_id和template_id的记录
 */
async function generateTaskList(projects: any[], templates: any[], skipExisting: boolean) {
  const tasks: any[] = [];
  
  if (skipExisting) {
    // 批量查询已存在的template_versions记录
    const { data: versions } = await supabase
      .from('template_versions')
      .select('project_id, template_id')
      .in('project_id', projects.map(p => p.id))
      .in('template_id', templates.map(t => t.id));

    const existingSet = new Set(versions?.map((v: any) => `${v.project_id}-${v.template_id}`) || []);
    logger.info(`📋 已存在 ${existingSet.size} 个版本记录`);
    
    // 只添加不存在的组合
    for (const project of projects) {
      for (const template of templates) {
        if (!existingSet.has(`${project.id}-${template.id}`)) {
          tasks.push({ project, template });
        }
      }
    }
  } else {
    // 不跳过，添加所有组合
    for (const project of projects) {
      for (const template of templates) {
        tasks.push({ project, template });
      }
    }
  }

  return tasks;
}

/**
 * 分批执行生成任务
 */
async function executeBatchTasks(tasks: any[], batchSize: number, result: BatchProductionResult) {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    logger.info(`📦 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(tasks.length/batchSize)}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(task => processTask(task.project, task.template))
    );

    // 处理批次结果
    for (let j = 0; j < batchResults.length; j++) {
      const batchResult = batchResults[j];
      const task = batch[j];

      if (batchResult.status === 'fulfilled') {
        const taskResult = batchResult.value;
        result.details.push(taskResult);
        
        if (taskResult.status === 'generated') result.stats.generated++;
        else if (taskResult.status === 'failed') result.stats.failed++;
        else result.stats.skipped++;
      } else {
        result.stats.failed++;
        result.details.push({
          projectId: task.project.id,
          templateId: task.template.id,
          projectName: task.project.name,
          templateName: task.template.name_zh,
          status: 'failed',
          error: batchResult.reason?.message || 'Unknown error'
        });
      }
    }

    // 批次间延迟，避免过度负载
    if (i + batchSize < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * 处理单个任务：生成模板内容并保存到template_versions
 */
async function processTask(project: any, template: any) {
  const taskId = `${project.id}-${template.id}`;
  logger.info(`🔄 处理: ${project.name} + ${template.name_zh}`, { taskId });

  try {
    const projectName = project.name_zh || project.name || '';
    const projectDesc = project.description_zh || project.description || '';

    // 第四步：利用templates的prompt_content结合项目描述生成英文版本
    let outputContentEn = '';
    if (template.prompt_content) {
      const request = {
        prompt: template.prompt_content,
        project: { name: projectName, description: projectDesc },
        template: { name_zh: template.name_zh, name_en: template.name_en },
        language: 'en'
      };

      const result = await aiService.generateContent(request);
      if (result.status === 'success') {
        outputContentEn = result.content;
      } else {
        throw new Error(`英文内容生成失败: ${result.error}`);
      }
    }

    // 第五步：翻译成中文版本
    const outputContentZh = outputContentEn ? await translateToZh(outputContentEn) : '';

    // 第六步：利用templates的mdcprompt生成cursor规则文件内容
    let mdcPromptContentEn = '';
    let mdcPromptContentZh = '';
    if (template.mdcprompt) {
      const mdcRequest = {
        prompt: template.mdcprompt,
        project: { name: projectName, description: projectDesc },
        template: { name_zh: template.name_zh, name_en: template.name_en },
        language: 'en'
      };

      const mdcResult = await aiService.generateContent(mdcRequest);
      if (mdcResult.status === 'success') {
        mdcPromptContentEn = mdcResult.content;
        mdcPromptContentZh = await translateToZh(mdcPromptContentEn);
      }
    }

    // 保存到template_versions表
    const { data: versionResult, error: saveError } = await supabase
      .from('template_versions')
      .insert({
        template_id: template.id,
        project_id: project.id,
        created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1', // 系统用户ID
        input_content: `项目: ${projectName}\n描述: ${projectDesc}`,
        output_content_en: buildOutputContent(outputContentEn, 'en'),
        output_content_zh: buildOutputContent(outputContentZh, 'zh'),
        output_content: buildOutputContent(outputContentZh, 'zh'), // 主字段使用中文
        mdcpromptcontent_en: mdcPromptContentEn,
        mdcpromptcontent_zh: mdcPromptContentZh,
        is_active: true,
        source_language: 'en' // 记录原始生成语言
      })
      .select('id')
      .single();

    if (saveError) throw new Error(`保存失败: ${saveError.message}`);

    logger.info(`✅ 成功: ${project.name} + ${template.name_zh}`, { 
      taskId, versionId: versionResult.id 
    });

    return {
      projectId: project.id,
      projectName: project.name,
      templateId: template.id,
      templateName: template.name_zh,
      status: 'generated' as const,
      versionId: versionResult.id,
      contentLengths: {
        outputContentEn: outputContentEn.length,
        outputContentZh: outputContentZh.length,
        mdcPromptContentEn: mdcPromptContentEn.length,
        mdcPromptContentZh: mdcPromptContentZh.length
      }
    };

  } catch (error) {
    logger.error(`❌ 失败: ${project.name} + ${template.name_zh}`, { taskId, error });
    return {
      projectId: project.id,
      projectName: project.name,
      templateId: template.id,
      templateName: template.name_zh,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 翻译英文内容为中文
 */
async function translateToZh(englishContent: string): Promise<string> {
  try {
    const request = {
      prompt: `请将以下英文内容翻译成中文，保持原有的格式和结构：\n\n${englishContent.substring(0, 2000)}`,
      project: { name: '', description: '' },
      template: { name_zh: '翻译', name_en: 'Translation' },
      language: 'zh'
    };

    const result = await aiService.generateContent(request);
    return result.status === 'success' ? result.content : englishContent;
  } catch (error) {
    logger.warn('翻译失败，返回原内容', error);
    return englishContent;
  }
}

/**
 * 构建输出内容对象
 */
function buildOutputContent(content: string, language: string) {
  return {
    content: content,
    annotations: [],
    language: language,
    generated_at: new Date().toISOString()
  };
}

/**
 * 完成结果处理
 */
function completeResult(result: BatchProductionResult, startTime: Date, message?: string) {
  const endTime = new Date();
  const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

  result.execution.endTime = endTime.toISOString();
  result.execution.duration = `${duration}s`;

  if (message) {
    logger.info(`🏁 批量生产完成: ${message}`, { 
      stats: result.stats, 
      duration: result.execution.duration 
    });
  } else {
    logger.info('🏁 批量生产完成', { 
      stats: result.stats, 
      duration: result.execution.duration 
    });
  }

  return result;
} 