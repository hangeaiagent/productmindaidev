import { logger } from '../utils/logger';

export interface GenerationRequest {
  prompt: string;
  project: {
    name: string;
    description: string;
    website_url?: string;
  };
  template: {
    name_zh: string;
    name_en: string;
    description_zh?: string;
    description_en?: string;
  };
  language: string;
  maxTokens?: number;
}

export interface GenerationResult {
  content: string;
  status: 'success' | 'error';
  error?: string;
  model?: string;
  tokens?: number;
}

/**
 * 使用DeepSeek API生成内容
 */
async function generateWithDeepSeek(request: GenerationRequest): Promise<GenerationResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API密钥未配置');
  }

  try {
    const systemPrompt = `你是一个专业的产品经理和商业分析师，擅长根据产品信息生成高质量的商业文档。
请基于提供的项目信息和模板要求，生成详细、专业、实用的内容。

语言要求：${request.language === 'zh' ? '请用中文回答' : 'Please answer in English'}

项目信息：
- 项目名称：${request.project.name}
- 项目描述：${request.project.description}
- 官网：${request.project.website_url || '未提供'}

模板信息：
- 模板名称：${request.language === 'zh' ? request.template.name_zh : request.template.name_en}
- 模板描述：${request.language === 'zh' ? request.template.description_zh || '' : request.template.description_en || ''}`;

    const userPrompt = request.prompt;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: request.maxTokens || 4000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('DeepSeek API调用失败', { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`DeepSeek API调用失败: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('DeepSeek API返回无效响应');
    }

    const content = data.choices[0].message?.content || '';
    const usage = data.usage || {};

    logger.info('DeepSeek生成成功', {
      model: 'deepseek-chat',
      tokens: usage.total_tokens,
      contentLength: content.length
    });

    return {
      content,
      status: 'success',
      model: 'deepseek-chat',
      tokens: usage.total_tokens
    };
  } catch (error) {
    logger.error('DeepSeek生成失败', error);
    return {
      content: '',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 使用OpenAI API生成内容
 */
async function generateWithOpenAI(request: GenerationRequest): Promise<GenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API密钥未配置');
  }

  try {
    const systemPrompt = `You are a professional product manager and business analyst who excels at generating high-quality business documents based on product information.
Please generate detailed, professional, and practical content based on the provided project information and template requirements.

Language requirement: ${request.language === 'zh' ? '请用中文回答' : 'Please answer in English'}

Project Information:
- Project Name: ${request.project.name}
- Project Description: ${request.project.description}
- Website: ${request.project.website_url || 'Not provided'}

Template Information:
- Template Name: ${request.language === 'zh' ? request.template.name_zh : request.template.name_en}
- Template Description: ${request.language === 'zh' ? request.template.description_zh || '' : request.template.description_en || ''}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt }
        ],
        max_tokens: request.maxTokens || 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API调用失败', { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`OpenAI API调用失败: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenAI API返回无效响应');
    }

    const content = data.choices[0].message?.content || '';
    const usage = data.usage || {};

    logger.info('OpenAI生成成功', {
      model: 'gpt-3.5-turbo',
      tokens: usage.total_tokens,
      contentLength: content.length
    });

    return {
      content,
      status: 'success',
      model: 'gpt-3.5-turbo',
      tokens: usage.total_tokens
    };
  } catch (error) {
    logger.error('OpenAI生成失败', error);
    return {
      content: '',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 主要的AI生成函数，自动选择可用的AI服务
 */
export async function generateContent(request: GenerationRequest): Promise<GenerationResult> {
  logger.info('开始AI内容生成', {
    projectName: request.project.name,
    templateName: request.template.name_zh,
    language: request.language
  });

  // 优先使用DeepSeek，失败时回退到OpenAI
  const providers = [
    { name: 'DeepSeek', generate: generateWithDeepSeek },
    { name: 'OpenAI', generate: generateWithOpenAI }
  ];

  for (const provider of providers) {
    try {
      logger.info(`尝试使用 ${provider.name} 生成内容`);
      const result = await provider.generate(request);
      
      if (result.status === 'success' && result.content.trim()) {
        logger.info(`${provider.name} 生成成功`);
        return result;
      } else {
        logger.warn(`${provider.name} 生成失败或内容为空`);
      }
    } catch (error) {
      logger.error(`${provider.name} 生成异常`, error);
    }
  }

  // 所有提供商都失败时返回错误
  return {
    content: '',
    status: 'error',
    error: '所有AI服务提供商都无法生成内容'
  };
}

/**
 * 生成双语内容
 */
export async function generateBilingualContent(
  request: Omit<GenerationRequest, 'language'>
): Promise<{ zh: GenerationResult; en: GenerationResult }> {
  logger.info('开始生成双语内容', {
    projectName: request.project.name,
    templateName: request.template.name_zh
  });

  const [zhResult, enResult] = await Promise.all([
    generateContent({ ...request, language: 'zh' }),
    generateContent({ ...request, language: 'en' })
  ]);

  return { zh: zhResult, en: enResult };
}

/**
 * 生成模板内容（generateContent的包装函数）
 */
export async function generateTemplateContent(request: GenerationRequest): Promise<GenerationResult> {
  try {
    logger.info('开始生成模板内容', {
      templateName: request.template.name_zh || request.template.name_en,
      projectName: request.project.name,
      language: request.language
    });

    // 调用基础的generateContent函数
    const result = await generateContent(request);

    if (result.status === 'success') {
      logger.info('模板内容生成成功', {
        templateName: request.template.name_zh || request.template.name_en,
        contentLength: result.content.length,
        model: result.model
      });
    } else {
      logger.error('模板内容生成失败', {
        templateName: request.template.name_zh || request.template.name_en,
        error: result.error
      });
    }

    return result;
  } catch (error) {
    logger.error('生成模板内容异常', {
      templateName: request.template.name_zh || request.template.name_en,
      error: error
    });
    
    return {
      content: '',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 