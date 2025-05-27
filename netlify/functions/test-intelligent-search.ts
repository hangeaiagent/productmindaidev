import { Handler } from '@netlify/functions';
import { intelligentSearch } from './utils/intelligent-search';
import { logger } from './utils/logger';

export const handler: Handler = async (event) => {
  const productName = event.queryStringParameters?.product || 'OpenAI';
  
  try {
    logger.info('🚀 开始优化后的智能搜索测试', {
      productName,
      optimization: 'direct_ai_keyword_search',
      steps: '3步流程：查询构建 → 搜索执行 → 可信度分析+规格提取',
      testStartTime: new Date().toISOString()
    });

    const testStartTime = Date.now();
    const result = await intelligentSearch(productName);
    const testDuration = Date.now() - testStartTime;

    logger.info('🎯 优化后智能搜索测试完成', {
      productName,
      testEndTime: new Date().toISOString(),
      success: true,
      testDuration,
      resultSummary: {
        hasProductName: !!result.product_name,
        hasCompanyName: !!result.company_name,
        hasDescription: !!result.product_description,
        hasWebsite: !!result.official_website,
        confidenceScore: result.confidence_score
      },
      optimization: 'direct_ai_keyword_search_completed'
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
        testDuration,
        optimization: 'direct_ai_keyword_search'
      })
    };

  } catch (error) {
    logger.error('❌ 优化后智能搜索测试失败', {
      productName,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name
      } : String(error)
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
        productName
      })
    };
  }
}; 