import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简单版Markdown转换器，仅用于测试Mermaid
class SimpleMarkdownConverter {
  static cleanMermaidSyntax(content) {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) return '';

    const firstLine = lines.shift() || '';
    let processedFirstLine = firstLine;
    if (firstLine.startsWith('graph')) {
      processedFirstLine = firstLine.replace('graph', 'flowchart');
    }
    
    const indentedLines = lines.map(line => '    ' + line);
    return [processedFirstLine, ...indentedLines].join('\n');
  }

  static processMermaidDiagram(content) {
    const cleanContent = this.cleanMermaidSyntax(content);
    return `<div class="mermaid">${cleanContent}</div>`;
  }

  static convert(markdown) {
    if (!markdown) return '';
    return markdown.replace(/```mermaid\n([\s\S]*?)```/g, (match, content) => {
      return this.processMermaidDiagram(content);
    });
  }
}

// 简单的HTML模板
function createHtmlPage(bodyContent, title) {
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
      body { font-family: sans-serif; padding: 20px; }
      .mermaid {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
      }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${bodyContent}
    <script>
      mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>
  `;
}

console.log('🧪 开始独立的Mermaid语法修复测试\\n');

const testCases = [
  {
    name: '基础流程图',
    content: '```mermaid\nflowchart TD\n    A[数据采集] --> B[特征提取]\n    B --> C[特征工程]\n    C --> D[模型训练]\n    D --> E[结果输出]\n```'
  },
  {
    name: '带样式的流程图',
    content: '```mermaid\nflowchart TD\n    A[开始] --> B[处理]\n    B --> C[结束]\n    style A fill:#e1f5fe\n    style C fill:#f3e5f5\n```'
  },
  {
    name: '旧版graph语法',
    content: '```mermaid\ngraph LR\n    A(圆角) --> B[矩形]\n    B --> C{菱形}\n    C --> D>右向旗帜]\n```'
  }
];

const outputDir = path.join(__dirname, 'mermaid-test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

testCases.forEach((testCase, index) => {
  console.log(`📝 测试案例 ${index + 1}: ${testCase.name}`);
  const htmlContent = SimpleMarkdownConverter.convert(testCase.content);
  const finalHtml = createHtmlPage(htmlContent, `Mermaid测试 - ${testCase.name}`);
  const filePath = path.join(outputDir, `mermaid-test-${index + 1}.html`);
  fs.writeFileSync(filePath, finalHtml, 'utf8');
  console.log(`✅ HTML文件已生成: ${filePath}\\n`);
});

console.log('�� Mermaid独立测试完成!');