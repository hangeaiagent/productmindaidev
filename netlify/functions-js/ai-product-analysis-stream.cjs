const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // 处理CORS预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 解析请求体
    const body = JSON.parse(event.body || '{}');
    const { requirement, language = 'zh' } = body;
    
    if (!requirement || !requirement.trim()) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Requirement is required' })
      };
    }

    // 构建系统提示词
    const systemPrompt = language === 'zh' 
      ? `你是一个资深的产品经理和技术专家，专门负责AI产品分析。请基于用户的需求描述，生成完整的产品分析报告。

请按照以下结构生成JSON格式的分析结果：
1. 最小可行产品(MVP)分析
2. 商业模式分析  
3. 技术架构分析
4. 开发模块分析

要求：
- 分析要专业、实用、详细
- 考虑技术可行性和商业价值
- 提供具体的实施建议
- 使用中文回答`
      : `You are a senior product manager and technical expert specializing in AI product analysis. Based on the user's requirement description, generate a complete product analysis report.

Please generate analysis results in JSON format with the following structure:
1. Minimum Viable Product (MVP) analysis
2. Business model analysis
3. Technical architecture analysis
4. Development modules analysis

Requirements:
- Analysis should be professional, practical, and detailed
- Consider technical feasibility and business value
- Provide specific implementation recommendations
- Answer in English`;

    // 调用DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: requirement }
        ],
        max_tokens: 8000,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      })
    });

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekResult = await deepseekResponse.json();
    const content = deepseekResult.choices[0]?.message?.content || '';
    
    // 尝试解析JSON或生成结构化数据
    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (e) {
      // 如果不是JSON，创建基本结构
      analysisResult = {
        minimumViableProduct: {
          core_features: [content.substring(0, 500)],
          development_phases: ['Phase 1: Core Development', 'Phase 2: Testing', 'Phase 3: Launch'],
          timeline: '3-6 months',
          resources: 'Small development team'
        },
        businessModel: {
          target_market: 'AI product users',
          revenue_streams: ['Subscription', 'Usage-based pricing'],
          cost_structure: 'Development and maintenance costs',
          competitive_advantages: ['AI-powered features', 'User-friendly interface']
        },
        technicalArchitecture: {
          frontend: 'React/Vue.js',
          backend: 'Node.js/Python',
          database: 'PostgreSQL/MongoDB',
          deployment: 'Cloud platform (AWS/GCP)',
          key_technologies: ['AI/ML APIs', 'RESTful APIs', 'Database integration']
        },
        developmentModules: {
          user_interface: 'Modern web interface',
          core_logic: 'AI processing engine',
          data_management: 'Database and storage',
          integration: 'API integrations',
          testing: 'Quality assurance'
        }
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(analysisResult)
    };
  } catch (error) {
    console.error('AI Product Analysis Stream Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Analysis failed', 
        details: error.message 
      })
    };
  }
};