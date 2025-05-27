import { AIModel, ModelConfig } from '../types';
import { logger } from '../utils/logger';
import { estimateTokens, smartTruncateText } from '../utils/text-processor';

const API_ENDPOINTS = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions'
} as const;

// 简单的 token 估算（每个单词约1.3个token）
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// 截断文本以适应token限制
function truncateText(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) return text;

  // 按比例截断文本
  const ratio = maxTokens / currentTokens;
  const newLength = Math.floor(text.length * ratio);
  return text.substring(0, newLength) + '...';
}

export async function generateStream(
  model: AIModel,
  config: ModelConfig,
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  if (!config.apiKey && !config.useSystemCredit) {
    throw new Error('需要提供API密钥或启用系统额度');
  }

  // 限制 prompt 的 token 数量（预留500个token给系统消息和500个给响应）
  const maxPromptTokens = 3000;
  const truncatedPrompt = smartTruncateText(prompt, maxPromptTokens);

  const messages = [
    {
      role: 'system',
      content: '你是一个专业的产品经理AI助手。'
    },
    {
      role: 'user',
      content: truncatedPrompt
    }
  ];

  logger.debug('Token统计', {
    originalLength: prompt.length,
    truncatedLength: truncatedPrompt.length,
    estimatedTokens: estimateTokens(truncatedPrompt),
    maxAllowed: maxPromptTokens,
    distribution: {
      systemMessage: estimateTokens(messages[0].content),
      userMessage: estimateTokens(truncatedPrompt)
    }
  });

  const headers = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  const requestBody = {
    model: config.version || 'deepseek-chat',
    messages,
    stream: true,
    temperature: 0.2,
    max_tokens: 500
  };

  const response = await fetch(API_ENDPOINTS[model], {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('API请求失败', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      promptLength: truncatedPrompt.length,
      estimatedTokens: estimateTokens(truncatedPrompt)
    });
    throw new Error(`API请求失败: ${response.status} ${errorText}`);
  }

  return response.body!;
} 