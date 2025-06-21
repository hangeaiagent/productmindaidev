#!/usr/bin/env node

/**
 * 增强版模板静态页面生成器 v2.0.1 - 修复版
 * 修复: [object Object] 显示问题
 * 集成: Mermaid突破技术 + 智能分类筛选 + 现代化样式
 */

import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 统计信息类
 */
class FilterStats {
  constructor() {
    this.total = 0;
    this.visible = 0;
    this.hidden = 0;
    this.emptyContent = 0;
    this.generated = 0;
    this.errors = 0;
    this.startTime = Date.now();
  }

  logSummary() {
    const duration = Date.now() - this.startTime;
    const successRate = this.total > 0 ? ((this.generated / this.total) * 100).toFixed(1) : 0;
    
    console.log('\n📊 =============== 生成统计报告 ===============');
    console.log(`⏱️  执行时间: ${this.formatTime(duration)}`);
    console.log(`📝 总记录数: ${this.total}`);
    console.log(`✅ 可见分类: ${this.visible}`);
    console.log(`❌ 隐藏分类: ${this.hidden} (已跳过)`);
    console.log(`📄 空内容: ${this.emptyContent} (已跳过)`);
    console.log(`🎯 成功生成: ${this.generated}`);
    console.log(`⚠️  生成错误: ${this.errors}`);
    console.log(`📈 成功率: ${successRate}%`);
    console.log('==============================================');
  }
  
  formatTime(ms) {
    if (ms < 1000) return '< 1秒';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分${seconds % 60}秒`;
  }
}

/**
 * 进度监控器
 */
class ProgressMonitor {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
  }
  
  update() {
    this.current++;
    const progress = (this.current / this.total * 100).toFixed(1);
    const elapsed = Date.now() - this.startTime;
    const eta = this.current > 0 ? (elapsed / this.current) * (this.total - this.current) : 0;
    
    console.log(`📊 进度: ${progress}% (${this.current}/${this.total}) ETA: ${this.formatTime(eta)}`);
  }
  
  formatTime(ms) {
    if (ms < 1000) return '< 1秒';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分${seconds % 60}秒`;
  }
}

/**
 * Mermaid处理工具类 - 突破性技术
 */
class MermaidUtils {
  static cleanMermaidSyntax(content) {
    if (!content || typeof content !== 'string') {
      return `flowchart TD\n    A[无内容] --> B[请检查数据源]`;
    }

    let cleanContent = content.trim();
    
    // 核心突破：处理压缩成一行的内容
    if (!cleanContent.includes('\n') && cleanContent.length > 30) {
      console.log('🔧 检测到压缩内容，执行智能拆分...');
      
      cleanContent = cleanContent
        // 在箭头前添加换行和缩进
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
    
    // 按行处理和格式化
    let lines = cleanContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // 确保正确的图表声明
    if (lines.length === 0 || !/^(flowchart|graph)\s+(TD|LR|TB|RL|BT)/i.test(lines[0])) {
      if (lines.length > 0 && lines[0].startsWith('graph ')) {
        lines[0] = lines[0].replace(/^graph\s+/, 'flowchart ');
      } else if (lines.length === 0 || !/^flowchart\s+/i.test(lines[0])) {
        lines.unshift('flowchart TD');
      }
    }
    
    // 标准化缩进
    const formattedLines = lines.map((line, index) => {
      if (index === 0) return line;
      return line.startsWith('    ') ? line : `    ${line}`;
    });
    
    const result = formattedLines.join('\n');
    console.log('✅ Mermaid语法清理完成');
    return result;
  }
}

/**
 * 增强的Markdown解析器 - 修复版
 */
class EnhancedMarkdownParser {
  constructor() {
    const renderer = new marked.Renderer();
    
    // 修复代码块渲染问题
    renderer.code = (code, language, escaped) => {
      // 强制转换为字符串，解决[object Object]问题
      let codeStr = '';
      if (typeof code === 'string') {
        codeStr = code;
      } else if (code && typeof code === 'object') {
        // 如果是对象，尝试提取内容
        codeStr = code.content || code.text || JSON.stringify(code, null, 2);
      } else {
        codeStr = String(code || '');
      }
      
      const langStr = typeof language === 'string' ? language : String(language || '');
      
      console.log(`🔧 处理代码块: language="${langStr}", code length=${codeStr.length}`);
      
      if (langStr === 'mermaid') {
        const cleanedCode = MermaidUtils.cleanMermaidSyntax(codeStr);
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
        const validLanguage = hljs.getLanguage(langStr) ? langStr : 'plaintext';
        const highlightedCode = hljs.highlight(codeStr, { language: validLanguage }).value;
        return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
      } catch (error) {
        console.error(`Highlight.js error: ${error}`);
        return `<pre><code>${this.escapeHtml(codeStr)}</code></pre>`;
      }
    };
    
    marked.setOptions({ renderer });
  }
  
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  parse(markdownContent) {
    if (!markdownContent) return '';
    
    // 预处理：确保所有内容都是字符串
    const processedContent = typeof markdownContent === 'string' 
      ? markdownContent 
      : String(markdownContent || '');
      
    return marked.parse(processedContent);
  }
}

/**
 * 现代化HTML生成器
 */
class ModernHtmlGenerator {
  static generate(title, pageHeader, pageSubtitle, contentHtml, lang = 'zh') {
    const keywords = lang === 'zh' ? 
      'AI编程,模板生成,流程图,人工智能,静态页面' : 
      'AI programming,template generation,flowchart,artificial intelligence,static page';
      
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${pageSubtitle}">
    <meta name="keywords" content="${keywords}">
    <meta name="generator" content="Enhanced Template Generator v2.0.1">
    <title>${title}</title>
    
    <!-- Mermaid CDN -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    
    <style>
        /* 现代化样式系统 */
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --text-primary: #333;
            --text-secondary: #666;
            --bg-white: #ffffff;
            --bg-light: #f8f9fa;
            --border-light: #e9ecef;
            --shadow-main: 0 20px 40px rgba(0,0,0,0.1);
            --radius-main: 15px;
            --radius-small: 8px;
        }
        
        * { box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            margin: 0; padding: 20px; 
            background: var(--primary-gradient); 
            min-height: 100vh; 
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .container { 
            max-width: 1200px; 
            margin: 20px auto; 
            background: var(--bg-white); 
            border-radius: var(--radius-main); 
            box-shadow: var(--shadow-main); 
            overflow: hidden; 
        }
        
        /* 头部样式 */
        .header { 
            background: var(--primary-gradient); 
            color: white; 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 2.8em; 
            font-weight: 600; 
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header p { 
            margin: 10px 0 0 0; 
            opacity: 0.9; 
            font-size: 1.2em; 
        }
        
        /* 内容样式 */
        .content { 
            padding: 40px; 
            line-height: 1.7; 
        }
        .content h1, .content h2, .content h3 { 
            border-bottom: 2px solid var(--border-light); 
            padding-bottom: 10px; 
            margin-top: 2em; 
            color: var(--text-primary);
        }
        .content h1 { font-size: 2em; }
        .content h2 { font-size: 1.6em; }
        .content h3 { font-size: 1.3em; }
        
        .content p { margin: 1em 0; }
        .content ul, .content ol { margin: 1em 0; padding-left: 2em; }
        .content li { margin: 0.5em 0; }
        
        /* 代码样式 */
        .content code { 
            background-color: #eef1f4; 
            padding: .2em .4em; 
            margin: 0; 
            font-size: 85%; 
            border-radius: 3px; 
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        .content pre { 
            background-color: #2d2d2d; 
            color: #f8f8f2; 
            padding: 1.5em; 
            border-radius: var(--radius-small); 
            overflow-x: auto;
            margin: 1.5em 0;
        }
        .content pre code { 
            background-color: transparent; 
            padding: 0; 
            color: inherit;
        }
        
        /* Mermaid容器样式 */
        .mermaid-container { 
            background: var(--bg-light); 
            border-radius: 10px; 
            padding: 30px; 
            margin: 30px 0; 
            border: 1px solid var(--border-light); 
            text-align: center;
            position: relative;
        }
        .mermaid { 
            text-align: center; 
            min-height: 200px;
        }
        .loading { 
            text-align: center; 
            padding: 40px; 
            color: var(--text-secondary); 
            font-size: 1.1em;
        }
        .error { 
            background: #ffebee; 
            border: 1px solid #f44336; 
            color: #c62828; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
            text-align: left;
        }
        
        /* 表格样式 */
        .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5em 0;
            background: var(--bg-white);
            border-radius: var(--radius-small);
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .content th, .content td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid var(--border-light);
        }
        .content th {
            background: var(--bg-light);
            font-weight: 600;
            color: var(--text-primary);
        }
        .content tr:hover {
            background: #f8f9fa;
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) { 
            body { padding: 10px; }
            .header h1 { font-size: 2.2em; } 
            .content { padding: 20px; } 
            .mermaid-container { padding: 15px; margin: 20px 0; } 
        }
        
        @media (max-width: 480px) {
            .header { padding: 20px; }
            .header h1 { font-size: 1.8em; }
            .header p { font-size: 1em; }
            .content { padding: 15px; }
        }
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
    
    <script>
        // 初始化Mermaid
        mermaid.initialize({ 
            startOnLoad: true, 
            theme: 'default',
            flowchart: { 
                useMaxWidth: true, 
                htmlLabels: true, 
                curve: 'basis' 
            }
        });
        
        // 页面加载完成后处理Mermaid
        document.addEventListener('DOMContentLoaded', function() {
            const loadingElements = document.querySelectorAll('.loading');
            const errorElements = document.querySelectorAll('.error');
            const mermaidElements = document.querySelectorAll('.mermaid');
            
            try {
                // 隐藏加载提示
                loadingElements.forEach(el => el.style.display = 'none');
                
                // 初始化所有Mermaid图表
                mermaid.init(undefined, mermaidElements);
                
                console.log('✅ Mermaid图表初始化完成');
            } catch (error) {
                console.error('❌ Mermaid初始化失败:', error);
                
                // 显示错误信息
                loadingElements.forEach(el => el.style.display = 'none');
                errorElements.forEach(el => el.style.display = 'block');
                mermaidElements.forEach(el => el.style.display = 'none');
            }
        });
    </script>
</body>
</html>`;
  }
}

/**
 * 增强版模板生成器主类 - 修复版
 */
class EnhancedTemplateGenerator {
  constructor() {
    this.markdownParser = new EnhancedMarkdownParser();
    this.stats = new FilterStats();
  }

  /**
   * 验证系统环境
   */
  async validateEnvironment() {
    console.log('🔍 验证系统环境...');
    
    // 验证数据库连接
    try {
      const { data, error } = await supabase.from('template_versions').select('count').limit(1);
      if (error) throw error;
      console.log('✅ 数据库连接正常');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
    
    // 检查外部JavaScript文件
    try {
      await fs.access('mermaid-handler.js');
      console.log('✅ 外部JavaScript文件存在');
    } catch {
      console.log('⚠️  外部JavaScript文件不存在，Mermaid功能可能受影响');
    }
  }

  /**
   * 获取单条记录（精确模式 - 不执行分类筛选）
   */
  async fetchSingleRecord(templateVersionId) {
    console.log(`🔍 获取单条记录: ${templateVersionId}`);
    console.log(`📝 指定ID模式：跳过分类可见性检查`);
    
    const { data, error } = await supabase
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
      .eq('id', templateVersionId);

    if (error) {
      console.error('❌ 查询失败:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  未找到ID为 ${templateVersionId} 的记录`);
      return [];
    }

    const record = data[0];
    const category = record.templates?.template_categories;
    
    this.stats.total = 1;
    this.stats.visible = 1;
    
    console.log(`✅ 强制处理指定记录 (分类: ${category?.name_zh || '未知'}, isshow=${category?.isshow || 'N/A'})`);
    
    return [this.processRecordData(record)];
  }

  /**
   * 获取可见分类的记录
   */
  async fetchVisibleRecords() {
    console.log('🔍 获取可见分类的记录...');
    
    const { data, error } = await supabase
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

    if (error) {
      console.error('❌ 查询失败:', error.message);
      throw error;
    }

    const records = [];
    if (data) {
      data.forEach(category => {
        if (category.templates) {
          category.templates.forEach(template => {
            if (template.template_versions) {
              template.template_versions.forEach(version => {
                records.push({
                  id: version.id,
                  project_id: version.project_id,
                  output_content_zh: version.output_content_zh,
                  output_content_en: version.output_content_en,
                  templates: {
                    name_zh: template.name_zh,
                    name_en: template.name_en
                  },
                  category: {
                    name_zh: category.name_zh,
                    name_en: category.name_en
                  }
                });
              });
            }
          });
        }
      });
    }

    this.stats.total = records.length;
    this.stats.visible = records.length;
    
    console.log(`✅ 找到 ${records.length} 条可见分类的记录`);
    return records;
  }

  /**
   * 处理记录数据
   */
  processRecordData(record) {
    return {
      id: record.id,
      project_id: record.project_id,
      output_content_zh: record.output_content_zh,
      output_content_en: record.output_content_en,
      templates: {
        name_zh: record.templates?.name_zh,
        name_en: record.templates?.name_en
      },
      category: record.templates?.template_categories ? {
        name_zh: record.templates.template_categories.name_zh,
        name_en: record.templates.template_categories.name_en
      } : null
    };
  }

  /**
   * 提取内容（修复JSON字符串解析问题）
   */
  extractContent(outputContent) {
    if (!outputContent) return '';
    
    // 如果是字符串，尝试解析JSON
    if (typeof outputContent === 'string') {
      try {
        const parsed = JSON.parse(outputContent);
        return parsed.content || '';
      } catch (e) {
        return outputContent; // 如果不是JSON，直接返回字符串
      }
    }
    
    // 如果是对象，直接访问content属性
    if (typeof outputContent === 'object' && outputContent.content) {
      return outputContent.content;
    }
    
    return '';
  }

  /**
   * 检查内容质量
   */
  hasValidContent(record) {
    const zhContent = this.extractContent(record.output_content_zh);
    const enContent = this.extractContent(record.output_content_en);
    
    return (zhContent && zhContent.length > 10) || 
           (enContent && enContent.length > 10);
  }

  /**
   * 处理单条记录
   */
  async processRecord(record) {
    console.log(`\n🔄 处理记录: ${record.id}`);
    
    // 检查内容质量
    if (!this.hasValidContent(record)) {
      console.log(`⚠️  记录 ${record.id} 内容为空，跳过处理`);
      this.stats.emptyContent++;
      return {};
    }
    
    try {
      // 创建输出目录
      const outputDir = path.join('pdhtml', record.project_id);
      await fs.mkdir(outputDir, { recursive: true });
      
      const generatedFiles = {};
      
      // 处理中文版本
      const zhContent = this.extractContent(record.output_content_zh);
      if (zhContent && zhContent.length > 10) {
        const htmlContent = this.markdownParser.parse(zhContent);
        const title = record.templates.name_zh || '中文模板';
        const subtitle = `版本ID: ${record.id}${record.category ? ` | 分类: ${record.category.name_zh}` : ''}`;
        const html = ModernHtmlGenerator.generate(title, title, subtitle, htmlContent, 'zh');
        
        const filePath = path.join(outputDir, `${record.id}.html`);
        await fs.writeFile(filePath, html);
        generatedFiles.cnhtmlpath = path.relative(process.cwd(), filePath);
        
        console.log(`✅ 中文页面: ${generatedFiles.cnhtmlpath}`);
      }
      
      // 处理英文版本
      const enContent = this.extractContent(record.output_content_en);
      if (enContent && enContent.length > 10) {
        const htmlContent = this.markdownParser.parse(enContent);
        const title = record.templates.name_en || 'English Template';
        const subtitle = `Version ID: ${record.id}${record.category ? ` | Category: ${record.category.name_en}` : ''}`;
        const html = ModernHtmlGenerator.generate(title, title, subtitle, htmlContent, 'en');
        
        const filePath = path.join(outputDir, `${record.id}en.html`);
        await fs.writeFile(filePath, html);
        generatedFiles.enhtmlpath = path.relative(process.cwd(), filePath);
        
        console.log(`✅ 英文页面: ${generatedFiles.enhtmlpath}`);
      }
      
      if (Object.keys(generatedFiles).length > 0) {
        this.stats.generated++;
      }
      
      return generatedFiles;
      
    } catch (error) {
      console.error(`❌ 处理记录 ${record.id} 失败:`, error.message);
      this.stats.errors++;
      return {};
    }
  }

  /**
   * 更新数据库
   */
  async updateDatabase(recordId, paths) {
    if (Object.keys(paths).length === 0) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('template_versions')
        .update(paths)
        .eq('id', recordId);

      if (error) {
        console.error(`❌ 数据库更新失败 ${recordId}:`, error.message);
      } else {
        console.log(`✅ 数据库已更新: ${recordId}`);
      }
    } catch (error) {
      console.error(`❌ 数据库更新异常 ${recordId}:`, error.message);
    }
  }

  /**
   * 主执行方法
   */
  async run() {
    console.log('🚀 增强版模版静态页面生成器启动...');
    console.log('版本: v2.0.1 | 修复: [object Object] 问题');
    
    try {
      // 系统环境验证
      await this.validateEnvironment();
      
      // 解析命令行参数
      const args = process.argv.slice(2);
      const idIndex = args.indexOf('--id');
      const onlyId = idIndex !== -1 && args[idIndex + 1] ? args[idIndex + 1] : null;
      
      // 获取数据
      let records;
      if (onlyId) {
        records = await this.fetchSingleRecord(onlyId);
      } else {
        records = await this.fetchVisibleRecords();
      }
      
      if (records.length === 0) {
        console.log('⚠️  没有找到需要处理的记录');
        this.stats.logSummary();
        return;
      }
      
      // 处理记录
      console.log(`\n🔄 开始处理 ${records.length} 条记录...`);
      const progress = new ProgressMonitor(records.length);
      
      for (const record of records) {
        const generatedPaths = await this.processRecord(record);
        await this.updateDatabase(record.id, generatedPaths);
        progress.update();
      }
      
      // 输出统计报告
      console.log('\n🎉 所有任务完成！');
      this.stats.logSummary();
      
    } catch (error) {
      console.error('\n❌ 执行过程中发生错误:', error.message);
      console.error('详细错误:', error);
      process.exit(1);
    }
  }
}

// 执行生成器
new EnhancedTemplateGenerator().run(); 