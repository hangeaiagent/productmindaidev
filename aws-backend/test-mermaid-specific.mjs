#!/usr/bin/env node

/**
 * 专门测试Mermaid语法修复的脚本
 * 测试压缩成一行的Mermaid代码修复
 */

// 模拟压缩的Mermaid内容（你遇到的具体问题）
const problematicMermaid = `graph TDA[广告生成链条] --> B(创意生成)A --> C(数字演员)A --> D(多语言本地化)A --> E(版权合规)Arcads -->|GPT-4+Stable Diffusion 3| BArcads -->|300+数字分身/Unreal MetaHuman| CSynthesia -->|文本驱动通用模型| CArcads -->|Azure Translator+NLLB-200| DRunwayML -->|需第三方插件| D`;

/**
 * 清理Mermaid语法（测试版本）
 */
function cleanMermaidSyntax(content) {
  if (!content || typeof content !== 'string') return 'flowchart TD\n    A[开始] --> B[结束]';
  
  let cleanContent = content.trim();
  
  // 如果是压缩成一行的内容，尝试智能拆分
  if (!cleanContent.includes('\n') && cleanContent.length > 50) {
    // 按常见的Mermaid分隔符拆分
    cleanContent = cleanContent
      .replace(/([A-Z])\s*-->/g, '\n    $1 -->')  // 节点前换行
      .replace(/-->\s*\|([^|]+)\|\s*([A-Z])/g, ' --> |$1| $2')  // 标签格式化
      .replace(/([A-Z])\s*-->\s*([A-Z])/g, '$1 --> $2')  // 标准箭头
      .replace(/([^\s])\s*([A-Z]\[)/g, '$1\n    $2')  // 节点定义前换行
      .trim();
  }
  
  let lines = cleanContent.split('\n').map(line => line.trim()).filter(Boolean);
  
  // 确保首行是正确的图表类型
  const firstLine = lines[0] || '';
  if (!/^(flowchart|graph)\s+/.test(firstLine)) {
    // 如果首行不是图表声明，添加flowchart TD
    lines.unshift('flowchart TD');
  } else if (firstLine.startsWith('graph ')) {
    // 将graph转换为flowchart
    lines[0] = firstLine.replace(/^graph\s+/, 'flowchart ');
  }
  
  // 格式化缩进
  const formattedLines = lines.map((line, index) => {
    if (index === 0) return line; // 首行不缩进
    return line.startsWith('    ') ? line : '    ' + line; // 其他行添加缩进
  });
  
  return formattedLines.join('\n');
}

console.log('🧪 测试Mermaid语法修复');
console.log('═'.repeat(60));

console.log('📝 原始问题内容:');
console.log(problematicMermaid);
console.log('\n' + '─'.repeat(40) + '\n');

console.log('🔧 修复后内容:');
const fixedContent = cleanMermaidSyntax(problematicMermaid);
console.log(fixedContent);
console.log('\n' + '─'.repeat(40) + '\n');

console.log('✅ 修复验证:');
console.log('- 是否有换行:', fixedContent.includes('\n') ? '✓' : '✗');
console.log('- 是否以flowchart开头:', fixedContent.startsWith('flowchart') ? '✓' : '✗');
console.log('- 行数:', fixedContent.split('\n').length);
console.log('- 总长度:', fixedContent.length);

// 生成测试HTML文件
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Mermaid测试</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
    <h1>Mermaid语法修复测试</h1>
    <div class="mermaid">
${fixedContent}
    </div>
    <script>
        mermaid.initialize({startOnLoad: true});
    </script>
</body>
</html>
`;

import fs from 'fs';
import path from 'path';

const outputDir = './mermaid-test-output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const testFile = path.join(outputDir, 'mermaid-syntax-fix-test.html');
fs.writeFileSync(testFile, testHtml, 'utf8');

console.log(`\n📄 测试文件已生成: ${testFile}`);
console.log('🌐 请用浏览器打开该文件验证Mermaid渲染效果'); 