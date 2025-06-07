import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { logger, detailedLogger } from './utils/logger';
import { truncateString, extractProjectName, getFullProjectDescription } from './utils/content-processor';
import { analyzeContent } from './utils/ai-analyzer';
import { buildAnalysisText } from './utils/text-processor';
import type { ProjectInfo } from './utils/content-processor';

// 类型定义
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

interface ProcessedResult {
  project_name: string;
  description: string;
  project_description: string;
  company_info: string;
  funding_info: string;
  source_url: string;
  source_name: string;
  source_title: string;
  source_date: string | null;
  company_website: string;
  official_website?: string;
  product_description_en?: string;
  funding_amount: string;
  funding_round: string;
  funding_date: string | null;
  investors: string[];
  company_location: string;
  industry_tags: string[];
  processed_at: string;
  created_at: string;
  updated_at: string;
  metadata: {
    ai_analysis_metadata: {
      confidence_score: number;
      processing_time: number;
      name_source: string;
      description_quality_score: number;
      processing_steps: any[];
      analysis_metadata?: any;
    };
    processing_metadata: {
      total_processing_time: number;
      processing_steps: Array<{
        step: string;
        timestamp: string;
        duration?: number;
        success?: boolean;
        website?: string | null;
        confidence?: number;
      }>;
      deduplication_info?: {
        original_count: number;
        deduplicated_count: number;
        timestamp: string;
      };
    };
    freshness_score: number;
  };
}

// 环境变量
const SERPER_API_KEY = process.env.SERPER_API_KEY || 'YOUR_SERPER_API_KEY';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 添加获取动态时间范围的函数
function getDateRange(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// 搜索源配置
const searchSources = [
  {
    name: 'Y Combinator',
    query: `site:ycombinator.com/companies "AI" "artificial intelligence" after:${getDateRange(30)}`,
    weight: 1.6,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  },
  {
    name: 'TechCrunch',
    query: `site:techcrunch.com (intitle:"AI" OR intitle:"artificial intelligence") (intitle:"raises" OR intitle:"funding" OR intitle:"investment") after:${getDateRange(30)}`,
    weight: 1.5
  },
  {
    name: 'VentureBeat',
    query: `site:venturebeat.com (intitle:"AI" OR intitle:"artificial intelligence") (intitle:"raises" OR intitle:"funding" OR intitle:"investment") after:${getDateRange(30)}`,
    weight: 1.4
  },
  {
    name: 'Crunchbase News',
    query: `site:news.crunchbase.com "AI" "artificial intelligence" "funding" after:${getDateRange(30)}`,
    weight: 1.3
  },
  {
    name: 'Forbes Tech',
    query: `site:forbes.com/sites "AI" "artificial intelligence" "funding" "startup" after:${getDateRange(30)}`,
    weight: 1.2
  },
  {
    name: 'TechStartups',
    query: `site:techstartups.com "AI" "artificial intelligence" "funding" after:${getDateRange(30)}`,
    weight: 1.1
  }
];

// 辅助函数：标准化日期格式
function standardizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  // 如果已经是ISO格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr;
  }

  // 处理相对日期
  if (dateStr.includes('ago')) {
    const now = new Date();
    const match = dateStr.match(/(\d+)\s*(day|week|month|year)s?\s*ago/i);
    if (match) {
      const [_, amount, unit] = match;
      const num = parseInt(amount);
      switch (unit.toLowerCase()) {
        case 'day':
          now.setDate(now.getDate() - num);
          break;
        case 'week':
          now.setDate(now.getDate() - num * 7);
          break;
        case 'month':
          now.setMonth(now.getMonth() - num);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - num);
          break;
      }
      return now.toISOString().split('T')[0];
    }
  }

  // 尝试解析其他日期格式
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

// 使用Serper API搜索
async function searchWithSerper(source: typeof searchSources[0]): Promise<any[]> {
  logger.info(`Starting search for ${source.name}`, { 
    query: source.query,
    timestamp: new Date().toISOString()
  });
  
  try {
    const requestBody = {
      q: source.query,
      num: 10,
      gl: 'us',
      hl: 'en',
      type: 'search'
    };

    logger.debug(`Sending request to Serper API`, {
      url: 'https://google.serper.dev/search',
      headers: {
        'X-API-KEY': SERPER_API_KEY.substring(0, 5) + '...',
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const searchResults = data.organic || [];

    logger.info(`${source.name} search completed`, {
      resultCount: searchResults.length,
      firstResult: searchResults[0] ? {
        title: searchResults[0].title,
        link: searchResults[0].link
      } : null
    });

    return searchResults.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
      date: standardizeDate(item.date) || new Date().toISOString().split('T')[0],
          weight: source.weight,
          source: source.name
    }));
  } catch (error) {
    logger.error(`${source.name} search failed`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      },
      apiKey: SERPER_API_KEY ? 'set' : 'not set'
    });
    return [];
  }
}

// 提取文章的核心内容
function extractCoreSummary(text: string): string {
  // 限制输入文本长度
  const maxInputLength = 1000; // 限制输入长度为1000字符
  const truncatedText = text.length > maxInputLength ? text.slice(0, maxInputLength) + '...' : text;
  
  // 分段
  const paragraphs = truncatedText.split(/\n\s*\n/);
  
  // 提取关键段落（包含重要信息的段落）
  const keyParagraphs = paragraphs.filter(p => {
    const paragraph = p.toLowerCase();
    return (
      // 包含资金相关信息
      paragraph.includes('raise') || 
      paragraph.includes('funding') ||
      paragraph.includes('investment') ||
      paragraph.includes('million') ||
      paragraph.includes('billion') ||
      // 包含公司/产品描述
      paragraph.includes('develop') ||
      paragraph.includes('build') ||
      paragraph.includes('create') ||
      paragraph.includes('provide') ||
      paragraph.includes('platform') ||
      paragraph.includes('solution') ||
      // 包含技术关键词
      paragraph.includes('ai') ||
      paragraph.includes('machine learning') ||
      paragraph.includes('artificial intelligence') ||
      // 包含商业信息
      paragraph.includes('market') ||
      paragraph.includes('customer') ||
      paragraph.includes('industry')
    );
  });

  // 如果没有找到关键段落，返回原文的前几段
  if (keyParagraphs.length === 0) {
    const summary = paragraphs.slice(0, 2).join('\n\n');
    return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
  }

  // 返回关键段落（限制长度）
  const summary = keyParagraphs.slice(0, 3).join('\n\n');
  return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
}

// 计算文本相似度的函数
function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // 将文本转换为小写并分词
  const words1 = text1.toLowerCase().split(/\W+/);
  const words2 = text2.toLowerCase().split(/\W+/);
  
  // 创建词频映射
  const freq1 = new Map();
  const freq2 = new Map();
  
  words1.forEach(word => {
    freq1.set(word, (freq1.get(word) || 0) + 1);
  });
  
  words2.forEach(word => {
    freq2.set(word, (freq2.get(word) || 0) + 1);
  });
  
  // 计算余弦相似度
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  freq1.forEach((count1, word) => {
    const count2 = freq2.get(word) || 0;
    dotProduct += count1 * count2;
    norm1 += count1 * count1;
  });
  
  freq2.forEach((count2) => {
    norm2 += count2 * count2;
  });
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// 增强的去重逻辑
function deduplicateResults(searchResults: any[]): any[] {
  const seen = new Map();
  return searchResults.filter(item => {
    // 生成唯一标识
    const key = `${item.title}-${item.source}-${item.date}`;
    
    // 检查内容相似度
    for (const [seenKey, seenItem] of seen.entries()) {
      const titleSimilarity = calculateSimilarity(item.title, seenItem.title);
      const contentSimilarity = calculateSimilarity(item.snippet, seenItem.snippet);
      
      // 如果标题或内容相似度过高，认为是重复内容
      if (titleSimilarity > 0.8 || contentSimilarity > 0.8) {
        // 保留权重更高的版本
        if (item.weight > seenItem.weight) {
          seen.delete(seenKey);
          seen.set(key, item);
          return true;
        }
        return false;
      }
    }
    
    if (!seen.has(key)) {
      seen.set(key, item);
      return true;
    }
    return false;
  });
}

// 计算内容新鲜度分数
function calculateFreshnessScore(date: string | null): number {
  if (!date) return 0;
  
  const now = new Date();
  const publishDate = new Date(date);
  const daysDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // 计算新鲜度评分（0-1之间）
  return Math.max(0, 1 - (daysDiff / 30));
}

// 从摘要中提取项目信息
function extractProjectInfoFromSnippet(snippet: string, title: string): ProjectInfo {
  const info: ProjectInfo = {
    project_name: extractProjectName(title),
    description: snippet,
    projectDescription: snippet,
    companyInfo: '',
    fundingInfo: '',
    companyWebsite: '',
    fundingAmount: extractFundingAmount(snippet),
    fundingRound: extractFundingRound(snippet),
    fundingDate: extractFundingDate(snippet) || undefined,
    investors: extractInvestors(snippet),
    location: extractLocation(snippet),
    industryTags: extractIndustryTags(snippet),
    ai_analysis_metadata: {
      analysis_method: 'regex',
      confidence: 0.7,
      tech_stack: [],
      unique_points: [],
      target_market: '',
      business_model: ''
    }
  };

  return info;
}

// 构建分析文本
function buildAnalysisTextLocal(item: any): string {
  return `
Title: ${item.title}
Source: ${item.source}
Published Date: ${item.date || ''}

Article Summary:
${item.snippet || ''}
`.trim();
}

// 辅助函数：提取融资金额
function extractFundingAmount(text: string): string {
  const amountRegex = /(\$\d+(?:\.\d+)?(?:\s*[kmb]illion)?|\d+(?:\.\d+)?\s*(?:million|billion|m|b))/i;
  const match = text.match(amountRegex);
  return match ? match[0] : '';
}

// 辅助函数：提取融资轮次
function extractFundingRound(text: string): string {
  const roundRegex = /(seed|series\s*[a-z]|pre-seed|angel)/i;
  const match = text.match(roundRegex);
  return match ? match[0] : '';
}

// 辅助函数：提取融资日期
function extractFundingDate(text: string): string | null {
  // 简单的日期匹配，可以根据需要扩展
  const dateRegex = /\b\d{4}-\d{2}-\d{2}\b/;
  const match = text.match(dateRegex);
  return match ? match[0] : null;
}

// 辅助函数：提取投资者
function extractInvestors(text: string): string[] {
  // 这里可以添加更复杂的投资者提取逻辑
  const investors = text.match(/(?:led by|from|with)\s+([\w\s,]+)(?=\s+and|\s*,|\s*\.)/i);
  if (!investors) return [];
  return investors[1].split(/,|\sand\s/).map(i => i.trim());
}

// 辅助函数：提取位置信息
function extractLocation(text: string): string {
  const locationRegex = /(?:based in|from)\s+([^,.]+)(?:[,.]|$)/i;
  const match = text.match(locationRegex);
  return match ? match[1].trim() : '';
}

// 辅助函数：提取行业标签
function extractIndustryTags(text: string): string[] {
  const commonTags = [
    'AI', 'Machine Learning', 'Deep Learning', 'NLP',
    'Computer Vision', 'Robotics', 'SaaS', 'FinTech',
    'Healthcare', 'Enterprise', 'Security', 'Cloud',
    'Data Analytics', 'IoT', 'Blockchain'
  ];

  return commonTags.filter(tag => 
    text.toLowerCase().includes(tag.toLowerCase())
  );
}

// 处理搜索结果
async function processSearchResults(searchResults: any[]): Promise<ProcessedResult[]> {
  const startTime = Date.now();
  const processingStats = {
    total: searchResults.length,
    processed: 0,
    success: 0,
    failed: 0,
    aiAnalysis: {
      total: 0,
      success: 0,
      failed: 0,
      highConfidence: 0
    }
  };

  logger.info('开始处理搜索结果', { 
    totalResults: searchResults.length,
    startTime: new Date().toISOString()
  });

  // 过滤掉无效的搜索结果
  const validSearchResults = searchResults.filter(item => {
    if (!item || !item.title || !item.snippet) {
      logger.warn('跳过无效的搜索结果', {
        item: item ? {
          hasTitle: !!item.title,
          hasSnippet: !!item.snippet,
          link: item.link
        } : 'null item'
      });
      return false;
    }
    return true;
  });

  // 在处理结果之前先进行去重
  const uniqueResults = deduplicateResults(validSearchResults);

  const processedResults = await Promise.all(
    uniqueResults.map(async (item) => {
      const itemStartTime = Date.now();
      try {
        if (!item || !item.title || !item.snippet) {
          throw new Error('Invalid search result item');
        }

        logger.debug('开始处理单个结果', {
          title: item.title,
          source: item.source,
          processStartTime: new Date().toISOString()
        });

        // 从摘要中提取项目信息
        const projectInfo = extractProjectInfoFromSnippet(item.snippet || '', item.title || '');
        
        // 构建用于AI分析的文本
        const analysisText = buildAnalysisTextLocal(item);

        if (!analysisText) {
          throw new Error('Failed to build analysis text');
        }

        logger.debug('准备AI分析', {
          title: item.title,
          snippetLength: (item.snippet || '').length,
          analysisTextLength: analysisText.length
        });

        // 使用AI分析器进行深度分析
        processingStats.aiAnalysis.total++;
        const aiAnalysis = await analyzeContent(item.title || '', analysisText);
        
        if (!aiAnalysis) {
          throw new Error('AI analysis failed');
        }
        
        logger.debug('AI分析完成', {
          title: item.title,
          originalName: projectInfo.project_name,
          aiProjectName: aiAnalysis.projectName,
          aiDescriptionLength: (aiAnalysis.projectDescription || '').length,
          confidenceScore: aiAnalysis.confidence_score,
          processingTime: Date.now() - itemStartTime
        });

        processingStats.aiAnalysis.success++;
        const confidenceScore = aiAnalysis.confidence_score ?? 0.95;
        if (confidenceScore > 0.8) {
          processingStats.aiAnalysis.highConfidence++;
        }

        // 合并AI分析结果和项目信息
        const result: ProcessedResult = {
          project_name: truncateString(aiAnalysis.projectName || projectInfo.project_name || item.title, 255),
          description: aiAnalysis.projectDescription || aiAnalysis.productDescription || item.snippet || '',
          project_description: aiAnalysis.projectDescription || aiAnalysis.productDescription || item.snippet || '',
          company_info: aiAnalysis.companyName || projectInfo.companyInfo || '',
          funding_info: projectInfo.fundingInfo || '',
          source_url: item.link || '',
          source_name: item.source || '',
          source_title: item.title || '',
          source_date: standardizeDate(item.date),
          company_website: aiAnalysis.officialWebsite || projectInfo.companyWebsite || '',
          official_website: aiAnalysis.officialWebsite || projectInfo.companyWebsite || '',
          product_description_en: aiAnalysis.productDescription || '',
          funding_amount: projectInfo.fundingAmount || '',
          funding_round: projectInfo.fundingRound || '',
          funding_date: standardizeDate(projectInfo.fundingDate || null),
          investors: projectInfo.investors || [],
          company_location: projectInfo.location || '',
          industry_tags: projectInfo.industryTags || [],
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
          ai_analysis_metadata: {
              confidence_score: confidenceScore,
              processing_time: Date.now() - itemStartTime,
              name_source: confidenceScore > 0.8 ? 'intelligent_search' : 'extracted',
              description_quality_score: confidenceScore,
              processing_steps: [],
              analysis_metadata: {
                ...aiAnalysis.analysis_metadata,
                company_name: aiAnalysis.companyName,
                official_website: aiAnalysis.officialWebsite
              }
            },
          processing_metadata: {
            total_processing_time: Date.now() - itemStartTime,
            processing_steps: [
              {
                  step: "项目信息提取",
                  timestamp: new Date().toISOString(),
                  duration: Date.now() - itemStartTime
              },
              {
                  step: "AI智能分析",
                timestamp: new Date().toISOString(),
                  duration: Date.now() - itemStartTime
                },
                {
                  step: "智能搜索与规格提取",
                  timestamp: new Date().toISOString(),
                  success: !!aiAnalysis.officialWebsite,
                  website: aiAnalysis.officialWebsite || null,
                  confidence: aiAnalysis.confidence_score
                }
              ],
              deduplication_info: {
                original_count: searchResults.length,
                deduplicated_count: uniqueResults.length,
                timestamp: new Date().toISOString()
              }
            },
            freshness_score: calculateFreshnessScore(item.date)
          }
        };

        logger.info('📝 数据库保存预览', {
          projectName: result.project_name,
          databaseRecord: {
            name: result.project_name,
            description: result.description,
            company_info: result.company_info,
            official_website: result.official_website,
            confidence_score: result.metadata.ai_analysis_metadata.confidence_score
          },
          dataQuality: {
            hasName: !!result.project_name,
            hasDescription: !!result.description,
            hasCompanyInfo: !!result.company_info,
            hasWebsite: !!result.official_website,
            confidence: result.metadata.ai_analysis_metadata.confidence_score,
            readyForDatabase: !!(result.project_name && result.description)
          },
          processingTime: Date.now() - itemStartTime
        });

        processingStats.processed++;
        processingStats.success++;

        logger.debug('单个结果处理完成', {
          projectName: result.project_name,
          processingTime: Date.now() - itemStartTime,
          aiConfidence: result.metadata.ai_analysis_metadata.confidence_score
        });

        return result;
      } catch (error) {
        processingStats.processed++;
        processingStats.failed++;
        if (error.message?.includes('AI分析')) {
          processingStats.aiAnalysis.failed++;
        }

        logger.error('处理结果失败', {
          title: item?.title || 'Unknown title',
          error: error instanceof Error ? {
            message: error.message,
            name: error.name,
            stack: error.stack
          } : error,
          processingTime: Date.now() - itemStartTime
        });
        return null;
      }
    })
  );

  const validResults = processedResults.filter((result): result is ProcessedResult => result !== null);
  
  const totalProcessingTime = Date.now() - startTime;
  
  logger.info('搜索结果处理完成', {
    processingStats: {
      ...processingStats,
      validResults: validResults.length,
      totalProcessingTime,
      averageProcessingTime: totalProcessingTime / processingStats.processed
    }
  });

  return validResults;
}

// 保存到数据库
async function saveToDatabase(results: ProcessedResult[]): Promise<void> {
  const userId = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';
  const startTime = Date.now();

  detailedLogger.projectOperation('开始保存', {
    resultCount: results.length,
    userId,
    firstResult: results[0]?.project_name
  });

  try {
    // 获取用户现有的所有项目名称
    const { data: existingProjects, error: fetchError } = await supabase
      .from('user_projects')
      .select('name, source_url')
      .eq('user_id', userId);

    if (fetchError) {
      detailedLogger.operationError('获取现有项目失败', fetchError);
      throw fetchError;
    }

    const existingProjectNames = new Set(existingProjects.map(p => p.name));
    
    detailedLogger.projectOperation('获取现有项目', {
      existingCount: existingProjectNames.size,
      processingTime: Date.now() - startTime
    });

    // 转换数据格式并检查重复
    const duplicateRecords: any[] = [];
    const newRecords = results.map(result => ({
      user_id: userId,
      name: result.project_name,
      description: result.description,
      name_en: result.project_name,
      description_en: result.description,
      source_language: 'en',
      company_info: result.company_info || '',
      funding_info: result.funding_info || '',
      company_website: result.company_website || '',
      official_website: result.company_website || '',
      funding_amount: result.funding_amount || '',
      funding_round: result.funding_round || '',
      funding_date: standardizeDate(result.funding_date),
      investors: result.investors || [],
      company_location: result.company_location || '',
      industry_tags: result.industry_tags || [],
      source_url: result.source_url || '',
      source_name: result.source_name || '',
      source_title: result.source_title || '',
      source_date: standardizeDate(result.source_date),
      processed_at: new Date().toISOString(),
      metadata: {
        ai_analysis: result.metadata.ai_analysis_metadata,
        processing: result.metadata.processing_metadata,
        last_analyzed_at: new Date().toISOString(),
        import_info: {
          import_time: new Date().toISOString(),
          source: result.source_name,
          original_url: result.source_url
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: false,
      is_open_source: true,
      model_locked: false
    })).filter(record => {
      const isDuplicate = existingProjectNames.has(record.name);
      if (isDuplicate) {
        duplicateRecords.push(record);
        detailedLogger.duplicateFound(record.name, {
          source: record.source_name,
          sourceUrl: record.source_url,
          fundingInfo: {
            amount: record.funding_amount,
            round: record.funding_round,
            date: record.funding_date
          }
        });
      }
      return !isDuplicate;
    });

    detailedLogger.operationStats('数据预处理', {
      totalRecords: results.length,
      newRecords: newRecords.length,
      duplicates: duplicateRecords.length,
      processingTime: Date.now() - startTime,
      duplicatesList: duplicateRecords.map(r => ({
        name: r.name,
        source: r.source_name,
        url: r.source_url
      }))
    });

    if (newRecords.length === 0) {
      detailedLogger.projectOperation('无新记录', {
        totalChecked: results.length,
        allDuplicates: true,
        processingTime: Date.now() - startTime
      });
      return;
    }

    // 分批处理记录
    const batchSize = 3;
    const batchResults = {
      success: 0,
      failed: 0,
      retries: 0
    };

    for (let i = 0; i < newRecords.length; i += batchSize) {
      const batchStartTime = Date.now();
      const batch = newRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(newRecords.length / batchSize);

      try {
        detailedLogger.batchOperation(batchNumber, totalBatches, {
          batchSize: batch.length,
          records: batch.map(r => r.name)
        });

        const { error } = await supabase
          .from('user_projects')
          .insert(batch);

        if (error) {
          detailedLogger.operationError('批次保存失败', error, {
            batchNumber,
            records: batch.map(r => r.name)
          });
          throw error;
        }

        batchResults.success++;
        detailedLogger.batchOperation(batchNumber, totalBatches, {
          status: 'success',
          processingTime: Date.now() - batchStartTime,
          totalProcessed: i + batch.length,
          remaining: newRecords.length - (i + batch.length),
          successRate: `${batchResults.success}/${batchNumber}`
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        batchResults.failed++;
        detailedLogger.operationError('批次处理失败', error, {
          batchNumber,
          retryCount: batchResults.retries,
          records: batch.map(r => r.name)
        });

        await new Promise(resolve => setTimeout(resolve, 5000));
        i -= batchSize;
        batchResults.retries++;
        continue;
      }
    }

    const endTime = Date.now();
    detailedLogger.operationStats('保存完成', {
      statistics: {
        totalRecords: results.length,
        newRecords: newRecords.length,
        duplicates: duplicateRecords.length,
        successfulBatches: batchResults.success,
        failedBatches: batchResults.failed,
        totalRetries: batchResults.retries,
        totalProcessingTime: endTime - startTime,
        averageTimePerBatch: (endTime - startTime) / (batchResults.success + batchResults.failed)
      },
      sampleNewRecords: newRecords.slice(0, 3).map(r => ({
        name: r.name,
        source: r.source_name
      }))
    });
  } catch (error) {
    detailedLogger.operationError('保存流程异常', error, {
      userId,
      totalResults: results.length,
      processingTime: Date.now() - startTime
    });
    throw error;
  }
}

const handler: Handler = async (event) => {
  try {
    logger.info('开始AI项目搜索任务', {
      timestamp: new Date().toISOString(),
      sourceCount: searchSources.length
    });

    // 验证API密钥
    if (!SERPER_API_KEY || SERPER_API_KEY === 'YOUR_SERPER_API_KEY') {
      throw new Error('Serper API密钥未设置或无效');
    }

    let allResults: any[] = [];

    // 串行处理每个来源
    for (const source of searchSources) {
      const results = await searchWithSerper(source);
      allResults = [...allResults, ...results];
      
      // 添加短暂延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.debug(`完成源 ${source.name} 的搜索`, {
        resultsCount: results.length,
        totalSoFar: allResults.length
      });
    }

    logger.info('搜索完成', { totalResults: allResults.length });

    // 去重
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.link, item])).values()
    ).sort((a, b) => b.weight - a.weight);

    logger.info('去重完成', {
      beforeCount: allResults.length,
      afterCount: uniqueResults.length
    });

    // 处理结果
    const processedResults = await processSearchResults(uniqueResults);
    
    // 过滤有效结果
    const validResults = processedResults.filter(result => {
      // 基本验证
      if (!result || !result.source_url || result.industry_tags.length === 0) {
        return false;
      }

      // 内容长度验证
      if (result.description.length < 100 && result.company_info.length < 100) {
        return false;
      }

      // 项目名称验证
      const projectName = result.project_name.toLowerCase().trim();
      
      // 排除常见无效项目名称
      const invalidNames = ['the', 'a', 'an', 'this', 'that', 'these', 'those'];
      if (invalidNames.includes(projectName)) {
        logger.warn('检测到无效项目名称', {
          projectName,
          sourceTitle: result.source_title,
          sourceUrl: result.source_url
        });
        return false;
      }

      // 排除过短的项目名称
      if (projectName.length < 2) {
        logger.warn('项目名称过短', {
          projectName,
          sourceTitle: result.source_title,
          sourceUrl: result.source_url
        });
        return false;
      }

      // 排除新闻标题类项目名称
      const newsKeywords = ['news', 'roundup', 'weekly', 'daily', 'update', 'report', 'summary'];
      if (newsKeywords.some(keyword => projectName.includes(keyword))) {
        logger.warn('检测到新闻类标题', {
          projectName,
          sourceTitle: result.source_title,
          sourceUrl: result.source_url
        });
        return false;
      }

      // 排除纯数字或者特殊字符的项目名称
      if (/^[^a-zA-Z]*$/.test(projectName)) {
        logger.warn('项目名称不包含字母', {
          projectName,
          sourceTitle: result.source_title,
          sourceUrl: result.source_url
        });
        return false;
      }

      return true;
    });

    logger.info('结果过滤完成', {
      processedCount: processedResults.length,
      validCount: validResults.length
    });

    if (validResults.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: '没有找到新的AI项目',
          count: 0,
          searchStats: {
            total: allResults.length,
            unique: uniqueResults.length,
            processed: processedResults.length,
            valid: 0
          }
        }),
      };
    }

    // 保存到数据库
    await saveToDatabase(validResults);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '成功更新AI项目数据',
        count: validResults.length,
        searchStats: {
          total: allResults.length,
          unique: uniqueResults.length,
          processed: processedResults.length,
          valid: validResults.length
        },
        firstResult: {
          name: validResults[0].project_name,
          source: validResults[0].source_name
        }
      }),
    };
  } catch (error) {
    logger.error('搜索任务失败', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      },
      env: {
        hasSerperKey: !!SERPER_API_KEY,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_ANON_KEY
      }
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '搜索AI项目失败',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

export { handler }; 