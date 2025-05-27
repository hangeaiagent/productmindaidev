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

async function analyzeAIBaseStructure() {
  try {
    logger.info('🧪 开始详细分析AIbase工具链接结构');

    const response = await fetch('https://top.aibase.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      logger.error('❌ 无法获取AIbase主页', { status: response.status });
      return;
    }

    const html = await response.text();
    
    logger.info('📄 AIbase页面基本信息', {
      htmlLength: html.length,
      hasToolKeyword: html.includes('/tool/'),
      toolOccurrences: (html.match(/\/tool\//g) || []).length
    });

    // 多种工具链接提取模式
    const toolPatterns = [
      // 基本的 /tool/ 路径
      /\/tool\/([^"'\s<>]+)/g,
      // href属性中的工具链接
      /href="([^"]*\/tool\/[^"]*)"[^>]*>/g,
      // 更宽松的工具路径匹配
      /["']([^"']*\/tool\/[^"']*?)["']/g,
      // JavaScript中的工具路径
      /['"]\/tool\/([^'"]+)['"]/g
    ];

    const allToolLinks = new Set<string>();
    const patternResults: Record<string, string[]> = {};

    toolPatterns.forEach((pattern, index) => {
      const patternName = `pattern_${index + 1}`;
      const matches: string[] = [];
      let match;
      
      while ((match = pattern.exec(html)) !== null) {
        const toolPath = match[1] || match[0];
        if (toolPath && toolPath.includes('/tool/')) {
          matches.push(toolPath);
          allToolLinks.add(toolPath);
        }
      }
      
      patternResults[patternName] = matches.slice(0, 10); // 只保留前10个样本
      logger.info(`🔍 模式 ${patternName} 结果`, {
        totalMatches: matches.length,
        samples: matches.slice(0, 5)
      });
    });

    // 分析HTML片段，寻找工具链接的上下文
    const toolContextPattern = /.{0,100}\/tool\/[^"'\s<>]+.{0,100}/g;
    const contexts: string[] = [];
    let contextMatch;
    
    while ((contextMatch = toolContextPattern.exec(html)) !== null && contexts.length < 10) {
      contexts.push(contextMatch[0]);
    }

    logger.info('📋 工具链接上下文分析', {
      totalContexts: contexts.length,
      samples: contexts.slice(0, 5)
    });

    // 提取具体的工具slug
    const uniqueToolSlugs = new Set<string>();
    allToolLinks.forEach(link => {
      const match = link.match(/\/tool\/([^"'\s<>\/]+)/);
      if (match && match[1]) {
        uniqueToolSlugs.add(match[1]);
      }
    });

    const toolSlugs = Array.from(uniqueToolSlugs);

    logger.info('🎯 提取的工具slugs', {
      totalSlugs: toolSlugs.length,
      samples: toolSlugs.slice(0, 20)
    });

    // 分析页面中可能的产品名称
    const productNamePatterns = [
      // 可能的产品名称模式
      /"title"\s*:\s*"([^"]+)"/g,
      /"name"\s*:\s*"([^"]+)"/g,
      /data-name="([^"]+)"/g,
      /alt="([^"]+)"/g
    ];

    const foundProductNames = new Set<string>();
    productNamePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null && foundProductNames.size < 50) {
        if (match[1] && match[1].length > 2 && match[1].length < 100) {
          foundProductNames.add(match[1]);
        }
      }
    });

    logger.info('📝 可能的产品名称', {
      totalNames: foundProductNames.size,
      samples: Array.from(foundProductNames).slice(0, 15)
    });

    return {
      success: true,
      analysis: {
        pageInfo: {
          htmlLength: html.length,
          toolOccurrences: (html.match(/\/tool\//g) || []).length
        },
        toolLinks: {
          totalUniqueLinks: allToolLinks.size,
          totalUniqueSlugs: toolSlugs.length,
          patternResults: Object.entries(patternResults).map(([pattern, matches]) => ({
            pattern,
            matchCount: matches.length,
            samples: matches.slice(0, 5)
          })),
          slugSamples: toolSlugs.slice(0, 30)
        },
        contexts: {
          total: contexts.length,
          samples: contexts.slice(0, 3)
        },
        productNames: {
          total: foundProductNames.size,
          samples: Array.from(foundProductNames).slice(0, 20)
        }
      }
    };

  } catch (error) {
    logger.error('❌ 分析失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export const handler: Handler = async (event) => {
  try {
    const result = await analyzeAIBaseStructure();
    
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