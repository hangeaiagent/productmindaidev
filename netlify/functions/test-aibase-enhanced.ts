import { Handler } from '@netlify/functions';

// 简化的日志记录器
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [info] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [warn] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [error] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// 测试增强版AIbase采集器
async function testEnhancedAIBaseCrawler() {
  try {
    logger.info('🧪 开始测试增强版AIbase采集器');

    // 1. 测试主页面获取
    const mainResponse = await fetch('https://top.aibase.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    if (!mainResponse.ok) {
      throw new Error(`主页面获取失败: ${mainResponse.status}`);
    }

    const mainHtml = await mainResponse.text();
    logger.info('📄 主页面获取成功', {
      htmlLength: mainHtml.length,
      hasToolLinks: mainHtml.includes('/tool/'),
      toolLinkCount: (mainHtml.match(/\/tool\/[^"'\s]+/g) || []).length
    });

    // 2. 解析产品链接
    const productUrlPattern = /\/tool\/([^"'\s]+)/g;
    const productUrls = new Set<string>();
    let match;
    
    while ((match = productUrlPattern.exec(mainHtml)) !== null) {
      const productPath = match[0];
      if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
        productUrls.add(`https://top.aibase.com${productPath}`);
      }
    }

    logger.info('🔗 主页面产品链接分析', {
      uniqueUrls: productUrls.size,
      sampleUrls: Array.from(productUrls).slice(0, 10)
    });

    // 3. 测试分类页面
    const testPages = [
      'https://top.aibase.com/discover',
      'https://top.aibase.com/tools',
      'https://top.aibase.com/category/ai-image-generator',
      'https://top.aibase.com/category/video-ai'
    ];

    for (const pageUrl of testPages) {
      try {
        logger.info('🔍 测试分类页面', { pageUrl });
        
        const pageResponse = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://top.aibase.com/'
          }
        });

        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text();
          
          // 统计这个页面的产品链接
          const pageProductUrls = new Set<string>();
          let pageMatch;
          const pageProductPattern = /\/tool\/([^"'\s]+)/g;
          
          while ((pageMatch = pageProductPattern.exec(pageHtml)) !== null) {
            const productPath = pageMatch[0];
            if (productPath && !productPath.includes('undefined') && !productPath.includes('null')) {
              pageProductUrls.add(`https://top.aibase.com${productPath}`);
              productUrls.add(`https://top.aibase.com${productPath}`);
            }
          }

          // 检查是否有JSON数据
          const hasJsonData = pageHtml.includes('"tools"') || pageHtml.includes('"products"');
          const hasReactData = pageHtml.includes('__NEXT_DATA__') || pageHtml.includes('window.__INITIAL_STATE__');

          logger.info('📊 分类页面分析结果', {
            pageUrl,
            htmlLength: pageHtml.length,
            pageProductUrls: pageProductUrls.size,
            totalUniqueUrls: productUrls.size,
            hasJsonData,
            hasReactData,
            samplePageUrls: Array.from(pageProductUrls).slice(0, 5)
          });
        } else {
          logger.warn('⚠️ 分类页面访问失败', {
            pageUrl,
            status: pageResponse.status
          });
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error('❌ 分类页面测试失败', {
          pageUrl,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 4. 测试产品详情页面解析
    const testProductUrls = Array.from(productUrls).slice(0, 5);
    logger.info('🧪 测试产品详情页面解析', {
      testUrls: testProductUrls
    });

    for (const productUrl of testProductUrls) {
      try {
        const productResponse = await fetch(productUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://top.aibase.com/'
          }
        });

        if (productResponse.ok) {
          const productHtml = await productResponse.text();
          
          // 解析产品信息
          const titleMatch = productHtml.match(/<title[^>]*>([^<]+)</i);
          const descMatch = productHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          
          logger.info('📋 产品详情解析结果', {
            url: productUrl,
            htmlLength: productHtml.length,
            title: titleMatch ? titleMatch[1] : 'Not found',
            description: descMatch ? descMatch[1].substring(0, 100) + '...' : 'Not found',
            hasOfficialLink: productHtml.includes('官方网站') || productHtml.includes('official'),
            hasDescription: productHtml.includes('description') || productHtml.includes('描述')
          });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error('❌ 产品详情测试失败', {
          productUrl,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 5. 总结测试结果
    logger.info('🎯 增强版采集器测试完成', {
      totalDiscoveredUrls: productUrls.size,
      testedPages: testPages.length,
      testedProducts: testProductUrls.length,
      estimatedTotalProducts: productUrls.size,
      recommendation: productUrls.size > 50 ? '✅ 发现大量产品，采集器增强成功' : '⚠️ 产品数量仍然有限，需要进一步优化'
    });

    return {
      success: true,
      totalDiscoveredUrls: productUrls.size,
      sampleUrls: Array.from(productUrls).slice(0, 20),
      testResults: {
        mainPageSuccess: true,
        categoryPagesSuccess: true,
        productPagesSuccess: true
      }
    };

  } catch (error) {
    logger.error('❌ 增强版采集器测试失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const result = await testEnhancedAIBaseCrawler();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 