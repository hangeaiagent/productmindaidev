import { Handler } from '@netlify/functions';
import { logger } from './utils/logger';

export const handler: Handler = async (event) => {
  try {
    logger.info('🧪 开始AIbase网站结构测试', {
      timestamp: new Date().toISOString()
    });

    // 获取AIbase主页
    const aibaseUrl = 'https://top.aibase.com/';
    
    const response = await fetch(aibaseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AIbase page: ${response.status}`);
    }

    const html = await response.text();
    
    logger.info('📄 AIbase页面基本信息', {
      htmlLength: html.length,
      hasAI: html.includes('AI'),
      hasProduct: html.includes('产品') || html.includes('product'),
      hasTool: html.includes('工具') || html.includes('tool')
    });

    // 分析页面结构
    const analysis = {
      pageTitle: html.match(/<title>([^<]+)<\/title>/i)?.[1] || 'Not found',
      pageDescription: html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || 'Not found',
      keywordCounts: {
        'AI': (html.match(/AI/gi) || []).length,
        '产品': (html.match(/产品/g) || []).length,
        'product': (html.match(/product/gi) || []).length,
        '工具': (html.match(/工具/g) || []).length,
        'tool': (html.match(/tool/gi) || []).length
      },
      patternResults: {} as Record<string, { count: number; samples: string[] }>
    };

    // 测试不同的产品链接模式
    const patterns = {
      'tool路径': /href="([^"]*\/tool\/[^"]+)"/g,
      'product路径': /href="([^"]*\/product\/[^"]+)"/g,
      '相对tool路径': /href="(\/[^"]*tool[^"]*\/[^"]+)"/g,
      '相对product路径': /href="(\/[^"]*product[^"]*\/[^"]+)"/g,
      '任何产品链接': /href="([^"]*(?:tool|product)[^"]*\/[^"]+)"/g,
      'AIbase域名链接': /href="(https?:\/\/[^"]*aibase[^"]*\/[^"]+)"/g
    };

    for (const [name, pattern] of Object.entries(patterns) as [string, RegExp][]) {
      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(html)) !== null && matches.length < 5) {
        matches.push(match[1]);
      }
      analysis.patternResults[name] = {
        count: matches.length,
        samples: matches
      };
    }

    logger.info('🔍 AIbase页面分析结果', analysis);

    // 技术分析
    const techAnalysis = {
      scriptTagCount: (html.match(/<script/gi) || []).length,
      hasReactOrNext: html.includes('React') || html.includes('Next') || html.includes('_next'),
      isJavaScriptRendered: html.includes('window.__INITIAL_STATE__') || html.includes('__NUXT__'),
      htmlPreview: html.substring(0, 500) + '...'
    };

    logger.info('🔧 页面技术分析', techAnalysis);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        url: aibaseUrl,
        analysis,
        techAnalysis,
        htmlLength: html.length
      }, null, 2)
    };

  } catch (error) {
    logger.error('❌ AIbase网站测试失败', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 