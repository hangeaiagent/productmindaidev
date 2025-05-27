import { logger } from './logger';

/**
 * 估算文本的token数量
 * 更准确的token估算，考虑中英文和标点符号
 */
export function estimateTokens(text: string): number {
  // 计算英文单词
  const words = text.split(/\s+/).length;
  // 计算中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // 计算标点符号
  const punctuation = (text.match(/[.,!?;:，。！？；：]/g) || []).length;
  
  // 英文单词1.3个token，中文字符2个token，标点0.5个token
  return Math.ceil(words * 1.3 + chineseChars * 2 + punctuation * 0.5);
}

/**
 * 智能截断文本
 */
export function smartTruncateText(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;

  // 分段处理
  const paragraphs = text.split(/\n\s*\n/);
  let result = '';
  let currentTokens = 0;

  // 保留重要段落
  for (const paragraph of paragraphs) {
    // 检查段落的重要性
    const isImportant = /funding|investment|ai|technology|product|market|融资|投资|人工智能|技术|产品|市场/i.test(paragraph);
    const paragraphTokens = estimateTokens(paragraph);
    
    // 如果是重要段落或者是前几段，并且不会超出限制，就保留
    if ((isImportant || paragraphs.indexOf(paragraph) < 3) && 
        currentTokens + paragraphTokens <= maxTokens) {
      result += (result ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }

    // 如果已经接近限制，就停止添加
    if (currentTokens >= maxTokens * 0.9) break;
  }

  return result;
}

/**
 * 构建用于AI分析的文本
 */
export function buildAnalysisText(item: any): string {
  // 限制原始内容长度
  const maxContentTokens = 3000; // 约等于1500个中文字或2300个英文单词
  const fullContent = item.fullContent || item.snippet || '';
  
  // 智能截断全文
  const truncatedContent = smartTruncateText(fullContent, 2000); // 核心内容保留2000 tokens
  
  // 构建分析文本（预留500 tokens给标题和元数据）
  const analysisText = `
标题：${item.title}
来源：${item.source}
发布日期：${item.date || ''}

文章摘要：
${item.snippet ? smartTruncateText(item.snippet, 500) : ''}

核心内容：
${truncatedContent}
`.trim();

  // 最终检查
  const finalTokens = estimateTokens(analysisText);
  if (finalTokens > 3000) {
    return smartTruncateText(analysisText, 3000);
  }

  logger.debug('文本token统计', {
    originalLength: fullContent.length,
    truncatedLength: truncatedContent.length,
    finalTokens,
    chineseChars: (analysisText.match(/[\u4e00-\u9fff]/g) || []).length,
    englishWords: analysisText.split(/\s+/).length,
    contentDistribution: {
      title: estimateTokens(item.title),
      snippet: item.snippet ? estimateTokens(item.snippet) : 0,
      mainContent: estimateTokens(truncatedContent)
    }
  });

  return analysisText;
} 