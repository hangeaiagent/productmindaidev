import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 默认的模型配置 - 与AppContext保持一致
const DEFAULT_MODEL_CONFIG = {
  id: 'deepseek',
  name: 'DeepSeek',
  version: 'deepseek-chat',
  apiKey: 'sk-567abb67b99d4a65acaa2d9ed06c3782',
  useSystemCredit: true
};

// AI消息接口
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// DeepSeek流响应接口
interface DeepseekStreamResponse {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: '只支持POST方法'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      projectId,
      projectName,
      projectDescription,
      primaryCategory,
      secondaryCategory,
      templateId,
      language
    } = body;

    console.log('🤖 开始AI生成模板:', { projectName, templateId, language });

    // 1. 通过templateId查找对应的模板记录
    const { data: templates, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    let templateRecord: any = null;
    if (!templateError && templates) {
      templateRecord = templates;
      console.log('📑 找到数据库模板记录:', {
        id: templateRecord.id,
        name_zh: templateRecord.name_zh,
        name_en: templateRecord.name_en
      });
    } else {
      console.log('⚠️ 未找到对应的模板记录，使用通用模板');
    }

    // 2. 构建prompt - 与Dashboard的buildPrompt逻辑保持一致
    let prompt = '';
    const templateName = templateRecord 
      ? (language === 'zh' ? templateRecord.name_zh : templateRecord.name_en)
      : templateId;
      
    if (templateRecord && templateRecord.prompt_content) {
      // 使用数据库中的模板prompt
      const projectContext = language === 'zh' ? 
        `产品名称：${projectName}\n产品描述：${projectDescription}\n\n` :
        `Product Name: ${projectName}\nProduct Description: ${projectDescription}\n\n`;
      
      const languagePrompt = language === 'zh' ? '请用中文输出内容。' : 'Please provide the output in English.';
      prompt = `${projectContext}${templateRecord.prompt_content}\n\n${languagePrompt}`;
      
      console.log('📝 使用数据库模板构建prompt');
    } else {
      // 回退到通用prompt构建
      prompt = buildGenericPrompt(projectName, projectDescription, primaryCategory, secondaryCategory, templateName, language);
      console.log('📝 使用通用prompt构建');
    }

    console.log('🔧 最终prompt长度:', prompt.length);

    // 3. 调用AI生成服务 - 与Dashboard的generateStream逻辑保持一致
    const aiContent = await generateWithAI(prompt);
    
    if (!aiContent) {
      throw new Error('AI生成内容为空');
    }

    console.log('✅ AI生成成功，内容长度:', aiContent.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        content: aiContent,
        generatedAt: new Date().toISOString(),
        templateId: templateRecord?.id || templateId,
        templateName: templateName,
        method: templateRecord ? 'database_template' : 'generic_prompt'
      })
    };

  } catch (error) {
    console.error('❌ AI生成模板失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '生成模板失败: ' + (error instanceof Error ? error.message : String(error))
      })
    };
  }
};

// 构建通用prompt
function buildGenericPrompt(
  projectName: string, 
  description: string, 
  primaryCategory: string, 
  secondaryCategory: string, 
  templateName: string,
  language: string
): string {
  if (language === 'zh') {
    return `请为以下AI产品项目生成专业的${templateName}文档：

项目信息：
- 产品名称：${projectName}
- 产品描述：${description || '智能AI产品'}
- 一级分类：${primaryCategory}
- 二级分类：${secondaryCategory}

要求：
1. 生成完整、专业的${templateName}文档框架
2. 内容要符合产品管理最佳实践
3. 包含具体的填写指南和示例
4. 结构清晰，易于理解和使用
5. 适合${primaryCategory}/${secondaryCategory}领域的特点

请用Markdown格式输出，包含完整的文档结构和内容指导。`;
  } else {
    return `Please generate a professional ${templateName} document for the following AI product project:

Project Information:
- Product Name: ${projectName}
- Product Description: ${description || 'Intelligent AI Product'}
- Primary Category: ${primaryCategory}
- Secondary Category: ${secondaryCategory}

Requirements:
1. Generate a complete, professional ${templateName} document framework
2. Content should follow product management best practices
3. Include specific filling guidelines and examples
4. Clear structure, easy to understand and use
5. Suitable for ${primaryCategory}/${secondaryCategory} field characteristics

Please output in Markdown format with complete document structure and content guidance.`;
  }
}

// AI生成函数 - 与Dashboard的AI服务保持一致
async function generateWithAI(prompt: string): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的产品经理AI助手。'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const requestBody = {
    model: DEFAULT_MODEL_CONFIG.version,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 0.95
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEFAULT_MODEL_CONFIG.apiKey}`,
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  try {
    console.log('📡 调用DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API请求失败:', response.status, errorText);
      
      // 根据状态码返回用户友好的错误信息
      if (response.status === 402 || (errorText && errorText.includes('Insufficient Balance'))) {
        throw new Error('系统大模型能力异常，请联系客服邮件 402493977@qq.com 解决！');
      }
      
      throw new Error(`API请求失败: ${response.status} ${errorText}`);
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let result = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 处理SSE格式的数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一行，可能不完整

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data) as DeepseekStreamResponse;
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              result += content;
            }
          } catch (parseError) {
            console.warn('解析SSE数据失败:', parseError);
          }
        }
      }
    }

    console.log('📊 AI生成完成，长度:', result.length);
    return result;

  } catch (error) {
    console.error('❌ AI生成过程失败:', error);
    
    // 回退到静态模板
    const fallbackContent = generateFallbackTemplate(prompt);
    console.log('🔄 使用回退模板');
    return fallbackContent;
  }
}

// 回退模板生成
function generateFallbackTemplate(prompt: string): string {
  const isZh = prompt.includes('请用中文') || prompt.includes('产品名称：');
  const currentTime = new Date().toLocaleString(isZh ? 'zh-CN' : 'en-US');
  
  if (isZh) {
    return `# AI产品管理文档模板

## 📋 基本信息
- **生成时间**: ${currentTime}
- **模板版本**: v1.0
- **适用场景**: AI产品开发与管理

## 🎯 文档目标
本文档旨在为AI产品的开发、管理和运营提供标准化的框架和指导。

## 📖 内容结构

### 1. 产品概述
- 产品定义与愿景
- 核心价值主张
- 目标用户群体
- 市场定位

### 2. 需求分析
- 用户需求调研
- 功能需求清单
- 非功能性需求
- 优先级排序

### 3. 技术架构
- 系统架构设计
- AI模型选择
- 数据处理流程
- 技术栈说明

### 4. 开发计划
- 里程碑定义
- 资源分配
- 时间规划
- 风险评估

### 5. 测试验证
- 测试策略
- 性能指标
- 用户验收标准
- 质量保证

### 6. 发布运营
- 发布计划
- 运营策略
- 监控体系
- 持续优化

## 🔧 使用指南
1. 根据项目特点调整模板结构
2. 填写具体的项目信息和数据
3. 定期更新和维护文档内容
4. 与团队成员共享协作

## 📝 填写说明
请根据实际项目情况填写各个章节的具体内容，确保信息的准确性和完整性。

---
*此模板由AI智能生成，请根据实际需求进行调整*`;
  } else {
    return `# AI Product Management Document Template

## 📋 Basic Information
- **Generated Time**: ${currentTime}
- **Template Version**: v1.0
- **Application Scenario**: AI Product Development & Management

## 🎯 Document Objectives
This document aims to provide standardized frameworks and guidance for AI product development, management, and operations.

## 📖 Content Structure

### 1. Product Overview
- Product Definition & Vision
- Core Value Proposition
- Target User Groups
- Market Positioning

### 2. Requirements Analysis
- User Research
- Functional Requirements List
- Non-functional Requirements
- Priority Ranking

### 3. Technical Architecture
- System Architecture Design
- AI Model Selection
- Data Processing Flow
- Technology Stack Description

### 4. Development Plan
- Milestone Definition
- Resource Allocation
- Timeline Planning
- Risk Assessment

### 5. Testing & Validation
- Testing Strategy
- Performance Metrics
- User Acceptance Criteria
- Quality Assurance

### 6. Release & Operations
- Release Plan
- Operations Strategy
- Monitoring System
- Continuous Optimization

## 🔧 Usage Guide
1. Adjust template structure according to project characteristics
2. Fill in specific project information and data
3. Regularly update and maintain document content
4. Share and collaborate with team members

## 📝 Filling Instructions
Please fill in the specific content of each section according to the actual project situation, ensuring accuracy and completeness of information.

---
*This template is generated by AI intelligence, please adjust according to actual needs*`;
  }
} 