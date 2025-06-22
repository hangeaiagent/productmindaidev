#!/usr/bin/env node

/**
 * 增强版模版静态页面生成器
 * 集成最新突破技术：Mermaid处理 + 智能分类筛选
 * 版本: v2.0.0
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { marked } from 'marked';
import hljs from 'highlight.js';
import fs from 'fs/promises';
import path from 'path';

// 加载环境变量
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 错误：缺少环境变量 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY');
  console.error('请检查根目录 .env 文件配置');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 筛选统计类
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
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const successRate = this.visible > 0 ? ((this.generated / this.visible) * 100).toFixed(1) : '0';
    
    console.log(`
📊 =============== 生成统计报告 ===============
⏱️  执行时间: ${duration}秒
📝 总记录数: ${this.total}
✅ 可见分类: ${this.visible}
❌ 隐藏分类: ${this.hidden} (已跳过)
📄 空内容: ${this.emptyContent} (已跳过)
🎯 成功生成: ${this.generated}
⚠️  生成错误: ${this.errors}
📈 成功率: ${successRate}%
==============================================
    `);
  }
}

/**
 * 进度监控类
 */
class ProgressMonitor {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
  }
  
  update(increment = 1) {
    this.current += increment;
    const progress = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = Date.now() - this.startTime;
    const eta = elapsed > 0 ? (elapsed / this.current) * (this.total - this.current) : 0;
    
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
 * 增强的Markdown解析器
 */
class EnhancedMarkdownParser {
  constructor() {
    const renderer = new marked.Renderer();
    
    // 特殊处理Mermaid代码块 - 修复版
    renderer.code = (code, language) => {
      // 强健的类型转换，处理marked.js的不同版本差异
      let codeStr = '';
      let langStr = '';
      
      // 处理code参数
      if (code === null || code === undefined) {
        codeStr = '';
      } else if (typeof code === 'string') {
        codeStr = code;
      } else if (typeof code === 'object') {
        // 处理marked.js某些版本返回对象的情况
        if (code.text) {
          codeStr = code.text;
        } else if (code.content) {
          codeStr = code.content;
        } else if (code.raw) {
          // 提取```language\n内容\n```中的内容部分
          const rawContent = code.raw;
          const match = rawContent.match(/```[\w]*\n([\s\S]*?)\n```/);
          codeStr = match ? match[1] : rawContent;
        } else {
          codeStr = JSON.stringify(code, null, 2);
        }
      } else {
        codeStr = String(code);
      }
      
      // 处理language参数
      if (typeof language === 'string') {
        langStr = language;
      } else if (typeof language === 'object' && language.lang) {
        langStr = language.lang;
      } else {
        langStr = String(language || '');
      }
      
      console.log(`🔧 代码块处理: 语言="${langStr}", 内容长度=${codeStr.length}`);
      
      // 智能检测Mermaid代码（即使没有明确标记语言）
      const isMermaidCode = langStr === 'mermaid' || 
                           (codeStr.includes('graph ') && (codeStr.includes('-->') || codeStr.includes('---'))) ||
                           (codeStr.includes('flowchart ') && (codeStr.includes('-->') || codeStr.includes('---'))) ||
                           codeStr.includes('gantt') ||
                           codeStr.includes('sequenceDiagram') ||
                           codeStr.includes('classDiagram');
      
      if (isMermaidCode) {
        console.log(`✅ 智能识别为Mermaid图表: ${langStr || '未标记语言'}`);
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
      
      // 其他代码块使用语法高亮并添加拷贝按钮
      try {
        const validLanguage = hljs.getLanguage(langStr) ? langStr : 'plaintext';
        const highlightedCode = hljs.highlight(codeStr, { language: validLanguage }).value;
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-block-wrapper">
          <button class="copy-button" onclick="copyCode('${codeId}')">复制</button>
          <pre><code id="${codeId}" class="hljs ${validLanguage}">${highlightedCode}</code></pre>
        </div>`;
      } catch (error) {
        console.error(`Highlight.js error: ${error}`);
        // HTML转义处理
        const escapedCode = codeStr
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-block-wrapper">
          <button class="copy-button" onclick="copyCode('${codeId}')">复制</button>
          <pre><code id="${codeId}">${escapedCode}</code></pre>
        </div>`;
      }
    };
    
    marked.setOptions({ renderer });
  }

  parse(markdownContent) {
    if (!markdownContent) return '';
    return marked.parse(markdownContent);
  }
}

/**
 * 现代化HTML生成器
 */
class ModernHtmlGenerator {
  static generate(title, pageHeader, pageSubtitle, contentHtml, lang = 'zh', templateData = {}) {
    const siteName = lang === 'zh' ? 'ProductMind AI - 智能产品思维平台' : 'ProductMind AI - Intelligent Product Thinking Platform';
    const siteUrl = 'https://productmindai.com';
    const logoUrl = `${siteUrl}/logo.png`;
    
    const keywords = lang === 'zh' ? 
      'ProductMind AI,AI编程,模板生成,流程图,人工智能,静态页面,产品思维,智能工具' : 
      'ProductMind AI,AI programming,template generation,flowchart,artificial intelligence,static page,product thinking,intelligent tools';
    
    const description = lang === 'zh' ? 
      'ProductMind AI提供专业的AI编程模板和智能工具，助力产品思维和技术创新。' : 
      'ProductMind AI provides professional AI programming templates and intelligent tools for product thinking and technical innovation.';

    // 获取项目信息和其他模板列表
    const projectInfo = templateData.projectInfo || { category: 'AI编程', subcategory: '产品开发' };
    const otherTemplates = templateData.otherTemplates || [];
    const currentTemplateId = templateData.currentTemplateId || '';
    
    // 面包屑导航 - 使用实际的项目分类
    const breadcrumbHtml = `
      <nav class="breadcrumb">
        <a href="/ai-products">${lang === 'zh' ? 'AI产品中心' : 'AI Products Hub'}</a>
        <span class="breadcrumb-separator">｜</span>
        ${projectInfo.primary_code ? 
          `<a href="/ai-products/${projectInfo.primary_code}">${lang === 'zh' ? projectInfo.category : projectInfo.category}</a>` :
          `<span class="breadcrumb-current">${lang === 'zh' ? projectInfo.category : projectInfo.category}</span>`
        }
        <span class="breadcrumb-separator">｜</span>
        ${projectInfo.secondary_code ? 
          `<a href="/ai-products/${projectInfo.secondary_code}">${lang === 'zh' ? projectInfo.subcategory : projectInfo.subcategory}</a>` :
          `<span class="breadcrumb-current">${lang === 'zh' ? projectInfo.subcategory : projectInfo.subcategory}</span>`
        }
      </nav>
    `;

    // 其他模板列表 - 显示同一项目下的其他模板（使用相对路径）
    const otherCategoriesHtml = `
      <div class="other-categories">
        <h3>${lang === 'zh' ? '集成AI编程其他文档' : 'Other AI Programming Documents'}</h3>
        <div class="category-grid">
          ${otherTemplates.map(template => {
            // 生成相对路径链接 - 根据当前页面语言生成对应的文件名
            const targetFileName = lang === 'zh' ? `${template.id}.html` : `${template.id}en.html`;
            return `
            <a href="./${targetFileName}" class="category-item">
              <span class="category-name">${lang === 'zh' ? template.name_zh : (template.name_en || template.name_zh)}</span>
            </a>
          `;
          }).join('')}
          ${otherTemplates.length === 0 ? `
            <div class="more-templates">
              <span class="more-text">${lang === 'zh' ? '暂无其他模板' : 'No other templates'}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
      
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO优化 -->
    <title>${title} - ${siteName}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="ProductMind AI">
    <meta name="generator" content="Enhanced Template Generator v2.1.0">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${siteUrl}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${siteUrl}">
    <meta property="og:title" content="${title} - ${siteName}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${logoUrl}">
    <meta property="og:site_name" content="${siteName}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${siteUrl}">
    <meta property="twitter:title" content="${title} - ${siteName}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${logoUrl}">
    
    <!-- 网站图标 -->
    <link rel="icon" type="image/png" href="${siteUrl}/favicon.png">
    <link rel="apple-touch-icon" href="${siteUrl}/apple-touch-icon.png">
    
    <!-- 结构化数据 -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${title}",
      "description": "${description}",
      "url": "${siteUrl}",
      "publisher": {
        "@type": "Organization",
        "name": "${siteName}",
        "logo": {
          "@type": "ImageObject",
          "url": "${logoUrl}"
        }
      }
    }
    </script>
    
    <!-- Mermaid CDN -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    
    <style>
        /* 现代化样式系统 - 模仿ProductMind AI官网 */
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --primary-color: #667eea;
            --primary-hover: #5a67d8;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-muted: #9ca3af;
            --bg-white: #ffffff;
            --bg-light: #f9fafb;
            --bg-gray: #f3f4f6;
            --border-light: #e5e7eb;
            --border-gray: #d1d5db;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius-sm: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
        }
        
        * { box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            background: var(--bg-light); 
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        /* 网站导航样式 - 模仿ProductMind AI官网紫色渐变 */
        .site-nav {
            background: var(--primary-gradient);
            border-bottom: none;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: var(--shadow-lg);
        }
        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            height: 80px;
            gap: 24px;
        }
        .nav-left {
            display: flex;
            justify-content: flex-start;
        }
        .nav-center {
            display: flex;
            justify-content: center;
        }
        .nav-right {
            display: flex;
            justify-content: flex-end;
        }
        .site-logo {
            display: flex;
            align-items: center;
            text-decoration: none;
            color: white;
        }
        .site-logo img {
            width: 40px;
            height: 40px;
            margin-right: 12px;
            border-radius: var(--radius-sm);
        }
        .logo-text {
            display: flex;
            flex-direction: column;
        }
        .logo-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: white;
            line-height: 1.2;
        }
        .logo-subtitle {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.2;
        }
        .nav-highlight {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 8px 16px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .highlight-icon {
            margin-right: 8px;
            font-size: 1.1em;
        }
        .highlight-text {
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .lang-switch {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.85rem;
        }
        .lang-switch:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        .lang-icon {
            margin-right: 4px;
            font-size: 0.9em;
        }
        .nav-btn {
            display: flex;
            align-items: center;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .nav-btn.secondary {
            color: white;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .nav-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        .nav-btn.primary {
            color: var(--primary-color);
            background: white;
            border: 1px solid white;
        }
        .nav-btn.primary:hover {
            background: rgba(255, 255, 255, 0.9);
            transform: translateY(-1px);
        }
        .btn-icon {
            margin-right: 6px;
            font-size: 0.9em;
        }
        
        /* 面包屑导航 */
        .breadcrumb {
            background: var(--bg-white);
            border-bottom: 1px solid var(--border-light);
            padding: 12px 0;
        }
        .breadcrumb-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            align-items: center;
            font-size: 0.875rem;
        }
        .breadcrumb a {
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 500;
        }
        .breadcrumb a:hover {
            text-decoration: underline;
        }
        .breadcrumb-separator {
            margin: 0 8px;
            color: var(--text-muted);
        }
        .breadcrumb-current {
            color: var(--text-primary);
            font-weight: 500;
        }
        
        /* 主容器 */
        .main-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 24px;
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 32px;
        }
        
        /* 主内容区域 */
        .main-content {
            background: var(--bg-white);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }
        
        /* 页面头部 */
        .page-header { 
            background: var(--primary-gradient); 
            color: white; 
            padding: 48px 40px; 
            text-align: center; 
            position: relative;
        }
        .page-header h1 { 
            margin: 0; 
            font-size: 2.5rem; 
            font-weight: 700; 
            line-height: 1.2;
        }
        
        /* 返回按钮样式 */
        .header-actions {
            position: absolute;
            top: 20px;
            left: 20px;
        }
        .back-to-project-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            color: white;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .back-to-project-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .back-icon {
            flex-shrink: 0;
        }
        
        /* 内容样式 */
        .content { 
            padding: 40px; 
            line-height: 1.7; 
        }
        .content h1, .content h2, .content h3 { 
            border-bottom: 2px solid var(--border-light); 
            padding-bottom: 12px; 
            margin-top: 2em; 
            color: var(--text-primary);
        }
        .content h1 { font-size: 2rem; font-weight: 700; }
        .content h2 { font-size: 1.5rem; font-weight: 600; }
        .content h3 { font-size: 1.25rem; font-weight: 600; }
        
        .content p { margin: 1em 0; }
        .content ul, .content ol { margin: 1em 0; padding-left: 2em; }
        .content li { margin: 0.5em 0; }
        
        /* 侧边栏 */
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        /* 其他模板类型 */
        .other-categories {
            background: var(--bg-white);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            padding: 24px;
        }
        .other-categories h3 {
            margin: 0 0 16px 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .category-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .category-item {
            display: block;
            padding: 12px 16px;
            background: var(--bg-light);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-md);
            text-decoration: none;
            color: var(--text-secondary);
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .category-item:hover {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
            transform: translateY(-1px);
        }
        .category-name {
            font-size: 0.875rem;
        }
        .more-templates {
            padding: 12px 16px;
            background: var(--bg-gray);
            border-radius: var(--radius-md);
            text-align: center;
            border: 1px dashed var(--border-gray);
            margin-top: 8px;
        }
        .more-text {
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-style: italic;
        }
        
        /* 代码样式 */
        .content code { 
            background-color: #f5f5f5; 
            color: #333;
            padding: .2em .4em; 
            margin: 0; 
            font-size: 85%; 
            border-radius: 3px; 
            border: 1px solid #333;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        .content pre { 
            background-color: #f5f5f5; 
            color: #333; 
            padding: 1.5em; 
            border-radius: var(--radius-md); 
            border: 2px solid #333;
            overflow-x: auto;
            margin: 1.5em 0;
            position: relative;
        }
        .content pre code { 
            background-color: transparent; 
            border: none;
            padding: 0; 
            color: inherit;
        }
        
        /* 代码块拷贝按钮 */
        .code-block-wrapper {
            position: relative;
            margin: 1.5em 0;
        }
        .copy-button {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #333;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: all 0.2s ease;
            z-index: 10;
        }
        .copy-button:hover {
            background: #555;
            transform: scale(1.05);
        }
        .copy-button:active {
            transform: scale(0.95);
        }
        .copy-button.copied {
            background: #28a745;
            transform: scale(1.1);
        }
        .copy-button.copied::after {
            content: ' ✓';
        }
        
        /* Mermaid容器样式 */
        .mermaid-container { 
            background: var(--bg-light); 
            border-radius: var(--radius-md); 
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
            background: #fef2f2; 
            border: 1px solid #fca5a5; 
            color: #dc2626; 
            padding: 15px; 
            border-radius: var(--radius-md); 
            margin: 20px 0;
            text-align: left;
        }
        
        /* 页脚样式 - 简化版 */
        .site-footer {
            background: var(--text-primary);
            color: white;
            padding: 32px 0;
            text-align: center;
            margin-top: 64px;
        }
        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
        }
        .footer-logo {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: white;
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .footer-logo img {
            width: 32px;
            height: 32px;
            margin-right: 12px;
            border-radius: var(--radius-sm);
        }
        .copyright {
            color: #9ca3af;
            font-size: 0.875rem;
        }
        
        /* 响应式设计 */
        @media (max-width: 1024px) {
            .main-container {
                grid-template-columns: 1fr;
                gap: 24px;
            }
            .sidebar {
                order: -1;
            }
            .nav-container {
                grid-template-columns: 1fr auto;
                gap: 16px;
            }
            .nav-center {
                grid-column: 1 / -1;
                margin-top: 8px;
            }
            .nav-right {
                justify-content: flex-start;
            }
        }
        
        @media (max-width: 768px) { 
            .nav-container {
                grid-template-columns: 1fr;
                height: auto;
                padding: 16px;
            }
            .nav-left, .nav-center, .nav-right {
                justify-content: center;
            }
            .nav-center {
                margin: 8px 0;
            }
            .nav-actions {
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
            }
            .logo-subtitle {
                display: none;
            }
            .site-logo { font-size: 1.125rem; }
            .site-logo img { width: 32px; height: 32px; }
            .main-container { padding: 16px; }
            .page-header { padding: 32px 24px; }
            .page-header h1 { font-size: 2rem; }
            .header-actions { top: 12px; left: 12px; }
            .back-to-project-btn { padding: 8px 12px; font-size: 0.8rem; }
            .content { padding: 24px; }
            .other-categories { padding: 16px; }
        }
        
        @media (max-width: 480px) {
            .page-header h1 { font-size: 1.75rem; }
            .content { padding: 16px; }
            .nav-actions {
                flex-direction: column;
                gap: 6px;
            }
            .nav-btn, .lang-switch {
                font-size: 0.8rem;
                padding: 6px 12px;
            }
        }
    </style>
</head>
<body>
    <!-- 网站导航 -->
    <nav class="site-nav">
        <div class="nav-container">
            <div class="nav-left">
                <a href="${siteUrl}" class="site-logo">
                    <img src="${logoUrl}" alt="ProductMind AI Logo" onerror="this.style.display='none'">
                    <div class="logo-text">
                        <span class="logo-title">ProductMind AI</span>
                        <span class="logo-subtitle">${lang === 'zh' ? '发现并构建令人惊叹的AI解决方案' : 'Discover & Build Amazing AI Solutions'}</span>
                    </div>
                </a>
            </div>
            
            <div class="nav-center">
                <div class="nav-highlight">
                    <span class="highlight-icon">⚡</span>
                    <span class="highlight-text">${lang === 'zh' ? 'AI产品中心' : 'AI Products Hub'}</span>
                </div>
            </div>
            
            <div class="nav-right">
                <div class="nav-actions">
                    <button class="lang-switch" onclick="toggleLanguage()">
                        <span class="lang-icon">🌐</span>
                        <span class="lang-text">${lang === 'zh' ? '中文' : 'EN'}</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>
    
    <!-- 面包屑导航 -->
    <div class="breadcrumb">
        <div class="breadcrumb-container">
            ${breadcrumbHtml}
        </div>
    </div>
    
    <!-- 主内容容器 -->
    <div class="main-container">
        <!-- 主内容 -->
        <div class="main-content">
            <div class="page-header">
                <div class="header-actions">
                    <a href="./index.html" class="back-to-project-btn">
                        <svg class="back-icon" viewBox="0 0 24 24" width="16" height="16">
                            <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                        <span>${lang === 'zh' ? '返回产品主页' : 'Back to Product'}</span>
                    </a>
                </div>
                <h1>${pageHeader}</h1>
            </div>
            <div class="content">
                ${contentHtml}
            </div>
        </div>
        
        <!-- 侧边栏 -->
        <div class="sidebar">
            ${otherCategoriesHtml}
        </div>
    </div>
    
    <!-- 网站页脚 -->
    <footer class="site-footer">
        <div class="footer-content">
            <a href="${siteUrl}" class="footer-logo">
                <img src="${logoUrl}" alt="ProductMind AI Logo" onerror="this.style.display='none'">
                <span>ProductMind AI</span>
            </a>
            
            <div class="copyright">
                <p>&copy; ${new Date().getFullYear()} ProductMind AI. ${lang === 'zh' ? '保留所有权利。' : 'All rights reserved.'}</p>
            </div>
        </div>
    </footer>
    
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
        
        // 代码拷贝功能
        function copyCode(elementId) {
            const codeElement = document.getElementById(elementId);
            const button = codeElement.parentElement.querySelector('.copy-button');
            
            if (codeElement) {
                const text = codeElement.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    button.classList.add('copied');
                    button.textContent = '已复制';
                    setTimeout(() => {
                        button.classList.remove('copied');
                        button.textContent = '复制';
                    }, 2000);
                }).catch(err => {
                    console.error('复制失败:', err);
                    // 降级方案
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    button.classList.add('copied');
                    button.textContent = '已复制';
                    setTimeout(() => {
                        button.classList.remove('copied');
                        button.textContent = '复制';
                    }, 2000);
                });
            }
        }
        
        // 语言切换功能
        function toggleLanguage() {
            const currentLang = '${lang}';
            const currentUrl = window.location.pathname;
            
            if (currentLang === 'zh') {
                // 切换到英文版：xxx.html → xxxen.html
                if (currentUrl.includes('.html') && !currentUrl.includes('en.html')) {
                    const enUrl = currentUrl.replace('.html', 'en.html');
                    window.location.href = enUrl;
                }
            } else {
                // 切换到中文版：xxxen.html → xxx.html
                if (currentUrl.includes('en.html')) {
                    const zhUrl = currentUrl.replace('en.html', '.html');
                    window.location.href = zhUrl;
                }
            }
        }
    </script>
</body>
</html>`;
  }
}

/**
 * 增强版模板生成器主类
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
    
    // 测试数据库连接
    try {
      const { data, error } = await supabase.from('template_categories').select('count').limit(1);
      if (error) throw error;
      console.log('✅ 数据库连接正常');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw new Error('数据库连接失败');
    }
    
    // 检查输出目录是否存在（不创建目录）
    try {
      await fs.access('static-pages/pdhtml');
      console.log('✅ 输出目录存在: static-pages/pdhtml/');
    } catch {
      console.log('⚠️  输出目录不存在: static-pages/pdhtml/');
      console.log('📝 请手动创建目录或确保目录权限正确');
      // 不抛出错误，继续执行，让processRecord处理具体的目录问题
    }
    
    // 检查外部JavaScript文件
    try {
      await fs.access('aws-backend/mermaid-handler.js');
      console.log('✅ 外部JavaScript文件存在');
    } catch {
      console.warn('⚠️  外部JavaScript文件不存在，Mermaid功能可能受影响');
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
            id,
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
    
    // 指定ID模式：强制处理，不检查分类可见性
    console.log(`✅ 强制处理指定记录 (分类: ${category?.name_zh || category?.name_en || '未知'}, isshow=${category?.isshow || 'N/A'})`);
    this.stats.visible = 1;
    return [this.processRecordData(record)];
  }

  /**
   * 获取所有可见分类的记录（批量模式 - 优化查询）
   */
  async fetchVisibleRecords() {
    console.log('🔍 获取所有可见分类的记录（优化查询）...');
    
    // 简化查询：直接从template_versions表获取记录，然后过滤
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
            id,
            name_zh,
            name_en,
            isshow
          )
        )
      `)
      .not('output_content_zh', 'is', null)
      .not('output_content_en', 'is', null)
      .limit(500); // 限制数量避免超时

    if (error) {
      console.error('❌ 查询失败:', error.message);
      throw error;
    }

    // 过滤可见分类的记录
    const visibleRecords = [];
    if (data && data.length > 0) {
      data.forEach(record => {
        const category = record.templates?.template_categories;
        if (category && category.isshow === 1) {
          visibleRecords.push(this.processRecordData(record));
        }
      });
    }

    this.stats.total = data ? data.length : 0;
    this.stats.visible = visibleRecords.length;
    
    console.log(`✅ 查询到 ${this.stats.total} 条记录，其中 ${visibleRecords.length} 条属于可见分类`);
    return visibleRecords;
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
   * 获取同一项目下的其他模板列表
   */
  async getProjectTemplates(projectId, currentTemplateId) {
    try {
      const { data, error } = await supabase
        .from('template_versions')
        .select(`
          id,
          templates!inner(
            id,
            name_zh,
            name_en,
            template_categories!inner(
              id,
              name_zh,
              name_en,
              isshow
            )
          )
        `)
        .eq('project_id', projectId)
        .eq('templates.template_categories.isshow', 1)
        .neq('id', currentTemplateId)
        .not('output_content_zh', 'is', null)
        .limit(10);
      
      if (error) {
        console.error('获取项目模板列表失败:', error.message);
        return [];
      }
      
      console.log(`📋 获取到同项目下 ${data.length} 个其他模板`);
      
      return data.map(item => ({
        id: item.id,
        name_zh: item.templates.name_zh || '未知模板',
        name_en: item.templates.name_en || 'Unknown Template',
        template_id: item.templates.id
      }));
    } catch (error) {
      console.error('获取项目模板列表异常:', error.message);
      return [];
    }
  }

  /**
   * 获取项目分类信息
   */
  async getProjectCategoryInfo(projectId) {
    try {
      // 1. 查询项目的分类代码
      const { data: projectData, error: projectError } = await supabase
        .from('user_projects')
        .select('primary_category_code, secondary_category_code, name_zh, name_en')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('获取项目分类代码失败:', projectError.message);
        return { category: '未知分类', subcategory: '未知子分类' };
      }
      
      console.log(`📋 项目信息: ${projectData.name_zh || projectData.name_en}`);
      console.log(`📋 项目分类代码: primary=${projectData.primary_category_code}, secondary=${projectData.secondary_category_code}`);
      
      // 2. 查询主分类名称
      let primaryCategoryName = '未知分类';
      if (projectData.primary_category_code) {
        const { data: primaryData, error: primaryError } = await supabase
          .from('user_projectscategory')
          .select('category_name, category_name_en')
          .eq('category_code', projectData.primary_category_code)
          .single();
        
        if (!primaryError && primaryData) {
          primaryCategoryName = primaryData.category_name || primaryData.category_name_en || '未知分类';
        } else {
          console.log(`⚠️  主分类查询失败: ${primaryError?.message}`);
        }
      }
      
      // 3. 查询子分类名称
      let secondaryCategoryName = '未知子分类';
      if (projectData.secondary_category_code) {
        const { data: secondaryData, error: secondaryError } = await supabase
          .from('user_projectscategory')
          .select('category_name, category_name_en')
          .eq('category_code', projectData.secondary_category_code)
          .single();
        
        if (!secondaryError && secondaryData) {
          secondaryCategoryName = secondaryData.category_name || secondaryData.category_name_en || '未知子分类';
        } else {
          console.log(`⚠️  子分类查询失败: ${secondaryError?.message}`);
        }
      }
      
      console.log(`✅ 实际分类信息: ${primaryCategoryName} / ${secondaryCategoryName}`);
      
      return {
        category: primaryCategoryName,
        subcategory: secondaryCategoryName,
        primary_code: projectData.primary_category_code,
        secondary_code: projectData.secondary_category_code,
        project_name: projectData.name_zh || projectData.name_en
      };
      
    } catch (error) {
      console.error('获取项目分类信息异常:', error.message);
      return { category: '未知分类', subcategory: '未知子分类' };
    }
  }

  /**
   * 处理单条记录
   */
  async processRecord(record) {
    console.log(`\n🔄 处理记录: ${record.id}`);
    
    // 详细输出字段内容
    console.log(`📊 字段内容分析:`);
    console.log(`   project_id: ${record.project_id || 'NULL'}`);
    console.log(`   templates.name_zh: ${record.templates?.name_zh || 'NULL'}`);
    console.log(`   templates.name_en: ${record.templates?.name_en || 'NULL'}`);
    
    // 分析中文内容
    const zhContent = this.extractContent(record.output_content_zh);
    console.log(`   output_content_zh 提取内容: "${zhContent.substring(0, 100)}..." (长度: ${zhContent.length})`);
    
    // 分析英文内容
    const enContent = this.extractContent(record.output_content_en);
    console.log(`   output_content_en 提取内容: "${enContent.substring(0, 100)}..." (长度: ${enContent.length})`);
    
    // 检查内容质量
    if (!this.hasValidContent(record)) {
      console.log(`⚠️  记录 ${record.id} 内容为空，跳过处理`);
      console.log(`   原因: 中文内容长度(${zhContent.length}) ≤ 10 且 英文内容长度(${enContent.length}) ≤ 10`);
      this.stats.emptyContent++;
      return {};
    }
    
    try {
      // 检查输出目录是否存在（不强制创建）
      const outputDir = path.join('static-pages/pdhtml', record.project_id);
      try {
        await fs.access(outputDir);
        console.log(`✅ 项目目录存在: ${outputDir}`);
      } catch {
        console.log(`⚠️  项目目录不存在: ${outputDir}`);
        console.log(`📝 将尝试直接写入文件，如果失败请手动创建目录`);
      }
      
      // 获取项目分类信息
      const projectInfo = await this.getProjectCategoryInfo(record.project_id);
      
      // 获取同一项目下的其他模板
      const otherTemplates = await this.getProjectTemplates(record.project_id, record.id);
      console.log(`📋 获取到 ${otherTemplates.length} 个同项目模板`);
      
      // 构建模板数据
      const templateData = {
        projectInfo: projectInfo,
        otherTemplates: otherTemplates,
        currentTemplateId: record.id,
        projectId: record.project_id
      };
      
      const generatedFiles = {};
      
      // 处理中文版本
      if (zhContent) {
        const htmlContent = this.markdownParser.parse(zhContent);
        const title = record.templates.name_zh || '中文模板';
        const html = ModernHtmlGenerator.generate(title, title, '', htmlContent, 'zh', templateData);
        
        const filePath = path.join(outputDir, `${record.id}.html`);
        await fs.writeFile(filePath, html);
        generatedFiles.cnhtmlpath = path.relative(process.cwd(), filePath);
        
        console.log(`✅ 中文页面: ${generatedFiles.cnhtmlpath} (文件已覆盖)`);
      }
      
      // 处理英文版本
      if (enContent) {
        const htmlContent = this.markdownParser.parse(enContent);
        const title = record.templates.name_en || 'English Template';
        const html = ModernHtmlGenerator.generate(title, title, '', htmlContent, 'en', templateData);
        
        const filePath = path.join(outputDir, `${record.id}en.html`);
        await fs.writeFile(filePath, html);
        generatedFiles.enhtmlpath = path.relative(process.cwd(), filePath);
        
        console.log(`✅ 英文页面: ${generatedFiles.enhtmlpath} (文件已覆盖)`);
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
    console.log('版本: v2.0.0 | 集成: Mermaid突破技术 + 智能分类筛选');
    
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