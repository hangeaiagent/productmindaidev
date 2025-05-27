import { Handler } from '@netlify/functions';
import { logger } from './utils/logger';

export const handler: Handler = async (event) => {
  try {
    logger.info('🧪 开始YC网站结构测试', {
      timestamp: new Date().toISOString()
    });

    // 获取YC项目列表页面
    const ycListUrl = 'https://www.ycombinator.com/companies/?batch=Winter%202025&batch=Spring%202025&batch=Summer%202024&batch=Winter%202024';
    
    const listResponse = await fetch(ycListUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch YC list page: ${listResponse.status}`);
    }

    const listHtml = await listResponse.text();
    
    logger.info('📄 YC页面基本信息', {
      htmlLength: listHtml.length,
      hasCompanies: listHtml.includes('companies'),
      hasYCombinator: listHtml.includes('Y Combinator'),
      hasBatch: listHtml.includes('batch')
    });

    // 测试不同的正则表达式模式
    const patterns = [
      { name: 'companies路径', regex: /href="(\/companies\/[^"]+)"/g },
      { name: 'company路径', regex: /href="(\/company\/[^"]+)"/g },
      { name: '任何公司链接', regex: /href="([^"]*compan[^"]+)"/g },
      { name: 'YC域名链接', regex: /href="(https:\/\/www\.ycombinator\.com\/companies\/[^"]+)"/g }
    ];

    const results: any = {};

    patterns.forEach(pattern => {
      const matches: string[] = [];
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      while ((match = regex.exec(listHtml)) !== null && matches.length < 10) {
        matches.push(match[1]);
      }
      
      results[pattern.name] = {
        count: matches.length,
        samples: matches.slice(0, 5)
      };
    });

    // 查找页面中的关键词
    const keywords = ['company', 'startup', 'batch', 'Winter 2025', 'Summer 2024'];
    const keywordResults: any = {};
    
    keywords.forEach(keyword => {
      const count = (listHtml.match(new RegExp(keyword, 'gi')) || []).length;
      keywordResults[keyword] = count;
    });

    // 提取页面标题和描述
    const titleMatch = listHtml.match(/<title>([^<]+)<\/title>/i);
    const descMatch = listHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);

    logger.info('🔍 YC页面分析结果', {
      pageTitle: titleMatch ? titleMatch[1] : 'Not found',
      pageDescription: descMatch ? descMatch[1] : 'Not found',
      keywordCounts: keywordResults,
      patternResults: results
    });

    // 尝试查找JavaScript渲染的内容
    const scriptTags = listHtml.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    const hasReactOrNext = scriptTags.some(script => 
      script.includes('React') || 
      script.includes('Next') || 
      script.includes('__NEXT_DATA__')
    );

    logger.info('🔧 页面技术分析', {
      scriptTagCount: scriptTags.length,
      hasReactOrNext,
      isJavaScriptRendered: hasReactOrNext,
      htmlPreview: listHtml.substring(0, 1000)
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        analysis: {
          pageInfo: {
            title: titleMatch ? titleMatch[1] : 'Not found',
            description: descMatch ? descMatch[1] : 'Not found',
            htmlLength: listHtml.length
          },
          keywordCounts: keywordResults,
          patternResults: results,
          technicalInfo: {
            scriptTagCount: scriptTags.length,
            hasReactOrNext,
            isJavaScriptRendered: hasReactOrNext
          },
          htmlPreview: listHtml.substring(0, 2000)
        }
      })
    };

  } catch (error) {
    logger.error('❌ YC网站测试失败', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 