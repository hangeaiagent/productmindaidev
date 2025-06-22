#!/usr/bin/env node

/**
 * 修复版模板静态页面生成器
 * 专门解决 [object Object] 显示问题
 */

import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 修复版Markdown解析器
 */
class FixedMarkdownParser {
  constructor() {
    const renderer = new marked.Renderer();
    
    renderer.code = (code, language, escaped) => {
      // 强制确保code是字符串
      let codeStr = '';
      
      if (code === null || code === undefined) {
        codeStr = '';
      } else if (typeof code === 'string') {
        codeStr = code;
      } else if (typeof code === 'object') {
        // 如果是对象，尝试序列化
        codeStr = JSON.stringify(code, null, 2);
      } else {
        codeStr = String(code);
      }
      
      const langStr = String(language || '');
      
      console.log(`🔧 代码块处理: ${langStr}, 长度: ${codeStr.length}`);
      
      if (langStr === 'mermaid') {
        return `<div class="mermaid-container">
          <div class="mermaid">
${codeStr}
          </div>
        </div>`;
      }
      
      return `<pre><code class="language-${langStr}">${this.escapeHtml(codeStr)}</code></pre>`;
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
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  parse(content) {
    return marked.parse(String(content || ''));
  }
}

async function generateFixed(id) {
  console.log(`🔧 修复版生成器处理: ${id}`);
  
  const { data, error } = await supabase
    .from('template_versions')
    .select(`
      id, 
      project_id, 
      output_content_zh, 
      output_content_en, 
      templates:template_id (
        name_zh,
        name_en
      )
    `)
    .eq('id', id);

  if (error || !data || data.length === 0) {
    console.error('记录不存在');
    return;
  }

  const record = data[0];
  const parser = new FixedMarkdownParser();
  
  // 提取内容
  function extractContent(outputContent) {
    if (!outputContent) return '';
    
    if (typeof outputContent === 'string') {
      try {
        const parsed = JSON.parse(outputContent);
        return parsed.content || '';
      } catch (e) {
        return outputContent;
      }
    }
    
    return outputContent.content || '';
  }
  
  const zhContent = extractContent(record.output_content_zh);
  const enContent = extractContent(record.output_content_en);
  
  console.log(`中文内容长度: ${zhContent.length}`);
  console.log(`英文内容长度: ${enContent.length}`);
  
  if (zhContent.length > 10) {
    const htmlContent = parser.parse(zhContent);
    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>${record.templates.name_zh}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
        .mermaid-container { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .mermaid { text-align: center; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #eee; padding: 2px 4px; border-radius: 3px; }
        pre code { background: transparent; padding: 0; }
    </style>
</head>
<body>
    <h1>${record.templates.name_zh}</h1>
    ${htmlContent}
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>`;
    
    const outputDir = path.join('pdhtml', record.project_id);
    await fs.mkdir(outputDir, { recursive: true });
    
    const filePath = path.join(outputDir, `${record.id}-fixed.html`);
    await fs.writeFile(filePath, html);
    
    console.log(`✅ 修复版页面: ${filePath}`);
    return filePath;
  }
}

// 获取命令行参数
const id = process.argv[2];
if (id) {
  generateFixed(id).then(filePath => {
    if (filePath) {
      console.log(`🎉 生成完成，可以用浏览器打开: ${filePath}`);
    }
  }).catch(console.error);
} else {
  console.log('请提供记录ID: node generator-fixed.mjs <record_id>');
} 