import { generateStream } from '../services/aiService';
import { logger } from './logger';
import { intelligentSearch } from './intelligent-search';

interface AIAnalysisResult {
  projectName: string | null;
  projectDescription: string;
  officialWebsite: string | null;
  productDescription: string | null;
  companyName: string | null;
  confidence_score: number;
  analysis_metadata: {
    processing_time: number;
    name_source: string;
    description_quality_score: number;
    processing_steps: string[];
  };
}

// 添加新的接口定义
interface ProductWebsiteInfo {
  officialWebsite: string | null;
  productDescription: string | null;
}

function cleanMarkdownJSON(text: string): string {
  // 移除 Markdown 代码块标记
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // 清理多余的空白字符
  text = text.trim();
  
  // 如果文本不是以 { 开始，尝试找到第一个有效的 JSON 开始位置
  const jsonStart = text.indexOf('{');
  if (jsonStart > 0) {
    text = text.substring(jsonStart);
  }
  
  return text;
}

// 修改：使用 Serper API 搜索产品官网和详细信息
async function searchProductWebsite(projectName: string): Promise<{
  officialWebsite: string | null;
  productDescription: string | null;
}> {
  if (!projectName) {
    logger.info('产品名称为空，跳过搜索', {
      timestamp: new Date().toISOString()
    });
    return { officialWebsite: null, productDescription: null };
  }

  const SERPER_API_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_API_KEY) {
    logger.error('未找到 Serper API 密钥，无法进行搜索', {
      timestamp: new Date().toISOString()
    });
    return { officialWebsite: null, productDescription: null };
  }

  try {
    // 构建搜索查询
    const searchQuery = `${projectName} official website company`;
    
    logger.info('开始第一步：搜索产品官网', {
      projectName,
      searchQuery,
      timestamp: new Date().toISOString()
    });

    // 使用 Serper API 搜索
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5,  // 获取前5个结果
        gl: 'us',
        hl: 'en',
        type: 'search'
      })
    });

    if (!response.ok) {
      logger.error('搜索请求失败', {
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Serper API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const searchResults = data.organic || [];

    logger.info('获取到搜索结果', {
      resultCount: searchResults.length,
      firstResult: searchResults[0] ? {
        title: searchResults[0].title,
        link: searchResults[0].link
      } : null,
      timestamp: new Date().toISOString()
    });

    // 分析搜索结果找到最可能的官网
    let officialWebsite: string | null = null;
    let productDescription: string | null = null;

    // 处理搜索结果
    for (const result of searchResults) {
      const { link, title, snippet } = result;
      
      // 检查是否是官方网站（通过域名匹配）
      const domainMatch = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const urlDomain = new URL(link).hostname.toLowerCase();
      
      logger.debug('分析搜索结果', {
        title,
        domain: urlDomain,
        matchPattern: domainMatch,
        timestamp: new Date().toISOString()
      });

      if (
        urlDomain.includes(domainMatch) || 
        urlDomain === `www.${domainMatch}.com` ||
        urlDomain === `${domainMatch}.com` ||
        urlDomain === `${domainMatch}.ai` ||
        title.toLowerCase().includes(projectName.toLowerCase() + ' - official') ||
        title.toLowerCase().includes('official ' + projectName.toLowerCase())
      ) {
        officialWebsite = link;
        productDescription = snippet;
        logger.info('找到可能的官方网站', {
          website: link,
          matchType: 'domain_match',
          title,
          timestamp: new Date().toISOString()
        });
        break;
      }
    }

    if (!officialWebsite) {
      logger.info('未找到匹配的官方网站', {
        projectName,
        searchedDomains: searchResults.map(r => new URL(r.link).hostname),
        timestamp: new Date().toISOString()
      });
      return { officialWebsite: null, productDescription: null };
    }

    // 如果找到了官网，尝试获取更详细的产品描述
    logger.info('开始第二步：在官网内搜索产品特性', {
      officialWebsite,
      projectName,
      timestamp: new Date().toISOString()
    });

    const aboutSearchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: `${projectName} product features site:${new URL(officialWebsite).hostname}`,
        num: 2,
        gl: 'us',
        hl: 'en',
        type: 'search'
      })
    });

    if (!aboutSearchResponse.ok) {
      logger.error('产品特性搜索失败', {
        status: aboutSearchResponse.status,
        statusText: aboutSearchResponse.statusText,
        timestamp: new Date().toISOString()
      });
    } else {
      const aboutData = await aboutSearchResponse.json();
      const aboutResults = aboutData.organic || [];
      
      if (aboutResults.length > 0) {
        // 使用产品页面的描述替换之前的描述
        const newDescription = aboutResults[0].snippet;
        productDescription = newDescription;
        logger.info('成功获取产品特性描述', {
          descriptionLength: newDescription.length,
          source: aboutResults[0].link,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.info('未找到产品特性描述', {
          officialWebsite,
          timestamp: new Date().toISOString()
        });
      }
    }

    logger.info('产品信息搜索完成', {
      projectName,
      hasWebsite: !!officialWebsite,
      hasDescription: !!productDescription,
      websiteUrl: officialWebsite,
      descriptionPreview: productDescription ? productDescription.substring(0, 100) + '...' : null,
      timestamp: new Date().toISOString()
    });

    return {
      officialWebsite,
      productDescription: productDescription || null
    };

  } catch (error) {
    logger.error('产品信息搜索过程中发生错误', {
      projectName,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      timestamp: new Date().toISOString()
    });
    return { officialWebsite: null, productDescription: null };
  }
}

export async function analyzeContent(title: string, text: string): Promise<AIAnalysisResult> {
  const startTime = Date.now();
  
  const prompt = `
请分析以下文本，判断是否包含特定的AI公司/产品名称，还是关于多个公司或行业趋势的综合新闻。

标题：${title}
内容：${text}

首先判断文章类型：
1. 这是关于特定公司/产品的文章吗？
2. 还是综合新闻汇总/行业概览？

请返回JSON格式（不要包含其他格式或解释）：
{
  "projectName": "如果是关于特定公司/产品，在此提取其名称。在以下情况返回null：1) 综合新闻汇总/行业概览，2) 无法找到明确的公司/产品名称，3) 提及多个公司但没有明确的主要对象"
}

分析指导原则：
1. 对于提及多个公司的融资轮次或行业新闻，返回null
2. 对于专注于特定公司融资/新闻的文章，提取该公司名称
3. 忽略通用术语如'AI'、'Tech'、'Labs'，除非它们是官方名称的一部分
4. 如果文章讨论行业趋势或统计数据而不专注于特定公司，返回null
5. 对主要对象公司有疑问时，返回null
6. 对新闻汇总标题返回null（如"每周融资汇总"、"顶级AI新闻"）
7. 如果提取的名称是常见词（如"the"、"a"、"an"），返回null
8. 如果公司名称无法与通用术语明确区分，返回null
9. 提取的名称必须是实际的公司或产品名称，而不是文章元数据
10. 对于新闻聚合或摘要文章，始终返回null
11. 如果标题是新闻类别或栏目标题，返回null
12. 名称应该完整且正确大写（如"OpenAI"而不是"open"或"ai"）

无效案例示例（应返回null）：
- "本周最大融资轮次"
- "AI行业新闻更新"
- "多家初创公司获得融资"
- "科技汇总：AI最新动态"
- "风险投资周报"
- "初创生态系统报告"

有效案例示例：
- "Anthropic为AI开发筹集4.5亿美元"
- "Claude AI推出新功能"
- "DeepMind的最新研究"
`;

  try {
    logger.debug('开始AI分析', {
      titleLength: title.length,
      textLength: text.length,
      timestamp: new Date().toISOString()
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
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      
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
            logger.warn('解析流式响应chunk失败', {
              chunk: jsonStr,
              error: e instanceof Error ? e.message : String(e)
            });
          }
        }
      }
    }

    try {
      const cleanedResult = cleanMarkdownJSON(result);
      const aiAnalysis = JSON.parse(cleanedResult);
      const processingTime = Date.now() - startTime;
      
      // 如果找到了项目名称，使用智能搜索获取详细信息
      if (aiAnalysis.projectName) {
        logger.info('找到项目名称，开始智能搜索', {
          projectName: aiAnalysis.projectName,
          timestamp: new Date().toISOString()
        });
        
        const productSpecs = await intelligentSearch(aiAnalysis.projectName);
        
        logger.debug('智能搜索完成', {
          projectName: aiAnalysis.projectName,
          confidence: productSpecs.confidence_score,
          hasWebsite: !!productSpecs.official_website,
          hasDescription: !!productSpecs.product_description,
          processingTime: Date.now() - startTime
        });

        logger.info('🎯 智能搜索获取到产品信息，准备保存到数据库', {
          projectName: aiAnalysis.projectName,
          databasePreview: {
            name: productSpecs.product_name || aiAnalysis.projectName,
            company_info: productSpecs.company_name,
            description: productSpecs.product_description,
            official_website: productSpecs.official_website,
            confidence_score: productSpecs.confidence_score
          },
          dataQuality: {
            hasProductName: !!productSpecs.product_name,
            hasCompanyName: !!productSpecs.company_name,
            hasDescription: !!productSpecs.product_description,
            hasWebsite: !!productSpecs.official_website,
            confidence: productSpecs.confidence_score,
            readyForSave: !!(productSpecs.product_name && productSpecs.company_name)
          },
          timestamp: new Date().toISOString()
        });

        return {
          projectName: productSpecs.product_name || aiAnalysis.projectName,
          projectDescription: productSpecs.product_description || '',
          officialWebsite: productSpecs.official_website,
          productDescription: productSpecs.product_description,
          companyName: productSpecs.company_name,
          confidence_score: productSpecs.confidence_score > 0 ? productSpecs.confidence_score : 0.95,
          analysis_metadata: {
            processing_time: Date.now() - startTime,
            name_source: 'intelligent_search',
            description_quality_score: productSpecs.confidence_score,
            processing_steps: ['initial_analysis', 'intelligent_search', 'specs_extraction']
          }
        };
      } else {
        logger.info('未找到有效的项目名称，跳过处理', {
          title,
          processingTime,
          textSample: text.substring(0, 100) + '...'
        });

        return {
          projectName: null,
          projectDescription: '',
          officialWebsite: null,
          productDescription: null,
          companyName: null,
          confidence_score: 0,
          analysis_metadata: {
            processing_time: processingTime,
            name_source: 'ai_extraction',
            description_quality_score: 0,
            processing_steps: ['initial_analysis']
          }
        };
      }
    } catch (error) {
      logger.error('AI响应格式错误', {
        error: error instanceof Error ? error.message : String(error),
        result: result.substring(0, 200)
      });
      throw new Error('AI响应格式错误：返回结果不是有效的JSON');
    }
  } catch (error) {
    logger.error('AI分析失败', {
      error: error instanceof Error ? error.message : String(error),
      textLength: text.length,
      processingTime: Date.now() - startTime
    });
    throw error;
  }
} 