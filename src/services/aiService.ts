import { createParser } from 'eventsource-parser';
import type { EventSourceMessage } from 'eventsource-parser';
import { AIModel, ModelConfig, AIMessage, DeepseekStreamResponse, APIError } from '../types/index';
import { logger } from '../utils/logger';

const API_ENDPOINTS = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  claude: 'https://api.anthropic.com/v1/messages',
  google: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent'
} as const;

/**
 * 创建请求头
 */
function createHeaders(model: AIModel, apiKey?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  if (apiKey) {
  switch (model) {
    case 'deepseek':
    case 'openai':
      case 'google':
        headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'claude':
        headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    }
  }

  return headers;
}

/**
 * 创建请求体
 */
function createRequestBody(model: AIModel, messages: AIMessage[], config: ModelConfig) {
  switch (model) {
    case 'deepseek':
      return {
    model: config.version || 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.95
      };
    case 'claude':
      return {
        model: config.version || 'claude-3-opus-20240229',
        messages,
        stream: true,
        max_tokens: 2000
      };
    case 'google':
      return {
        contents: messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: 0.7,
        },
        stream: true
      };
    default:
      return {
        model: config.version || 'gpt-4',
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2000
  };
  }
}

/**
 * 生成流式响应
 */
export async function generateStream(
  model: AIModel,
  config: ModelConfig,
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  if (!config.apiKey && !config.useSystemCredit) {
    throw new APIError('需要提供API密钥或启用系统额度', 'AUTH_ERROR');
  }

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的产品经理AI助手。请用markdown格式输出分析结果。'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const headers = createHeaders(model, config.apiKey);
  const requestBody = createRequestBody(model, messages, config);

  // 记录完整的请求信息（排除敏感信息）
  logger.log('准备发送请求', {
    model,
    endpoint: API_ENDPOINTS[model],
    promptLength: prompt.length,
    headers: Object.keys(headers),
    requestBody: {
      ...requestBody,
      messages: messages.map(m => ({ 
        role: m.role, 
        contentLength: m.content.length 
      }))
    }
  });

  // 设置请求超时
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
    logger.error('请求超时', {
      model,
      endpoint: API_ENDPOINTS[model],
      timeout: 30000
    });
  }, 30000);

  try {
    const response = await fetch(API_ENDPOINTS[model], {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeout);

    // 记录响应头信息
    const responseHeaders = Object.fromEntries(response.headers.entries());
    logger.debug('收到API响应', {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API请求失败', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: responseHeaders
      });
      
      // 根据状态码分类错误
      switch (response.status) {
        case 401:
          throw new APIError('API密钥无效或已过期', 'AUTH_ERROR');
        case 403:
          throw new APIError('没有访问权限', 'AUTH_ERROR');
        case 429:
          throw new APIError('请求过于频繁，请稍后再试', 'RATE_LIMIT');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new APIError('AI服务暂时不可用，请稍后再试', 'SERVICE_ERROR');
        default:
          throw new APIError(`API请求失败: ${response.status} ${errorText}`, 'UNKNOWN_ERROR');
      }
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      // 尝试读取非流式响应内容
      const text = await response.text();
      logger.warn('响应类型不是event-stream', {
        contentType,
        status: response.status,
        responseText: text.substring(0, 200) // 只记录前200个字符
      });
      throw new APIError('服务器返回了非流式响应', 'INVALID_RESPONSE');
    }

    logger.log('开始处理响应流', {
      status: response.status,
      contentType,
      headers: responseHeaders
    });

    return new ReadableStream({
      async start(controller) {
        try {
          await handleStreamResponse(response, controller, model);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorType = error instanceof APIError ? error.type : 'STREAM_ERROR';
          
          logger.error('处理流数据失败', {
            error: errorMessage,
            errorType,
            errorStack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        } finally {
          controller.close();
        }
      },
      cancel() {
        response.body?.cancel();
        logger.debug('流处理被取消');
      }
    });
  } catch (error) {
    clearTimeout(timeout);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError('请求超时', 'TIMEOUT_ERROR');
    }
    
    // 如果已经是APIError则直接抛出
    if (error instanceof APIError) {
      throw error;
    }
    
    // 其他错误转换为APIError
    throw new APIError(
      error instanceof Error ? error.message : String(error),
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 处理流式响应
 */
async function handleStreamResponse(
  response: Response,
  controller: ReadableStreamDefaultController<Uint8Array>,
  model: AIModel
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is null');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';
  let chunkCount = 0;
  let rawDataCount = 0;
  let totalBytesReceived = 0;

  // 检查响应头部
  const responseHeaders = Object.fromEntries(response.headers.entries());
  logger.debug('开始处理响应', {
    status: response.status,
    headers: responseHeaders,
    model
  });

  // 直接提取内容的正则表达式
  const contentExtractRegex = /data: (.+)(?:\n|$)/g;
  const jsonObjectRegex = /{.+}/;

  try {
    // 读取流数据
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        logger.debug('数据流读取完成', {
          totalBytesReceived,
          totalChunks: chunkCount,
          bufferLength: buffer.length
        });
        break;
      }

      if (value) {
        rawDataCount++;
        totalBytesReceived += value.length;
        
        // 记录接收到的原始数据
        logger.debug('接收到原始数据块', {
          chunkNumber: rawDataCount,
          byteLength: value.length,
          totalReceived: totalBytesReceived,
          valueHexSample: Array.from(value.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')
        });

        try {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // 记录解码后的数据
          logger.debug('解码数据块', {
            chunkLength: chunk.length,
            bufferLength: buffer.length,
            chunkContent: chunk.length > 100 ? `${chunk.substring(0, 100)}...` : chunk
          });

          // 尝试多种解析模式
          
          // 1. 标准 SSE 模式: 寻找 'data: {...}' 格式
          const matches = [...buffer.matchAll(contentExtractRegex)];
          if (matches.length > 0) {
            logger.debug('找到标准SSE格式数据', {
              matchCount: matches.length,
              firstMatch: matches[0][1]
            });
            
            // 重置buffer，保留最后未处理的部分
            const lastMatchIndex = matches[matches.length - 1].index! + matches[matches.length - 1][0].length;
            buffer = buffer.substring(lastMatchIndex);
            
            // 处理每个匹配
            for (const match of matches) {
              const content = match[1].trim();
              if (content === '[DONE]') {
                logger.debug('收到流结束信号');
                continue;
              }
              
              try {
                const data = JSON.parse(content) as DeepseekStreamResponse;
                const text = data.choices?.[0]?.delta?.content || '';
                if (text) {
                  accumulatedText += text;
                  chunkCount++;
                  controller.enqueue(new TextEncoder().encode(text));
                  logger.debug('处理标准SSE数据', {
                    chunkCount,
                    textLength: text.length,
                    text: text.length > 50 ? `${text.substring(0, 50)}...` : text
                  });
                }
              } catch (parseError) {
                logger.warn('标准SSE数据解析失败', {
                  error: parseError instanceof Error ? parseError.message : String(parseError),
                  content
                });
              }
            }
            continue;
          }
          
          // 2. 直接JSON模式：寻找 {...} 格式
          const jsonMatch = buffer.match(jsonObjectRegex);
          if (jsonMatch) {
            logger.debug('找到直接JSON格式数据', {
              match: jsonMatch[0]
            });
            
            try {
              const data = JSON.parse(jsonMatch[0]) as DeepseekStreamResponse;
              buffer = buffer.substring(jsonMatch.index! + jsonMatch[0].length);
              
              const text = data.choices?.[0]?.delta?.content || '';
              if (text) {
                accumulatedText += text;
                chunkCount++;
                controller.enqueue(new TextEncoder().encode(text));
                logger.debug('处理直接JSON数据', {
                  chunkCount,
                  textLength: text.length
                });
              }
            } catch (parseError) {
              logger.warn('直接JSON解析失败', {
                error: parseError instanceof Error ? parseError.message : String(parseError)
              });
            }
            continue;
          }
          
          // 3. 尝试直接从块中提取有用文本
          if (chunk.includes('"content"')) {
            logger.debug('尝试从数据块中提取content', {
              chunkSample: chunk.substring(0, 100)
            });
            
            const contentMatch = chunk.match(/"content":"([^"]+)"/);
            if (contentMatch && contentMatch[1]) {
              const text = contentMatch[1];
              accumulatedText += text;
              chunkCount++;
              controller.enqueue(new TextEncoder().encode(text));
              logger.debug('直接提取content成功', {
                text
              });
            }
          }
          
        } catch (decodeError) {
          logger.error('解码数据失败', {
            error: decodeError instanceof Error ? decodeError.message : String(decodeError),
            valueLength: value.length
          });
        }
      }
    }

    // 如果我们收到了数据但未处理任何内容，尝试一种最后的解析方式
    if (totalBytesReceived > 0 && accumulatedText.length === 0) {
      logger.debug('尝试最后的数据恢复方式');
      
      // 尝试查找任何可能的文本内容
      const contentMatches = buffer.match(/"content":"([^"]+)"/g);
      if (contentMatches) {
        for (const match of contentMatches) {
          const text = match.replace(/"content":"([^"]+)"/, '$1');
          if (text) {
            accumulatedText += text;
            controller.enqueue(new TextEncoder().encode(text));
            logger.debug('从完整buffer中恢复内容', {
              recoveredLength: text.length,
              sample: text.substring(0, 50)
            });
          }
        }
      }
    }

  } catch (error) {
    logger.error('流处理过程出错', {
      error: error instanceof Error ? error.message : String(error),
      totalBytesReceived,
      totalChunks: chunkCount,
      rawDataCount,
      bufferLength: buffer.length
    });
    throw error;
  } finally {
    reader.releaseLock();
  }

  // 检查处理结果
  if (accumulatedText.length === 0) {
    if (totalBytesReceived === 0) {
      logger.warn('未收到任何数据', {
        model,
        rawDataCount,
        totalBytesReceived
      });
      throw new Error('未收到任何数据');
    } else {
      logger.warn('收到数据但处理失败', {
        model,
        rawDataCount,
        totalBytesReceived,
        bufferLength: buffer.length,
        bufferSample: buffer.length > 0 ? buffer.substring(0, Math.min(200, buffer.length)) : ''
      });
      throw new Error(`收到 ${totalBytesReceived} 字节数据但处理失败`);
    }
  }

  logger.log('流处理成功完成', {
    totalLength: accumulatedText.length,
    totalChunks: chunkCount,
    totalBytesReceived
  });
}