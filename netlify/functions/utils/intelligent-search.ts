import { generateStream } from '../services/aiService';
import { logger } from './logger';

interface SearchQuery {
  official_site_query: string;
  specs_query: string;
  company_info_query: string;
}

interface RankedResult {
  link: string;
  title: string;
  snippet: string;
  score: number;
  reason: string;
  confidence: number;
}

interface ProductSpecs {
  product_name: string | null;
  company_name: string | null;
  product_description: string | null;
  official_website: string | null;
  confidence_score: number;
}

// 步骤 1：直接构建搜索查询（不使用DeepSeek优化）
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

// 步骤 2：使用基于规则的简单排序（替代DeepSeek可信度分析）
function simpleRankSearchResults(productName: string, searchResults: any[]): RankedResult[] {
  if (!searchResults || searchResults.length === 0) {
    logger.warn('⚠️ 搜索结果为空，无法进行排序', {
      productName,
      searchResultsLength: searchResults?.length || 0
    });
    return [];
  }

  logger.info('📊 开始基于规则的搜索结果排序', {
    productName,
    searchResultCount: searchResults.length,
    method: 'rule_based_ranking',
    timestamp: new Date().toISOString()
  });

  const rankedResults = searchResults.map((result, index) => {
    let score = 5; // 基础分数
    let reasons: string[] = [];

    const title = result.title?.toLowerCase() || '';
    const link = result.link?.toLowerCase() || '';
    const snippet = result.snippet?.toLowerCase() || '';
    const productLower = productName.toLowerCase();

    // 规则1：域名匹配（+3分）
    if (link.includes(productLower.replace(/\s+/g, '')) || 
        link.includes(productLower.replace(/\s+/g, '-'))) {
      score += 3;
      reasons.push('域名匹配产品名称');
    }

    // 规则2：标题包含官方关键词（+2分）
    if (title.includes('official') || title.includes('homepage') || 
        title.includes('about') || title.includes('company')) {
      score += 2;
      reasons.push('标题包含官方关键词');
    }

    // 规则3：是否为主域名（+2分）
    const urlParts = link.split('/');
    if (urlParts.length <= 4) { // 主域名或一级路径
      score += 2;
      reasons.push('主域名或一级路径');
    }

    // 规则4：排除不相关网站（-2分）
    if (link.includes('amazon') || link.includes('wikipedia') || 
        link.includes('linkedin') || link.includes('crunchbase')) {
      score -= 2;
      reasons.push('排除电商/百科网站');
    }

    // 规则5：AI相关内容（+1分）
    if (title.includes('ai') || snippet.includes('artificial intelligence') ||
        snippet.includes('machine learning') || snippet.includes('ai platform')) {
      score += 1;
      reasons.push('包含AI相关内容');
    }

    // 规则6：产品名称在标题中的位置（+1分）
    if (title.includes(productLower)) {
      score += 1;
      reasons.push('标题包含产品名称');
    }

    // 确保分数在1-10范围内
    score = Math.max(1, Math.min(10, score));

    return {
      link: result.link,
      title: result.title,
      snippet: result.snippet,
      score,
      reason: reasons.join('; ') || '基础评分',
      confidence: score / 10
    };
  });

  // 按评分排序
  const sortedResults = rankedResults.sort((a, b) => b.score - a.score);

  logger.info('✅ 基于规则的搜索结果排序完成', {
    productName,
    processingMethod: 'rule_based_ranking',
    analysisResults: {
      totalAnalyzed: rankedResults.length,
      highScoreResults: sortedResults.filter(r => r.score >= 8).length,
      mediumScoreResults: sortedResults.filter(r => r.score >= 5 && r.score < 8).length,
      lowScoreResults: sortedResults.filter(r => r.score < 5).length,
      averageScore: sortedResults.reduce((sum, r) => sum + r.score, 0) / sortedResults.length,
      topResult: sortedResults[0] ? {
        title: sortedResults[0].title,
        score: sortedResults[0].score,
        reason: sortedResults[0].reason,
        confidence: sortedResults[0].confidence
      } : null
    },
    timestamp: new Date().toISOString()
  });

  logger.debug('📊 详细评分结果', {
    productName,
    detailedScores: sortedResults.slice(0, 5).map((result, index) => ({
      rank: index + 1,
      title: result.title,
      link: result.link,
      score: result.score,
      reason: result.reason,
      confidence: result.confidence
    }))
  });

  return sortedResults;
}

// 步骤 3：使用 DeepSeek 提取网页内容规格
async function extractProductSpecs(productName: string, content: string, sourceUrl: string): Promise<ProductSpecs> {
  // 限制内容长度避免过长
  const truncatedContent = content.length > 3000 ? content.slice(0, 3000) + '...' : content;
  
  const prompt = `
从以下文本中提取产品规格和公司信息，按JSON格式返回：

产品名称：${productName}
来源URL：${sourceUrl}
网页内容：
${truncatedContent}

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

  const extractionStartTime = Date.now();

  try {
    logger.info('📊 DeepSeek产品规格提取开始', {
      productName,
      sourceUrl,
      contentMetrics: {
        originalLength: content.length,
        truncatedLength: truncatedContent.length,
        wasTruncated: content.length > 3000
      },
      promptLength: prompt.length,
      extractionFields: ['product_name', 'company_name', 'product_description', 'official_website', 'confidence_score'],
      timestamp: new Date().toISOString()
    });

    logger.debug('📄 待分析内容预览', {
      productName,
      sourceUrl,
      contentPreview: truncatedContent.substring(0, 200) + '...',
      contentSample: {
        hasProductName: truncatedContent.toLowerCase().includes(productName.toLowerCase()),
        hasCompanyKeywords: /company|about|corporation|inc|ltd/i.test(truncatedContent),
        hasWebsiteKeywords: /website|homepage|official|www\./i.test(truncatedContent)
      }
    });

    const response = await generateStream('deepseek', {
      id: 'deepseek',
      name: 'DeepSeek',
      version: 'deepseek-chat',
      apiKey: process.env.VITE_DEFAULT_API_KEY,
      useSystemCredit: true
    }, prompt);

    const reader = response.getReader();
    const decoder = new TextDecoder();
    let result = '';
    let chunkCount = 0;
    
    logger.debug('📡 开始接收DeepSeek规格提取响应', {
      productName,
      sourceUrl,
      timestamp: new Date().toISOString()
    });
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      chunkCount++;
      
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.choices?.[0]?.delta?.content) {
              result += data.choices[0].delta.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const specs = JSON.parse(cleanedResult);
    const processingTime = Date.now() - extractionStartTime;
    
    // 验证提取的数据
    const isValidWebsite = specs.official_website ? /^https?:\/\/.+\..+/.test(specs.official_website) : true;
    const hasRequiredFields = !!(specs.product_name && specs.company_name);
    
    logger.info('✅ DeepSeek产品规格提取完成', {
      productName,
      sourceUrl,
      processingMetrics: {
        processingTime,
        chunkCount,
        resultLength: result.length,
        cleanedResultLength: cleanedResult.length
      },
      extractedSpecs: {
        product_name: specs.product_name,
        company_name: specs.company_name,
        has_description: !!specs.product_description,
        description_length: specs.product_description?.length || 0,
        official_website: specs.official_website,
        confidence_score: specs.confidence_score
      },
      dataValidation: {
        hasRequiredFields,
        isValidWebsite,
        completeness: calculateCompleteness(specs),
        readyForDatabase: hasRequiredFields && isValidWebsite
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

    logger.debug('📋 详细提取结果（数据库保存预览）', {
      productName,
      sourceUrl,
      databaseRecord: {
        name: specs.product_name,
        company_info: specs.company_name,
        description: specs.product_description,
        official_website: specs.official_website,
        metadata: {
          ai_analysis_metadata: {
            confidence_score: specs.confidence_score,
            extraction_source: sourceUrl,
            extraction_timestamp: new Date().toISOString()
          }
        }
      }
    });

    return specs;
  } catch (error) {
    const processingTime = Date.now() - extractionStartTime;
    logger.error('❌ DeepSeek产品规格提取失败', {
      productName,
      sourceUrl,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name
      } : String(error),
      processingTime
    });
    
    const fallbackSpecs = {
      product_name: productName,
      company_name: null,
      product_description: null,
      official_website: null,
      confidence_score: 0
    };
    
    logger.warn('🔄 使用默认规格数据（数据库保存预览）', {
      productName,
      sourceUrl,
      fallbackSpecs,
      databaseRecord: {
        name: fallbackSpecs.product_name,
        company_info: fallbackSpecs.company_name,
        description: fallbackSpecs.product_description,
        official_website: fallbackSpecs.official_website,
        metadata: {
          ai_analysis_metadata: {
            confidence_score: fallbackSpecs.confidence_score,
            extraction_source: sourceUrl,
            extraction_timestamp: new Date().toISOString(),
            fallback_reason: 'DeepSeek规格提取失败'
          }
        }
      },
      reason: 'DeepSeek规格提取失败，使用默认数据'
    });
    
    return fallbackSpecs;
  }
}

// 辅助函数：计算信息完整性
function calculateCompleteness(specs: any): number {
  const fields = [
    'product_name', 'company_name', 'product_description', 'official_website'
  ];
  
  let filledFields = 0;
  fields.forEach(field => {
    if (specs[field] && specs[field] !== null) {
      if (typeof specs[field] === 'string') {
        if (specs[field].trim().length > 0) filledFields++;
      } else {
        filledFields++;
      }
    }
  });
  
  return filledFields / fields.length;
}

// 主要的智能搜索函数
export async function intelligentSearch(productName: string): Promise<ProductSpecs> {
  const SERPER_API_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_API_KEY) {
    throw new Error('Serper API密钥未设置');
  }

  const searchStartTime = Date.now();
  
  try {
    logger.info('🔍 开始智能搜索流程', {
      productName,
      searchStartTime: new Date().toISOString(),
      step: '1/3 - 初始化'
    });

    // 步骤 1：构建搜索查询
    logger.info('📝 步骤1：构建搜索查询', {
      productName,
      step: '1/3 - 查询构建',
      timestamp: new Date().toISOString()
    });
    
    const queryStartTime = Date.now();
    const queries = buildSearchQuery(productName);
    const queryDuration = Date.now() - queryStartTime;
    
    logger.info('✅ 搜索查询构建完成', {
      productName,
      queries: {
        official_site_query: queries.official_site_query,
        specs_query: queries.specs_query,
        company_info_query: queries.company_info_query
      },
      processingTime: queryDuration,
      step: '1/3 - 查询构建完成'
    });
    
    // 步骤 2：执行搜索（使用官方网站查询）
    logger.info('🌐 步骤2：执行Serper API搜索', {
      productName,
      searchQuery: queries.official_site_query,
      step: '2/3 - 执行搜索',
      timestamp: new Date().toISOString()
    });
    
    const searchApiStartTime = Date.now();
    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: queries.official_site_query,
        num: 8,
        gl: 'us',
        hl: 'en',
        type: 'search'
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`搜索请求失败: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.organic || [];
    const searchApiDuration = Date.now() - searchApiStartTime;

    logger.info('✅ Serper API搜索完成', {
      productName,
      resultCount: searchResults.length,
      searchApiDuration,
      step: '2/3 - 搜索完成',
      firstThreeResults: searchResults.slice(0, 3).map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet?.substring(0, 100) + '...'
      }))
    });

    if (searchResults.length === 0) {
      logger.warn('⚠️ 未找到搜索结果', { 
        productName,
        searchQuery: queries.official_site_query,
        step: '2/3 - 搜索失败'
      });
      return {
        product_name: productName,
        company_name: null,
        product_description: null,
        official_website: null,
        confidence_score: 0
      };
    }

    // 步骤 3：分析结果可信度
    logger.info('🤖 步骤3：使用基于规则的简单排序分析搜索结果可信度', {
      productName,
      resultCount: searchResults.length,
      step: '3/3 - 可信度分析',
      timestamp: new Date().toISOString()
    });
    
    const rankingStartTime = Date.now();
    const rankedResults = simpleRankSearchResults(productName, searchResults);
    const rankingDuration = Date.now() - rankingStartTime;
    
    logger.info('✅ 基于规则的搜索结果排序完成', {
      productName,
      rankedResultCount: rankedResults.length,
      rankingDuration,
      step: '3/3 - 可信度分析完成',
      topThreeResults: rankedResults.slice(0, 3).map(r => ({
        title: r.title,
        link: r.link,
        score: r.score,
        reason: r.reason,
        confidence: r.confidence
      }))
    });
    
    // 选择最佳候选链接
    const topResult = rankedResults[0];
    if (!topResult || topResult.score < 5) {
      logger.warn('⚠️ 未找到可信的搜索结果', { 
        productName, 
        topScore: topResult?.score,
        minRequiredScore: 5,
        step: '3/3 - 可信度不足'
      });
      return {
        product_name: productName,
        company_name: null,
        product_description: null,
        official_website: null,
        confidence_score: 0
      };
    }

    logger.info('🎯 选择最佳搜索结果', {
      productName,
      selectedResult: {
        title: topResult.title,
        link: topResult.link,
        score: topResult.score,
        reason: topResult.reason,
        confidence: topResult.confidence
      },
      step: '3/3 - 最佳结果选择'
    });

    // 步骤 3：提取产品规格（使用摘要内容）
    logger.info('📊 步骤3：使用DeepSeek提取产品规格', {
      productName,
      sourceUrl: topResult.link,
      contentLength: (topResult.snippet + '\n\n' + topResult.title).length,
      step: '3/3 - 规格提取',
      timestamp: new Date().toISOString()
    });
    
    const extractionStartTime = Date.now();
    const specs = await extractProductSpecs(
      productName, 
      topResult.snippet + '\n\n' + topResult.title,
      topResult.link
    );
    const extractionDuration = Date.now() - extractionStartTime;

    // 设置官方网站
    if (!specs.official_website && topResult.score >= 8) {
      specs.official_website = topResult.link;
      logger.info('🔗 设置官方网站', {
        productName,
        officialWebsite: topResult.link,
        reason: `高可信度评分: ${topResult.score}/10`
      });
    }

    const totalDuration = Date.now() - searchStartTime;

    logger.info('🎉 智能搜索流程完成', {
      productName,
      finalResults: {
        product_name: specs.product_name,
        company_name: specs.company_name,
        has_description: !!specs.product_description,
        description_length: specs.product_description?.length || 0,
        official_website: specs.official_website,
        confidence_score: specs.confidence_score
      },
      performanceMetrics: {
        total_duration: totalDuration,
        query_build_duration: queryDuration,
        search_api_duration: searchApiDuration,
        ranking_duration: rankingDuration,
        extraction_duration: extractionDuration
      },
      optimization: 'direct_ai_keyword_search',
      step: '3/3 - 完成',
      timestamp: new Date().toISOString()
    });

    return specs;

  } catch (error) {
    const totalDuration = Date.now() - searchStartTime;
    logger.error('❌ 智能搜索失败', {
      productName,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : String(error),
      totalDuration,
      step: 'ERROR - 搜索失败'
    });
    
    return {
      product_name: productName,
      company_name: null,
      product_description: null,
      official_website: null,
      confidence_score: 0
    };
  }
} 