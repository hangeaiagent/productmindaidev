import { analyzeContent } from './ai-analyzer';
import { logger } from './logger';

// 工具函数
export function truncateString(str: string | undefined, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

// 提取项目名称
export function extractProjectName(title: string): string {
  // 移除融资金额相关信息
  let cleanTitle = title.replace(/\$\s*\d+(\.\d+)?\s*(million|billion|m|b)\b.*$/i, '');
  
  // 移除融资轮次信息
  cleanTitle = cleanTitle.replace(/\b(series\s+[a-z]|seed|angel|pre-seed)\b.*$/i, '');
  
  // 移除常见的新闻词语
  cleanTitle = cleanTitle.replace(/\b(raises|secures|announces|completes|closes|funding|round|investment)\b.*$/i, '');
  
  // 提取公司名称的模式
  const patterns = [
    // 模式1: 引号中的名称
    /"([^"]+)"/,
    // 模式2: 句子开头到第一个标点或关键词
    /^([^,.!?]+?)(?:\s+is|\s+has|\s+announces|\s+raises|\s+secures|\s+completes|\s+closes|\s+to\b|\s*[,.!?])/i,
    // 模式3: AI 公司名称模式
    /^([A-Za-z0-9._-]+(?:\s+AI)?)\b/,
    // 模式4: 通用公司名称（1-3个单词）
    /^([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,2})\b/
  ];

  for (const pattern of patterns) {
    const match = cleanTitle.match(pattern);
    if (match && match[1] && match[1].length > 1) {
      // 清理和验证提取的名称
      const name = match[1].trim();
      // 确保名称不是通用词
      if (!isGenericTerm(name)) {
        return name;
      }
    }
  }

  // 如果所有模式都失败，返回清理后的前两个单词
  const words = cleanTitle.split(/\s+/).filter(word => word.length > 1);
  return words.slice(0, 2).join(' ');
}

// 检查是否是通用词
function isGenericTerm(name: string): boolean {
  const genericTerms = [
    'startup', 'company', 'technology', 'platform', 'solution',
    'software', 'system', 'service', 'product', 'application',
    'this', 'that', 'these', 'those', 'new', 'latest'
  ];
  
  const lowercaseName = name.toLowerCase();
  return genericTerms.some(term => lowercaseName === term) ||
         lowercaseName.length < 2 ||
         /^(the|a|an)\s/i.test(name);
}

// 提取融资信息
function extractFundingInfo(text: string): {
  amount?: string;
  round?: string;
  date?: string;
  investors?: string[];
} {
  const result = {
    amount: undefined as string | undefined,
    round: undefined as string | undefined,
    date: undefined as string | undefined,
    investors: undefined as string[] | undefined
  };

  // 提取融资金额
  const amountMatch = text.match(/\$\s*(\d+(?:\.\d+)?)\s*(million|billion|m|b)\b/i);
  if (amountMatch) {
    result.amount = `$${amountMatch[1]}${amountMatch[2].charAt(0).toUpperCase()}`;
  }

  // 提取轮次
  const roundMatch = text.match(/series\s+([a-z])|seed|angel|pre-seed/i);
  if (roundMatch) {
    result.round = roundMatch[0].toUpperCase();
  }

  // 提取日期
  const dateMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+202[45]/i);
  if (dateMatch) {
    result.date = new Date(dateMatch[0]).toISOString().split('T')[0];
  }

  // 提取投资者
  const investorPattern = /(?:led by|from|investors include)\s+([^.]+)/i;
  const investorMatch = text.match(investorPattern);
  if (investorMatch) {
    result.investors = investorMatch[1]
      .split(/,|\sand\s/)
      .map(investor => investor.trim())
      .filter(investor => investor.length > 0);
  }

  return result;
}

// 提取公司信息
function extractCompanyInfo(text: string): {
  description: string;
  website?: string;
  location?: string;
  industry?: string[];
} {
  const result = {
    description: '',
    website: undefined as string | undefined,
    location: undefined as string | undefined,
    industry: [] as string[]
  };

  // 提取公司描述
  const descriptionPattern = /(?:is |develops |provides |offers |builds |creates |enables |helps )([^.]+)/i;
  const descMatch = text.match(descriptionPattern);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // 提取网站
  const websiteMatch = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (websiteMatch) {
    result.website = websiteMatch[0];
  }

  // 提取位置
  const locationPattern = /(?:based in|headquartered in|located in)\s+([^,\.]+)/i;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  // 提取行业标签
  const industries = [
    'AI', 'Artificial Intelligence', 'Machine Learning',
    'Deep Learning', 'NLP', 'Computer Vision',
    'Robotics', 'Automation', 'SaaS',
    'FinTech', 'Healthcare', 'Security'
  ];

  result.industry = industries.filter(industry => 
    new RegExp(industry, 'i').test(text)
  );

  return result;
}

// 提取新闻日期
function extractNewsDate(item: any): string | undefined {
  // 首先尝试从item的date字段获取
  if (item.date) {
    try {
      const date = new Date(item.date);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 从文本中提取日期
  const datePatterns = [
    // 完整日期格式 (e.g., "January 15, 2024")
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+202[45]/i,
    // 简短日期格式 (e.g., "Jan 15, 2024")
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+202[45]/i,
    // ISO格式 (e.g., "2024-01-15")
    /202[45]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])/,
    // 美式日期格式 (e.g., "01/15/2024")
    /(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12][0-9]|3[01])\/202[45]/
  ];

  const fullText = `${item.title || ''} ${item.snippet || ''}`;
  
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        continue;
      }
    }
  }

  return undefined;
}

// 提取项目功能描述
function extractProjectDescription(text: string): string {
  const patterns = [
    // 模式1: "is developing/building/creating" 后面的描述
    /(?:is|are)\s+(?:developing|building|creating|offering|providing)\s+([^.!?]+[.!?])/i,
    
    // 模式2: "platform/solution/technology that/which" 后面的描述
    /(?:platform|solution|technology|product|tool)\s+(?:that|which|to)\s+([^.!?]+[.!?])/i,
    
    // 模式3: "enables/allows/helps" 后面的描述
    /(?:enables|allows|helps)\s+([^.!?]+[.!?])/i,
    
    // 模式4: "designed to/built to" 后面的描述
    /(?:designed|built|developed|created)\s+to\s+([^.!?]+[.!?])/i,
    
    // 模式5: 包含技术关键词的句子
    /(?:[^.!?]*(?:AI|artificial intelligence|machine learning|deep learning|neural network)[^.!?]*[.!?])/i
  ];

  const descriptions: string[] = [];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const desc = match[1] || match[0];
      if (desc && 
          !desc.toLowerCase().includes('funding') &&
          !desc.toLowerCase().includes('raises') &&
          !desc.toLowerCase().includes('investment') &&
          desc.length > 30) {
        descriptions.push(desc.trim());
      }
    }
  }

  // 如果找到多个描述，选择最长的且不包含融资信息的
  if (descriptions.length > 0) {
    return descriptions.sort((a, b) => b.length - a.length)[0];
  }

  return '';
}

// 辅助函数：构建集成描述
function buildIntegratedDescription(aiAnalysis: any): string {
  return `
产品概述：${aiAnalysis.companyDescription}

核心功能：${aiAnalysis.productFeatures}

技术特点：
${aiAnalysis.techStack.map((tech: string) => `- ${tech}`).join('\n')}

商业模式：${aiAnalysis.businessModel}

目标市场：${aiAnalysis.targetMarket}

产品优势：
${aiAnalysis.uniqueSellingPoints.map((point: string) => `- ${point}`).join('\n')}
`.trim();
}

// 辅助函数：构建公司信息
function buildCompanyInfo(aiAnalysis: any): string {
  return `${aiAnalysis.companyDescription}
商业模式: ${aiAnalysis.businessModel}
目标市场: ${aiAnalysis.targetMarket}`;
}

export interface ProjectInfo {
  project_name: string;
  description: string;
  projectDescription: string;
  companyInfo: string;
  fundingInfo: string;
  fundingAmount?: string;
  fundingRound?: string;
  fundingDate?: string;
  investors?: string[];
  companyWebsite?: string;
  location?: string;
  industryTags: string[];
  sourceDate?: string;
  ai_analysis_metadata: {
    analysis_method: string;
    confidence: number;
    tech_stack?: string[];
    unique_points?: string[];
    target_market?: string;
    business_model?: string;
  };
}

// 获取完整的项目描述
export async function getFullProjectDescription(item: any): Promise<ProjectInfo> {
  const title = item.title || '';
  const snippet = item.snippet || '';
  const fullText = `${title} ${snippet} ${item.fullContent || ''}`;

  try {
    // 使用AI提取详细信息
    const aiAnalysis = await analyzeContent(title, fullText);
    
    // 提取融资信息（保持原有的正则方式）
    const fundingInfo = extractFundingInfo(fullText);
    
    // 提取新闻日期
    const sourceDate = extractNewsDate(item);

    logger.info('项目信息提取完成', {
      projectName: aiAnalysis.projectName,
      aiAnalysisSuccess: true,
      descriptionLength: aiAnalysis.companyDescription.length
    });

    return {
      project_name: aiAnalysis.projectName,
      description: aiAnalysis.companyDescription,
      projectDescription: buildIntegratedDescription(aiAnalysis),
      companyInfo: buildCompanyInfo(aiAnalysis),
      fundingInfo: title,
      fundingAmount: fundingInfo.amount,
      fundingRound: fundingInfo.round,
      fundingDate: fundingInfo.date,
      investors: fundingInfo.investors,
      industryTags: [...aiAnalysis.techStack, ...aiAnalysis.uniqueSellingPoints],
      sourceDate,
      ai_analysis_metadata: {
        analysis_method: 'ai',
        confidence: 0.95,
        tech_stack: aiAnalysis.techStack,
        unique_points: aiAnalysis.uniqueSellingPoints,
        target_market: aiAnalysis.targetMarket,
        business_model: aiAnalysis.businessModel
      }
    };
  } catch (error) {
    logger.error('AI分析失败', {
      error: error instanceof Error ? error.message : String(error),
      title
    });
    throw error;
  }
}

/**
 * 提取文章的核心内容摘要
 */
function extractCoreSummary(text: string): string {
  // 分段
  const paragraphs = text.split(/\n\s*\n/);
  
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
    return paragraphs.slice(0, 3).join('\n\n');
  }

  // 返回关键段落（限制长度）
  const summary = keyParagraphs.slice(0, 5).join('\n\n');
  return summary.length > 2000 ? summary.substring(0, 2000) + '...' : summary;
}

/**
 * 构建用于AI分析的文本
 */
export function buildAnalysisText(item: any): string {
  // 提取文章核心内容
  const fullContent = item.fullContent || item.snippet || '';
  const coreSummary = extractCoreSummary(fullContent);

  // 构建结构化的分析文本
  const analysisText = `
标题：${item.title}
来源：${item.source}
发布日期：${item.date || ''}

文章摘要：
${item.snippet || ''}

核心内容：
${coreSummary}
`.trim();

  logger.debug('构建分析文本', {
    title: item.title,
    originalLength: fullContent.length,
    summaryLength: coreSummary.length,
    finalLength: analysisText.length
  });

  return analysisText;
} 