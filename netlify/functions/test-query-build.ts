import { Handler } from '@netlify/functions';
import { logger } from './utils/logger';

interface SearchQuery {
  official_site_query: string;
  specs_query: string;
  company_info_query: string;
}

// 直接构建搜索查询（不使用DeepSeek优化）
function buildSearchQuery(productName: string): SearchQuery {
  logger.info('📝 构建搜索查询', {
    productName,
    method: 'direct_keyword_combination',
    timestamp: new Date().toISOString()
  });

  // 直接构建多个搜索查询
  const queries = {
    official_site_query: `"${productName}" AI official website -amazon -wikipedia -linkedin`,
    specs_query: `"${productName}" AI platform features specifications product`,
    company_info_query: `"${productName}" AI company about mission technology`
  };

  logger.info('✅ 搜索查询构建完成', {
    productName,
    queries: {
      official_site_query: queries.official_site_query,
      specs_query: queries.specs_query,
      company_info_query: queries.company_info_query
    },
    optimization: 'direct_ai_keyword_combination',
    timestamp: new Date().toISOString()
  });

  return queries;
}

export const handler: Handler = async (event) => {
  const productName = event.queryStringParameters?.product || 'OpenAI';
  
  try {
    logger.info('🚀 开始查询构建测试', {
      productName,
      testType: 'query_build_only',
      optimization: 'direct_ai_keyword_search'
    });

    const testStartTime = Date.now();
    const queries = buildSearchQuery(productName);
    const testDuration = Date.now() - testStartTime;

    logger.info('🎯 查询构建测试完成', {
      productName,
      success: true,
      testDuration,
      queries,
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
        queries,
        testDuration,
        optimization: 'direct_ai_keyword_search',
        comparison: {
          before: '使用DeepSeek优化查询（耗时较长）',
          after: '直接构建AI关键字查询（快速高效）'
        }
      })
    };

  } catch (error) {
    logger.error('❌ 查询构建测试失败', {
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