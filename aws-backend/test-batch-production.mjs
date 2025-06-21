import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 环境变量检查:');
console.log('SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '已设置' : '未设置');

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 模拟AI服务
 */
class MockAIService {
  async generateContent(request) {
    const { prompt, project, template, language } = request;
    
    // 模拟AI生成
    const content = `这是为项目"${project.name}"生成的${template.name_zh}内容。
项目描述：${project.description}
生成语言：${language}
生成时间：${new Date().toISOString()}

${prompt}

基于以上要求，我为您生成以下内容：

## 项目概述
${project.name}是一个创新的技术项目，专注于${project.description}。

## 技术架构
- 前端技术栈：React + TypeScript + Tailwind CSS
- 后端技术栈：Node.js + Express + PostgreSQL
- AI服务：DeepSeek API集成
- 部署：Docker + AWS

## 核心功能
1. 智能对话系统
2. 多轮对话支持
3. 情感分析
4. 智能推荐

## 数据流程
用户输入 → 预处理 → AI分析 → 响应生成 → 结果输出

## 安全考虑
- 数据加密传输
- 用户身份验证
- 访问权限控制
- 日志审计

## 性能优化
- 缓存策略
- 负载均衡
- 数据库优化
- CDN加速

这个架构设计确保了系统的可扩展性、安全性和高性能。`;

    return {
      status: 'success',
      content,
      model: 'deepseek-reasoner',
      tokens: Math.floor(content.length / 4),
      reasoning_tokens: Math.floor(content.length / 8)
    };
  }
}

/**
 * 批量生产服务
 */
class BatchProductionService {
  constructor(supabase, aiService) {
    this.supabase = supabase;
    this.aiService = aiService;
  }

  /**
   * 获取可用模板
   */
  async getAvailableTemplates(limit = 5) {
    try {
      const { data: templates, error } = await this.supabase
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
      console.error('获取可用模板失败', error);
      throw error;
    }
  }

  /**
   * 获取用户项目
   */
  async getUserProjects(limit = 5) {
    try {
      const { data: projects, error } = await this.supabase
        .from('user_projects')
        .select('id, name, description, name_zh, description_zh, name_en, description_en')
        .not('name', 'is', null)
        .not('description', 'is', null)
        .limit(limit);

      if (error) throw new Error(`获取项目失败: ${error.message}`);
      return projects || [];
    } catch (error) {
      console.error('获取用户项目失败', error);
      throw error;
    }
  }

  /**
   * 生成任务列表
   */
  async generateTaskList(projects, templates, skipExisting = true) {
    const tasks = [];
    
    if (skipExisting) {
      // 批量查询已存在的template_versions记录
      const { data: versions } = await this.supabase
        .from('template_versions')
        .select('project_id, template_id')
        .in('project_id', projects.map(p => p.id))
        .in('template_id', templates.map(t => t.id));

      const existingSet = new Set(versions?.map((v) => `${v.project_id}-${v.template_id}`) || []);
      console.log(`📋 已存在 ${existingSet.size} 个版本记录`);
      
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
   * 处理单个任务
   */
  async processTask(project, template) {
    const taskId = `${project.id}-${template.id}`;
    console.log(`🔄 处理: ${project.name} + ${template.name_zh}`, { taskId });

    try {
      const projectName = project.name_zh || project.name || '';
      const projectDesc = project.description_zh || project.description || '';

      // 生成英文内容
      let outputContentEn = '';
      if (template.prompt_content) {
        const request = {
          prompt: template.prompt_content,
          project: { name: projectName, description: projectDesc },
          template: { name_zh: template.name_zh, name_en: template.name_en },
          language: 'en'
        };

        const result = await this.aiService.generateContent(request);
        if (result.status === 'success') {
          outputContentEn = result.content;
        } else {
          throw new Error(`英文内容生成失败: ${result.error}`);
        }
      }

      // 翻译成中文版本
      const outputContentZh = outputContentEn ? await this.translateToZh(outputContentEn) : '';

      // 生成MDC规范
      let mdcPromptContentEn = '';
      let mdcPromptContentZh = '';
      if (template.mdcprompt) {
        const mdcRequest = {
          prompt: template.mdcprompt,
          project: { name: projectName, description: projectDesc },
          template: { name_zh: template.name_zh, name_en: template.name_en },
          language: 'en'
        };

        const mdcResult = await this.aiService.generateContent(mdcRequest);
        if (mdcResult.status === 'success') {
          mdcPromptContentEn = mdcResult.content;
          mdcPromptContentZh = await this.translateToZh(mdcPromptContentEn);
        }
      }

      // 保存到template_versions表
      const { data: versionResult, error: saveError } = await this.supabase
        .from('template_versions')
        .insert({
          template_id: template.id,
          project_id: project.id,
          created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1', // 使用真实用户ID
          input_content: `项目: ${projectName}\n描述: ${projectDesc}`,
          output_content: this.buildOutputContent(outputContentZh, 'zh'),
          output_content_en: this.buildOutputContent(outputContentEn, 'en'),
          output_content_zh: this.buildOutputContent(outputContentZh, 'zh'),
          mdcpromptcontent_en: mdcPromptContentEn,
          mdcpromptcontent_zh: mdcPromptContentZh,
          is_active: true,
          source_language: 'en'
        })
        .select('id')
        .single();

      if (saveError) throw new Error(`保存失败: ${saveError.message}`);

      console.log(`✅ 成功: ${project.name} + ${template.name_zh}`, { 
        taskId, versionId: versionResult.id 
      });

      return {
        projectId: project.id,
        projectName: project.name,
        templateId: template.id,
        templateName: template.name_zh,
        status: 'generated',
        versionId: versionResult.id,
        contentLengths: {
          outputContentEn: outputContentEn.length,
          outputContentZh: outputContentZh.length,
          mdcPromptContentEn: mdcPromptContentEn.length,
          mdcPromptContentZh: mdcPromptContentZh.length
        }
      };

    } catch (error) {
      console.error(`❌ 失败: ${project.name} + ${template.name_zh}`, { taskId, error });
      return {
        projectId: project.id,
        projectName: project.name,
        templateId: template.id,
        templateName: template.name_zh,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 翻译英文内容为中文
   */
  async translateToZh(englishContent) {
    try {
      const request = {
        prompt: `请将以下英文内容翻译成中文，保持原有的格式和结构：\n\n${englishContent.substring(0, 2000)}`,
        project: { name: '', description: '' },
        template: { name_zh: '翻译', name_en: 'Translation' },
        language: 'zh'
      };

      const result = await this.aiService.generateContent(request);
      return result.status === 'success' ? result.content : englishContent;
    } catch (error) {
      console.warn('翻译失败，返回原内容', error);
      return englishContent;
    }
  }

  /**
   * 构建输出内容对象
   */
  buildOutputContent(content, language) {
    return {
      content: content,
      annotations: [],
      language: language,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * 执行批量生产
   */
  async executeBatchProduction(options = {}) {
    const {
      batchSize = 2,
      skipExisting = true,
      limitProjects = 2,
      limitTemplates = 2
    } = options;

    const startTime = new Date();
    console.log('🚀 开始执行生产环境批量生产');
    console.log('═'.repeat(60));

    const result = {
      success: true,
      stats: {
        total: 0,
        generated: 0,
        skipped: 0,
        failed: 0
      },
      details: [],
      execution: {
        startTime: startTime.toISOString(),
        endTime: '',
        duration: ''
      }
    };

    try {
      // 获取数据
      const projects = await this.getUserProjects(limitProjects);
      const templates = await this.getAvailableTemplates(limitTemplates);
      
      console.log(`📋 项目数量: ${projects.length}, 模板数量: ${templates.length}`);

      // 生成任务列表
      const tasks = await this.generateTaskList(projects, templates, skipExisting);
      result.stats.total = tasks.length;
      
      console.log(`📋 总任务数: ${tasks.length}`);

      if (tasks.length === 0) {
        console.log('📋 没有需要处理的任务');
        return this.completeResult(result, startTime, '没有需要处理的任务');
      }

      // 分批执行任务
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        console.log(`📦 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(tasks.length/batchSize)}`);
        
        const batchResults = await Promise.allSettled(
          batch.map(task => this.processTask(task.project, task.template))
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

        // 批次间延迟
        if (i + batchSize < tasks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return this.completeResult(result, startTime);

    } catch (error) {
      console.error('批量生产失败:', error);
      return this.completeResult(result, startTime, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 完成结果处理
   */
  completeResult(result, startTime, message) {
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

    result.execution.endTime = endTime.toISOString();
    result.execution.duration = `${duration}s`;

    if (message) {
      console.log(`🏁 批量生产完成: ${message}`, { 
        stats: result.stats, 
        duration: result.execution.duration 
      });
    } else {
      console.log('🏁 批量生产完成', { 
        stats: result.stats, 
        duration: result.execution.duration 
      });
    }

    return result;
  }
}

// 执行主程序
async function main() {
  try {
    const aiService = new MockAIService();
    const batchService = new BatchProductionService(supabase, aiService);
    
    const results = await batchService.executeBatchProduction({
      batchSize: 2,
      skipExisting: true,
      limitProjects: 2,
      limitTemplates: 2
    });

    console.log('\n📊 执行结果汇总:');
    console.log(`   总任务数: ${results.stats.total}`);
    console.log(`   成功生成: ${results.stats.generated}`);
    console.log(`   跳过任务: ${results.stats.skipped}`);
    console.log(`   失败任务: ${results.stats.failed}`);
    console.log(`   执行时间: ${results.execution.duration}`);

    console.log('\n📋 详细结果:');
    results.details.forEach((detail, index) => {
      const status = detail.status === 'generated' ? '✅' : '❌';
      console.log(`   ${status} 任务${index + 1}: ${detail.projectName} × ${detail.templateName}`);
      if (detail.status === 'generated') {
        console.log(`      版本ID: ${detail.versionId}`);
        console.log(`      内容: 英文${detail.contentLengths.outputContentEn}字符, 中文${detail.contentLengths.outputContentZh}字符`);
      } else {
        console.log(`      错误: ${detail.error}`);
      }
    });

    process.exit(results.stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  }
}

main(); 