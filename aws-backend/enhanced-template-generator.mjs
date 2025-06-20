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
  static generate(title, pageHeader, pageSubtitle, contentHtml, lang = 'zh') {
    const siteName = lang === 'zh' ? 'ProductMind AI - 智能产品思维平台' : 'ProductMind AI - Intelligent Product Thinking Platform';
    const siteUrl = 'https://productmindai.com';
    const logoUrl = `${siteUrl}/logo.png`;
    
    const keywords = lang === 'zh' ? 
      'ProductMind AI,AI编程,模板生成,流程图,人工智能,静态页面,产品思维,智能工具' : 
      'ProductMind AI,AI programming,template generation,flowchart,artificial intelligence,static page,product thinking,intelligent tools';
    
    const description = pageSubtitle || (lang === 'zh' ? 
      'ProductMind AI提供专业的AI编程模板和智能工具，助力产品思维和技术创新。' : 
      'ProductMind AI provides professional AI programming templates and intelligent tools for product thinking and technical innovation.');
      
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
    <meta name="generator" content="Enhanced Template Generator v2.0.0">
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
            border-radius: var(--radius-small); 
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
        
        /* 网站导航样式 */
        .site-nav {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 10px 0;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
        }
        .site-logo {
            display: flex;
            align-items: center;
            text-decoration: none;
            color: var(--text-primary);
            font-weight: 600;
            font-size: 1.2em;
        }
        .site-logo img {
            width: 32px;
            height: 32px;
            margin-right: 10px;
            border-radius: 6px;
        }
        .nav-links {
            display: flex;
            gap: 20px;
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .nav-links a {
            text-decoration: none;
            color: var(--text-secondary);
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        .nav-links a:hover {
            background: var(--bg-light);
            color: var(--text-primary);
        }
        
        /* 页脚样式 */
        .site-footer {
            background: #2c3e50;
            color: white;
            padding: 40px 20px 20px;
            text-align: center;
            margin-top: 40px;
        }
        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
        }
        .footer-logo {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: white;
            font-size: 1.3em;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .footer-logo img {
            width: 40px;
            height: 40px;
            margin-right: 12px;
            border-radius: 8px;
        }
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .footer-links a {
            color: #bdc3c7;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        .footer-links a:hover {
            color: white;
        }
        .copyright {
            border-top: 1px solid #34495e;
            padding-top: 20px;
            margin-top: 20px;
            color: #95a5a6;
            font-size: 0.9em;
        }
        
        /* 主内容区域调整 */
        .main-content {
            margin-top: 80px; /* 为固定导航留出空间 */
        }
        
        /* 移动端导航优化 */
        @media (max-width: 768px) {
            .nav-links {
                display: none; /* 简化移动端导航 */
            }
            .site-logo {
                font-size: 1.1em;
            }
            .site-logo img {
                width: 28px;
                height: 28px;
            }
            .main-content {
                margin-top: 60px;
            }
            .footer-links {
                flex-direction: column;
                gap: 15px;
            }
        }
    </style>
</head>
<body>
    <!-- 网站导航 -->
    <nav class="site-nav">
        <div class="nav-container">
            <a href="${siteUrl}" class="site-logo">
                <img src="${logoUrl}" alt="ProductMind AI Logo" onerror="this.style.display='none'">
                <span>ProductMind AI</span>
            </a>
            <ul class="nav-links">
                <li><a href="${siteUrl}">${lang === 'zh' ? '首页' : 'Home'}</a></li>
                <li><a href="${siteUrl}/templates">${lang === 'zh' ? '模板库' : 'Templates'}</a></li>
                <li><a href="${siteUrl}/tools">${lang === 'zh' ? '工具' : 'Tools'}</a></li>
                <li><a href="${siteUrl}/about">${lang === 'zh' ? '关于' : 'About'}</a></li>
            </ul>
        </div>
    </nav>
    
    <!-- 主内容 -->
    <div class="main-content">
        <div class="container">
            <div class="header">
                <h1>${pageHeader}</h1>
                <p>${pageSubtitle}</p>
            </div>
            <div class="content">
                ${contentHtml}
            </div>
        </div>
    </div>
    
    <!-- 网站页脚 -->
    <footer class="site-footer">
        <div class="footer-content">
            <a href="${siteUrl}" class="footer-logo">
                <img src="${logoUrl}" alt="ProductMind AI Logo" onerror="this.style.display='none'">
                <span>ProductMind AI</span>
            </a>
            
            <div class="footer-links">
                <a href="${siteUrl}/privacy">${lang === 'zh' ? '隐私政策' : 'Privacy Policy'}</a>
                <a href="${siteUrl}/terms">${lang === 'zh' ? '服务条款' : 'Terms of Service'}</a>
                <a href="${siteUrl}/contact">${lang === 'zh' ? '联系我们' : 'Contact Us'}</a>
                <a href="${siteUrl}/sitemap.xml">${lang === 'zh' ? '网站地图' : 'Sitemap'}</a>
            </div>
            
            <div class="copyright">
                <p>&copy; ${new Date().getFullYear()} ProductMind AI. ${lang === 'zh' ? '保留所有权利。' : 'All rights reserved.'}</p>
                <p>${lang === 'zh' ? '由 ProductMind AI 智能模板生成器强力驱动' : 'Powered by ProductMind AI Template Generator'}</p>
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
        function copyCode(codeId) {
            const codeElement = document.getElementById(codeId);
            const button = codeElement.parentElement.querySelector('.copy-button');
            
            if (!codeElement) {
                console.error('代码元素未找到:', codeId);
                return;
            }
            
            // 获取纯文本内容
            const codeText = codeElement.textContent || codeElement.innerText;
            
            // 使用现代API复制到剪贴板
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(codeText).then(() => {
                    showCopySuccess(button);
                }).catch(err => {
                    console.error('复制失败:', err);
                    fallbackCopyTextToClipboard(codeText, button);
                });
            } else {
                // 降级方案
                fallbackCopyTextToClipboard(codeText, button);
            }
        }
        
        // 降级复制方案
        function fallbackCopyTextToClipboard(text, button) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showCopySuccess(button);
                } else {
                    console.error('复制命令执行失败');
                }
            } catch (err) {
                console.error('复制失败:', err);
            }
            
            document.body.removeChild(textArea);
        }
        
        // 显示复制成功状态
        function showCopySuccess(button) {
            const originalText = button.textContent;
            button.textContent = '已复制';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
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
    
    // 检查输出目录
    try {
      await fs.access('pdhtml');
    } catch {
      await fs.mkdir('pdhtml', { recursive: true });
      console.log('✅ 创建输出目录: pdhtml/');
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
   * 获取所有可见分类的记录（批量模式）
   */
  async fetchVisibleRecords() {
    console.log('🔍 获取所有可见分类的记录...');
    
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

    // 扁平化数据结构
    const records = [];
    if (data && data.length > 0) {
      data.forEach(category => {
        if (category.templates && category.templates.length > 0) {
          category.templates.forEach(template => {
            if (template.template_versions && template.template_versions.length > 0) {
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
    
    // 详细输出字段内容
    console.log(`📊 字段内容分析:`);
    console.log(`   project_id: ${record.project_id || 'NULL'}`);
    console.log(`   templates.name_zh: ${record.templates?.name_zh || 'NULL'}`);
    console.log(`   templates.name_en: ${record.templates?.name_en || 'NULL'}`);
    
    // 分析中文内容
    const zhContent = this.extractContent(record.output_content_zh);
    console.log(`   output_content_zh 原始数据:`, record.output_content_zh);
    console.log(`   output_content_zh 提取内容: "${zhContent}" (长度: ${zhContent.length})`);
    
    // 分析英文内容
    const enContent = this.extractContent(record.output_content_en);
    console.log(`   output_content_en 原始数据:`, record.output_content_en);
    console.log(`   output_content_en 提取内容: "${enContent}" (长度: ${enContent.length})`);
    
    // 检查内容质量
    if (!this.hasValidContent(record)) {
      console.log(`⚠️  记录 ${record.id} 内容为空，跳过处理`);
      console.log(`   原因: 中文内容长度(${zhContent.length}) ≤ 10 且 英文内容长度(${enContent.length}) ≤ 10`);
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
      if (zhContent) {
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
      if (enContent) {
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