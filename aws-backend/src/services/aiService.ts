import { logger } from '../utils/logger';

/**
 * AI技术文档生成服务
 * 
 * 主要功能：
 * - 使用DeepSeek Reasoner生成高质量的技术方案和软件文档
 * - 支持OpenAI GPT-4作为备用选项
 * - 专门针对技术架构、API文档、开发指南等技术文档进行优化
 * - 支持中英文双语技术文档生成
 * 
 * 模型配置：
 * - 主要模型：deepseek-reasoner (推理能力强，适合技术方案设计)
 * - 备用模型：gpt-4 (通用能力强，技术文档质量高)
 * - 优化参数：低温度(0.3)确保技术内容的一致性和准确性
 */

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
 * 使用DeepSeek Reasoner API生成技术方案和文档
 */
async function generateWithDeepSeek(request: GenerationRequest): Promise<GenerationResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API密钥未配置');
  }

  try {
    const systemPrompt = `你是一个资深的软件架构师和技术专家，专门负责生成高质量的技术方案和软件文档。你具备以下专业能力：

1. 深度技术分析：能够深入分析技术需求，提供最佳实践方案
2. 架构设计：擅长设计可扩展、高性能的软件架构
3. 技术选型：基于项目特点推荐合适的技术栈和工具
4. 文档编写：生成结构化、详细的技术文档

请基于以下项目信息，生成专业、实用、详细的技术方案或文档。

语言要求：${request.language === 'zh' ? '请用中文回答，使用专业的技术术语' : 'Please answer in English with professional technical terminology'}

项目信息：
- 项目名称：${request.project.name}
- 项目描述：${request.project.description}
- 官网：${request.project.website_url || '未提供'}

文档类型：
- 文档名称：${request.language === 'zh' ? request.template.name_zh : request.template.name_en}
- 文档描述：${request.language === 'zh' ? request.template.description_zh || '' : request.template.description_en || ''}

注意事项：
- 请生成结构化的内容，包含清晰的标题层级
- 技术方案要考虑可行性、扩展性和维护性
- 文档要包含具体的实施步骤和代码示例（如适用）
- 考虑行业最佳实践和最新技术趋势`;

    const userPrompt = request.prompt;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: request.maxTokens || 8000,
        temperature: 0.3,  // 降低温度以获得更一致和专业的技术内容
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('DeepSeek Reasoner API调用失败', { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`DeepSeek Reasoner API调用失败: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('DeepSeek Reasoner API返回无效响应');
    }

    const content = data.choices[0].message?.content || '';
    const usage = data.usage || {};

    logger.info('DeepSeek Reasoner生成成功', {
      model: 'deepseek-reasoner',
      tokens: usage.total_tokens,
      contentLength: content.length,
      reasoning_tokens: usage.reasoning_tokens || 0
    });

    return {
      content,
      status: 'success',
      model: 'deepseek-reasoner',
      tokens: usage.total_tokens
    };
  } catch (error) {
    logger.error('DeepSeek Reasoner生成失败', error);
    return {
      content: '',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 使用OpenAI API生成技术方案和文档（备用选项）
 */
async function generateWithOpenAI(request: GenerationRequest): Promise<GenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API密钥未配置');
  }

  try {
    const systemPrompt = `You are a senior software architect and technical expert specialized in generating high-quality technical solutions and software documentation. You have the following professional capabilities:

1. Deep Technical Analysis: Ability to analyze technical requirements in depth and provide best practice solutions
2. Architecture Design: Expert in designing scalable, high-performance software architectures
3. Technology Selection: Recommend appropriate tech stacks and tools based on project characteristics
4. Documentation Writing: Generate structured, detailed technical documentation

Please generate professional, practical, and detailed technical solutions or documentation based on the following project information.

Language requirement: ${request.language === 'zh' ? '请用中文回答，使用专业的技术术语' : 'Please answer in English with professional technical terminology'}

Project Information:
- Project Name: ${request.project.name}
- Project Description: ${request.project.description}
- Website: ${request.project.website_url || 'Not provided'}

Document Type:
- Document Name: ${request.language === 'zh' ? request.template.name_zh : request.template.name_en}
- Document Description: ${request.language === 'zh' ? request.template.description_zh || '' : request.template.description_en || ''}

Guidelines:
- Generate structured content with clear heading hierarchy
- Technical solutions should consider feasibility, scalability, and maintainability
- Documentation should include specific implementation steps and code examples (if applicable)
- Consider industry best practices and latest technology trends`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',  // 使用GPT-4获得更好的技术文档质量
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt }
        ],
        max_tokens: request.maxTokens || 6000,
        temperature: 0.3,  // 降低温度以获得更一致的技术内容
        top_p: 0.9
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
      model: 'gpt-4',
      tokens: usage.total_tokens,
      contentLength: content.length
    });

    return {
      content,
      status: 'success',
      model: 'gpt-4',
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
 * 主要的AI生成函数，优先使用DeepSeek Reasoner生成技术方案和文档
 */
export async function generateContent(request: GenerationRequest): Promise<GenerationResult> {
  logger.info('开始AI技术文档生成', {
    projectName: request.project.name,
    templateName: request.template.name_zh,
    language: request.language,
    model: 'deepseek-reasoner (primary)'
  });

  // 优先使用DeepSeek Reasoner，失败时回退到OpenAI GPT-4
  const providers = [
    { name: 'DeepSeek Reasoner', generate: generateWithDeepSeek },
    { name: 'OpenAI GPT-4', generate: generateWithOpenAI }
  ];

  for (const provider of providers) {
    try {
      logger.info(`尝试使用 ${provider.name} 生成技术文档`);
      const result = await provider.generate(request);
      
      if (result.status === 'success' && result.content.trim()) {
        logger.info(`${provider.name} 技术文档生成成功`);
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
    error: '所有AI服务提供商都无法生成技术文档'
  };
}

/**
 * 生成双语技术文档内容
 */
export async function generateBilingualContent(
  request: Omit<GenerationRequest, 'language'>
): Promise<{ zh: GenerationResult; en: GenerationResult }> {
  logger.info('开始生成双语技术文档', {
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
 * 生成技术模板内容（generateContent的包装函数）
 */
export async function generateTemplateContent(request: GenerationRequest): Promise<GenerationResult> {
  try {
    logger.info('开始生成技术模板内容', {
      templateName: request.template.name_zh || request.template.name_en,
      projectName: request.project.name,
      language: request.language,
      model: 'deepseek-reasoner'
    });

    // 调用基础的generateContent函数
    const result = await generateContent(request);

    if (result.status === 'success') {
      logger.info('技术模板内容生成成功', {
        templateName: request.template.name_zh || request.template.name_en,
        contentLength: result.content.length,
        model: result.model
      });
    } else {
      logger.error('技术模板内容生成失败', {
        templateName: request.template.name_zh || request.template.name_en,
        error: result.error
      });
    }

    return result;
  } catch (error) {
    logger.error('生成技术模板内容异常', {
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