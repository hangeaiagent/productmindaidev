import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// 错误类型定义
export class TemplateError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

// 模板服务类
export class TemplateService {
  // 生成模板
  static async generateTemplate(projectId: string, templateId: string, language: string = 'zh') {
    try {
      const response = await fetch('/.netlify/functions/generate-ai-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          templateId,
          language,
        }),
      });

      if (!response.ok) {
        throw new TemplateError(
          `生成失败: ${response.statusText}`,
          'GENERATION_FAILED'
        );
      }

      const data = await response.json();
      if (!data.success) {
        throw new TemplateError(
          data.error || '生成失败',
          'GENERATION_FAILED'
        );
      }

      return data.content;
    } catch (error) {
      if (error instanceof TemplateError) {
        throw error;
      }
      throw new TemplateError(
        `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'GENERATION_FAILED'
      );
    }
  }

  // 下载模板
  static async downloadTemplate(projectId: string, templateId: string, language: string = 'zh') {
    try {
      // 1. 获取模板内容
      const content = await this.generateTemplate(projectId, templateId, language);
      
      // 2. 获取模板信息
      const { data: template, error } = await supabase
        .from('templates')
        .select('name_zh, name_en')
        .eq('id', templateId)
        .single();
        
      if (error) {
        throw new TemplateError('获取模板信息失败', 'TEMPLATE_NOT_FOUND');
      }

      // 3. 生成文件名
      const templateName = language === 'zh' ? template.name_zh : template.name_en;
      const fileName = `${templateName}.md`;

      // 4. 创建并下载文件
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (error) {
      if (error instanceof TemplateError) {
        throw error;
      }
      throw new TemplateError(
        `下载失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'DOWNLOAD_FAILED'
      );
    }
  }

  // 批量下载模板
  static async downloadAllTemplates(projectId: string, language: string = 'zh') {
    try {
      // 1. 获取项目的所有模板
      const { data: templates, error } = await supabase
        .from('template_versions')
        .select(`
          template_id,
          templates:template_id (
            id,
            name_zh,
            name_en
          )
        `)
        .eq('project_id', projectId);

      if (error) {
        throw new TemplateError('获取模板列表失败', 'TEMPLATES_NOT_FOUND');
      }

      // 2. 批量下载
      for (const template of templates) {
        await this.downloadTemplate(projectId, template.template_id, language);
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return true;
    } catch (error) {
      if (error instanceof TemplateError) {
        throw error;
      }
      throw new TemplateError(
        `批量下载失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'BATCH_DOWNLOAD_FAILED'
      );
    }
  }
}