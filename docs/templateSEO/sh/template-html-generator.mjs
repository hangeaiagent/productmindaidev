#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { marked } from 'marked';
import hljs from 'highlight.js';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from standard path
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 错误：Supabase URL 或 Anon Key 未在环境变量中设置。');
  console.error('请在项目根目录创建一个 env.example 文件并提供这些值。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * @class MarkdownParser
 * @description Handles parsing of Markdown content, with Mermaid processing support.
 */
class MarkdownParser {
  constructor() {
    const renderer = new marked.Renderer();
    renderer.code = (code, language) => {
      // 特殊处理Mermaid代码块
      if (language === 'mermaid') {
        const cleanedCode = MermaidUtils.cleanMermaidSyntax(code);
        return `<div class="mermaid-container">
          <div class="loading">
            <p>🔄 正在加载流程图...</p>
          </div>
          <div class="error" style="display: none;">
            <p>❌ 流程图加载失败，请刷新页面重试</p>
          </div>
          <div class="mermaid">
${cleanedCode}
          </div>
        </div>`;
      }
      
      // 其他代码块使用语法高亮
      try {
        const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
        const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;
        return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
      } catch (error) {
        console.error(`Highlight.js error: ${error}`);
        return `<pre><code>${code}</code></pre>`;
      }
    };
    marked.setOptions({ renderer });
  }

  /**
   * Parses markdown string to HTML.
   * @param {string} markdownContent - The markdown content to parse.
   * @returns {string} - The resulting HTML.
   */
  parse(markdownContent) {
    if (!markdownContent) return '';
    
    // 使用marked进行markdown处理，Mermaid通过renderer处理
    return marked.parse(markdownContent);
  }
}

/**
 * @class HtmlGenerator
 * @description Generates final HTML pages based on a sophisticated template.
 * The template is derived from 'mermaid-flowchart-demo.html'.
 */
class HtmlGenerator {
  /**
   * Generates a complete, styled HTML document.
   * @param {string} title - The page title.
   * @param {string} pageHeader - The main header title.
   * @param {string} pageSubtitle - The subtitle in the header.
   * @param {string} contentHtml - The main body content (already converted from Markdown).
   * @param {string} lang - The language of the page ('en' or 'zh').
   * @returns {string} - The full HTML page as a string.
   */
  static generate(title, pageHeader, pageSubtitle, contentHtml, lang = 'zh') {
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${pageSubtitle}">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 20px auto; background: white; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.8em; font-weight: 600; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.2em; }
        .content { padding: 30px 40px; line-height: 1.7; }
        .content h1, .content h2, .content h3 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 2em; }
        .content code { background-color: #eef1f4; padding: .2em .4em; margin: 0; font-size: 85%; border-radius: 3px; }
        .content pre code { background-color: transparent; padding: 0; }
        .content pre { background-color: #2d2d2d; color: #f8f8f2; padding: 1.5em; border-radius: 8px; overflow-x: auto; }
        .mermaid-container { background: #f8f9fa; border-radius: 10px; padding: 30px; margin: 20px 0; border: 1px solid #e9ecef; text-align: center; }
        .mermaid { text-align: center; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .error { background: #ffebee; border: 1px solid #f44336; color: #c62828; padding: 15px; border-radius: 5px; margin: 20px 0; }
        @media (max-width: 768px) { .header h1 { font-size: 2.2em; } .content { padding: 20px; } .mermaid-container { padding: 15px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${pageHeader}</h1>
            <p>${pageSubtitle}</p>
        </div>
        <div class="content">
            ${contentHtml}
        </div>
    </div>
    <script src="../../aws-backend/mermaid-handler.js"></script>
</body>
</html>`;
  }
}

/**
 * @class MermaidUtils
 * @description 基于成功Demo的Mermaid处理工具类
 * 参考 docs/页面样式MermaidDemo成功.md 的实现
 */
class MermaidUtils {
  /**
   * 清理和标准化Mermaid语法
   * 基于成功Demo中验证过的处理逻辑
   * @param {string} content - 原始Mermaid内容
   * @returns {string} - 清理后的Mermaid内容
   */
  static cleanMermaidSyntax(content) {
    if (!content || typeof content !== 'string') {
      return `flowchart TD
    A[无内容] --> B[请检查数据源]`;
    }

    let cleanContent = content.trim();
    
    // 处理压缩成一行的内容（常见的数据库存储问题）
    if (!cleanContent.includes('\n') && cleanContent.length > 30) {
      console.log('🔧 处理压缩的Mermaid内容...');
      
      // 智能拆分压缩的内容
      cleanContent = cleanContent
        // 在箭头前添加换行
        .replace(/([A-Za-z0-9\])])\s*-->/g, '$1\n    -->')
        // 处理带标签的箭头
        .replace(/([A-Za-z0-9\])])\s*-->(\s*\|[^|]+\|)/g, '$1\n    -->$2')
        // 在节点定义前添加换行
        .replace(/([A-Za-z0-9]+)\s*\[/g, '\n    $1[')
        .replace(/([A-Za-z0-9]+)\s*\(/g, '\n    $1(')
        .replace(/([A-Za-z0-9]+)\s*\{/g, '\n    $1{')
        // 清理多余空格
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // 按行处理
    let lines = cleanContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // 确保第一行是正确的图表声明
    if (lines.length === 0 || !/^(flowchart|graph)\s+(TD|LR|TB|RL|BT)/i.test(lines[0])) {
      // 如果没有正确的声明，添加默认的
      if (lines.length > 0 && lines[0].startsWith('graph ')) {
        lines[0] = lines[0].replace(/^graph\s+/, 'flowchart ');
      } else if (lines.length === 0 || !/^flowchart\s+/i.test(lines[0])) {
        lines.unshift('flowchart TD');
      }
    }
    
    // 标准化缩进
    const formattedLines = lines.map((line, index) => {
      if (index === 0) return line; // 第一行不缩进
      return line.startsWith('    ') ? line : `    ${line}`;
    });
    
    const result = formattedLines.join('\n');
    console.log('✅ Mermaid语法清理完成');
    return result;
  }
}

/**
 * @class TemplateGenerator
 * @description Main class to orchestrate the generation of static HTML pages.
 */
class TemplateGenerator {
  constructor() {
    this.markdownParser = new MarkdownParser();
  }

  async fetchTemplateVersions(onlyId = null) {
    console.log(onlyId ? `🔍 Fetching data for ID: ${onlyId}` : '🔍 Fetching template versions from visible categories...');
    
    let query;
    
    if (onlyId) {
      // 单条记录查询：直接通过ID查询template_versions
      query = supabase
        .from('template_versions')
        .select(`
          id, 
          project_id, 
          output_content_zh, 
          output_content_en, 
          templates:template_id (
            name_zh,
            name_en,
            template_categories:category_id (
              name_zh,
              name_en,
              isshow
            )
          )
        `)
        .eq('id', onlyId);
    } else {
      // 批量查询：从template_categories开始，筛选isshow=1的记录
      query = supabase
        .from('template_categories')
        .select(`
          id,
          name_zh,
          name_en,
          isshow,
          templates!inner (
            id,
            name_zh,
            name_en,
            template_versions!inner (
              id,
              project_id,
              output_content_zh,
              output_content_en
            )
          )
        `)
        .eq('isshow', 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database query failed:', error.message);
      throw new Error(error.message);
    }

    // 处理查询结果
    let processedRecords = [];
    
    if (onlyId) {
      // 单条记录查询结果处理
      if (data && data.length > 0) {
        const record = data[0];
        // 检查关联的category是否可见
        const category = record.templates?.template_categories;
        if (category && category.isshow === 1) {
          processedRecords.push({
            id: record.id,
            project_id: record.project_id,
            output_content_zh: record.output_content_zh,
            output_content_en: record.output_content_en,
            templates: {
              name_zh: record.templates.name_zh,
              name_en: record.templates.name_en
            }
          });
        } else {
          console.log(`⚠️ Record ${onlyId} belongs to a hidden category, skipping.`);
        }
      }
    } else {
      // 批量查询结果处理：展平嵌套结构
      if (data && data.length > 0) {
        data.forEach(category => {
          if (category.templates && category.templates.length > 0) {
            category.templates.forEach(template => {
              if (template.template_versions && template.template_versions.length > 0) {
                template.template_versions.forEach(version => {
                  processedRecords.push({
                    id: version.id,
                    project_id: version.project_id,
                    output_content_zh: version.output_content_zh,
                    output_content_en: version.output_content_en,
                    templates: {
                      name_zh: template.name_zh,
                      name_en: template.name_en
                    }
                  });
                });
              }
            });
          }
        });
      }
    }

    console.log(`✅ Found ${processedRecords.length} records to process.`);
    return processedRecords;
  }

  extractContent(outputContent) {
    if (!outputContent || typeof outputContent !== 'object' || !outputContent.content) {
      return '';
    }
    return outputContent.content;
  }

  async processRecord(record) {
    const { id, project_id, output_content_zh, output_content_en, templates } = record;
    console.log(`\nProcessing record ID: ${id}`);
    
    const dirPath = path.join('pdhtml', project_id);
    await fs.mkdir(dirPath, { recursive: true });

    const generatedFiles = {};

    // Process Chinese version
    const contentZh = this.extractContent(output_content_zh);
    if (contentZh) {
      const htmlContentZh = this.markdownParser.parse(contentZh);
      const title = templates.name_zh || '中文模板';
      const html = HtmlGenerator.generate(title, title, `版本ID: ${id}`, htmlContentZh, 'zh');
      const filePath = path.join(dirPath, `${id}.html`);
      await fs.writeFile(filePath, html);
      generatedFiles.cnhtmlpath = path.relative(process.cwd(), filePath);
      console.log(`✅ Generated Chinese HTML: ${generatedFiles.cnhtmlpath}`);
    }

    // Process English version
    const contentEn = this.extractContent(output_content_en);
    if (contentEn) {
      const htmlContentEn = this.markdownParser.parse(contentEn);
      const title = templates.name_en || 'English Template';
      const html = HtmlGenerator.generate(title, title, `Version ID: ${id}`, htmlContentEn, 'en');
      const filePath = path.join(dirPath, `${id}en.html`);
      await fs.writeFile(filePath, html);
      generatedFiles.enhtmlpath = path.relative(process.cwd(), filePath);
      console.log(`✅ Generated English HTML: ${generatedFiles.enhtmlpath}`);
    }
    
    return generatedFiles;
  }
  
  async updateDatabase(id, paths) {
      if (Object.keys(paths).length === 0) {
          console.log(`ℹ️ No files generated for ID ${id}, skipping database update.`);
          return;
      }
      console.log(`ℹ️ Updating database for ID: ${id} with paths:`, paths);
      const { error } = await supabase
        .from('template_versions')
        .update(paths)
        .eq('id', id);

      if (error) {
        console.error(`❌ Database update failed for ID ${id}:`, error.message);
      } else {
        console.log(`✅ Database updated successfully for ID ${id}.`);
      }
  }

  async run() {
    const args = process.argv.slice(2);
    const idIndex = args.indexOf('--id');
    const onlyId = idIndex !== -1 && args[idIndex + 1] ? args[idIndex + 1] : null;

    try {
      const records = await this.fetchTemplateVersions(onlyId);
      for (const record of records) {
        const generatedPaths = await this.processRecord(record);
        await this.updateDatabase(record.id, generatedPaths);
      }
      console.log('\n🎉 All tasks completed successfully!');
    } catch (error) {
      console.error('\n❌ An error occurred during execution:', error);
      process.exit(1);
    }
  }
}

// Execute the generator
new TemplateGenerator().run();
