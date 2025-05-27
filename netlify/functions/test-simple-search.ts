import { Handler } from '@netlify/functions';
import { logger } from './utils/logger';

// 简化的产品规格提取测试
async function testProductSpecsExtraction(productName: string): Promise<any> {
  const mockContent = `
${productName} is a leading artificial intelligence company that develops advanced AI systems. 
The company was founded in 2015 and is headquartered in San Francisco, California.

${productName} offers cutting-edge AI solutions including natural language processing, 
machine learning models, and automated reasoning systems. Their flagship product provides 
developers with powerful APIs to integrate AI capabilities into their applications.

The company focuses on creating safe and beneficial AI that can help solve complex problems 
across various industries including healthcare, finance, and education.

Official website: https://${productName.toLowerCase()}.com
Contact: info@${productName.toLowerCase()}.com
`;

  const prompt = `
从以下文本中提取产品规格和公司信息，按JSON格式返回：

产品名称：${productName}
网页内容：
${mockContent}

请提取以下信息并返回JSON格式：
{
  "product_name": "准确的产品名称",
  "company_name": "公司名称", 
  "product_description": "产品描述（100-200字）",
  "official_website": "官方网站URL（如果能确认）",
  "confidence_score": 置信度(0-1)
}

提取规则：
1. 如果信息不明确，用null表示
2. 产品描述要简洁准确，突出核心价值
3. 置信度基于信息的完整性和准确性
4. 官方网站必须是可验证的URL格式

只返回JSON，不要其他解释。
`;

  logger.info('🧪 开始DeepSeek产品规格提取测试', {
    productName,
    contentLength: mockContent.length,
    promptLength: prompt.length,
    timestamp: new Date().toISOString()
  });

  // 模拟DeepSeek响应
  const mockResponse = {
    product_name: productName,
    company_name: `${productName} Inc.`,
    product_description: `${productName} is a leading AI company that develops advanced artificial intelligence systems, offering cutting-edge solutions including natural language processing and machine learning models through powerful APIs.`,
    official_website: `https://${productName.toLowerCase()}.com`,
    confidence_score: 0.92
  };

  logger.info('✅ DeepSeek产品规格提取完成（模拟）', {
    productName,
    extractedSpecs: mockResponse,
    dataValidation: {
      hasRequiredFields: !!(mockResponse.product_name && mockResponse.company_name),
      isValidWebsite: /^https?:\/\/.+\..+/.test(mockResponse.official_website),
      completeness: 1.0,
      readyForDatabase: true
    },
    databaseMapping: {
      'product_name': '将保存到 user_projects.name',
      'company_name': '将保存到 user_projects.company_info',
      'product_description': '将保存到 user_projects.description',
      'official_website': '将保存到 user_projects.official_website',
      'confidence_score': '将保存到 metadata.ai_analysis_metadata.confidence_score'
    },
    timestamp: new Date().toISOString()
  });

  logger.info('📋 数据库保存预览', {
    productName,
    databaseRecord: {
      name: mockResponse.product_name,
      company_info: mockResponse.company_name,
      description: mockResponse.product_description,
      official_website: mockResponse.official_website,
      metadata: {
        ai_analysis_metadata: {
          confidence_score: mockResponse.confidence_score,
          extraction_source: 'test_mock_content',
          extraction_timestamp: new Date().toISOString(),
          processing_method: 'deepseek_extraction'
        }
      }
    },
    dataQuality: {
      hasName: !!mockResponse.product_name,
      hasCompanyInfo: !!mockResponse.company_name,
      hasDescription: !!mockResponse.product_description,
      hasWebsite: !!mockResponse.official_website,
      confidence: mockResponse.confidence_score,
      readyForSave: true
    }
  });

  return mockResponse;
}

const handler: Handler = async (event) => {
  try {
    const productName = event.queryStringParameters?.product || 'OpenAI';
    
    logger.info('🚀 开始简化智能搜索测试', {
      productName,
      testType: 'product_specs_extraction_only',
      timestamp: new Date().toISOString()
    });

    const result = await testProductSpecsExtraction(productName);

    logger.info('🎯 简化智能搜索测试完成', {
      productName,
      success: true,
      extractedFields: Object.keys(result),
      confidence: result.confidence_score,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        productName,
        result,
        message: '简化智能搜索测试完成，请查看日志了解详细的数据库保存流程',
        databasePreview: {
          table: 'user_projects',
          fields: {
            name: result.product_name,
            company_info: result.company_name,
            description: result.product_description,
            official_website: result.official_website
          },
          metadata: {
            confidence_score: result.confidence_score,
            extraction_method: 'deepseek_ai_analysis'
          }
        }
      }, null, 2)
    };

  } catch (error) {
    logger.error('❌ 简化智能搜索测试失败', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : String(error),
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: '简化智能搜索测试失败'
      })
    };
  }
};

export { handler }; 