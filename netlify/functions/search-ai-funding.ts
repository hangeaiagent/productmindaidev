import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// 环境变量
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyC3fc8-5r4SWOISs0IIduiE4TOvE8-aFC0';
const GOOGLE_CX = process.env.GOOGLE_CX || 'e264dc925d71e46e4';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SearchResultItem {
  title: string;
  snippet: string;
  link: string;
  pagemap?: {
    metatags?: Array<{
      'og:description'?: string;
      'twitter:description'?: string;
      description?: string;
    }>;
    article?: Array<{
      articlebody?: string;
      description?: string;
    }>;
  };
}

interface GoogleSearchResult {
  items?: SearchResultItem[];
}

// 定义搜索源配置
const searchSources = [
  // 投资机构官网
  {
    name: 'Y Combinator',
    query: 'site:ycombinator.com AI portfolio funding',
    weight: 1.2
  },
  {
    name: 'M12 Ventures',
    query: 'site:m12.vc AI investments funding',
    weight: 1.1
  },
  // 科技媒体
  {
    name: 'TechCrunch',
    query: 'site:techcrunch.com AI funding 2025 2024',
    weight: 1.3
  },
  {
    name: 'VentureBeat',
    query: 'site:venturebeat.com AI funding round 2025 2024',
    weight: 1.2
  },
  // 数据平台
  {
    name: 'Crunchbase',
    query: 'site:crunchbase.com AI funding 2025 2024',
    weight: 1.4
  },
  {
    name: 'SoHoBlink',
    query: 'site:sohoblink.com AI funding 融资 2025 2024',
    weight: 1.1
  }
];

// 移除网站导航和无关信息的函数
function cleanNavigationText(text: string): string {
  return text
    // 移除常见的网站导航文本
    .replace(/(?:About Us|Privacy|Accessibility|Terms|Sitemap|RSS|Media Kit|Contact Us|Help Center)(?:\s*[·•|]\s*|\s*$)/g, '')
    // 移除社交媒体相关文本
    .replace(/(?:Follow us on|Connect with us on|Find us on)\s+(?:Twitter|Facebook|LinkedIn|Instagram|YouTube).*$/i, '')
    // 移除版权信息
    .replace(/©\s*\d{4}.*$/g, '')
    // 移除常见的网站底部文本
    .replace(/All rights reserved\.?/g, '')
    // 移除多余的标点和空格
    .replace(/([.,;])\s*([.,;])+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// 提取项目名称的函数
function extractProjectName(title: string): string {
  // 移除网站名称
  const siteSuffixes = [
    '- Y Combinator',
    '- M12',
    '- TechCrunch',
    '- VentureBeat',
    '| Crunchbase',
    '| SoHoBlink'
  ];
  let cleanTitle = title;
  for (const suffix of siteSuffixes) {
    cleanTitle = cleanTitle.split(suffix)[0].trim();
  }
  
  // 提取公司名称
  const fundingPattern = /(.+?)(?:\s+Raises|\s+Secures|\s+Closes|\s+Announces|\s+Completed|\s+\$)/i;
  const match = cleanTitle.match(fundingPattern);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return cleanTitle.split(' ').slice(0, 2).join(' ');
}

// 提取融资信息的函数
function extractFundingInfo(text: string): {
  fundingInfo: string;
  fundingAmount?: string;
  fundingRound?: string;
  fundingDate?: string;
  investors?: string[];
} {
  const result = {
    fundingInfo: '',
    fundingAmount: undefined,
    fundingRound: undefined,
    fundingDate: undefined,
    investors: undefined as string[] | undefined
  };

  // 提取融资金额
  const amountMatch = text.match(/\$\s*(\d+(?:\.\d+)?)\s*(million|billion|m|b)\b/i);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1]);
    const unit = amountMatch[2].toLowerCase();
    result.fundingAmount = `$${amount}${unit.charAt(0).toUpperCase()}`;
  }

  // 提取融资轮次
  const roundMatch = text.match(/series\s+([a-z])|seed|angel|pre-seed/i);
  if (roundMatch) {
    result.fundingRound = roundMatch[0].toUpperCase();
  }

  // 提取日期
  const dateMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+202[45]/i);
  if (dateMatch) {
    result.fundingDate = new Date(dateMatch[0]).toISOString().split('T')[0];
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

  // 提取完整的融资描述
  const fundingPattern = /(?:announced|closed|secured|raised|completed).*?(?:funding|investment|round|financing).*?[.!?]/i;
  const fundingMatch = text.match(fundingPattern);
  if (fundingMatch) {
    result.fundingInfo = fundingMatch[0].trim();
  }

  return result;
}

// 提取公司信息的函数
function extractCompanyInfo(text: string): {
  companyInfo: string;
  companyWebsite?: string;
  location?: string;
  employeeCount?: string;
  foundingDate?: string;
  industryTags: string[];
} {
  const result = {
    companyInfo: '',
    companyWebsite: undefined,
    location: undefined,
    employeeCount: undefined,
    foundingDate: undefined,
    industryTags: [] as string[]
  };

  // 提取公司网站
  const websiteMatch = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (websiteMatch) {
    result.companyWebsite = websiteMatch[0];
  }

  // 提取位置信息
  const locationPattern = /(?:based in|headquartered in|located in)\s+([^,\.]+)/i;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  // 提取员工规模
  const employeePattern = /(\d+(?:-\d+)?)\s+employees/i;
  const employeeMatch = text.match(employeePattern);
  if (employeeMatch) {
    result.employeeCount = employeeMatch[1];
  }

  // 提取成立日期
  const foundingPattern = /founded in (\d{4})/i;
  const foundingMatch = text.match(foundingPattern);
  if (foundingMatch) {
    result.foundingDate = `${foundingMatch[1]}-01-01`;
  }

  // 提取行业标签
  const industryKeywords = [
    'AI', 'Artificial Intelligence', 'Machine Learning', 'Deep Learning',
    'NLP', 'Computer Vision', 'Robotics', 'Automation', 'Data Analytics',
    'Healthcare', 'Fintech', 'Enterprise', 'Security', 'Cloud Computing',
    'SaaS', 'Infrastructure', 'Developer Tools', 'Productivity'
  ];
  
  const tags = new Set<string>();
  for (const keyword of industryKeywords) {
    if (new RegExp(keyword, 'i').test(text)) {
      tags.add(keyword);
    }
  }
  result.industryTags = Array.from(tags);

  // 提取公司描述
  const companyPattern = /(?:is |develops |provides |offers |builds |creates |enables |helps ).*?[.!?]/i;
  const companyMatch = text.match(companyPattern);
  if (companyMatch) {
    result.companyInfo = companyMatch[0].trim();
  }

  return result;
}

// 提取产品描述的函数
function extractProductDescription(text: string): string {
  const productPatterns = [
    /(?:platform|product|solution|technology) (?:that |which |to )[^.!?]+[.!?]/i,
    /(?:enables|allows|helps) (?:users|customers|businesses|developers) to [^.!?]+[.!?]/i,
    /(?:features|capabilities) include [^.!?]+[.!?]/i
  ];

  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return '';
}

// 获取完整的项目描述
async function getFullProjectDescription(item: SearchResultItem): Promise<{
  companyInfo: string;
  description: string;
  fundingInfo: string;
  fundingAmount?: string;
  fundingRound?: string;
  fundingDate?: string;
  investors?: string[];
  companyWebsite?: string;
  location?: string;
  employeeCount?: string;
  foundingDate?: string;
  industryTags: string[];
}> {
  try {
    const response = await fetch(item.link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const mainContent = cleanNavigationText(html);

    // 提取所有信息
    const fundingInfo = extractFundingInfo(mainContent);
    const companyInfo = extractCompanyInfo(mainContent);
    const productDesc = extractProductDescription(mainContent);

    return {
      companyInfo: companyInfo.companyInfo,
      description: productDesc,
      fundingInfo: fundingInfo.fundingInfo,
      fundingAmount: fundingInfo.fundingAmount,
      fundingRound: fundingInfo.fundingRound,
      fundingDate: fundingInfo.fundingDate,
      investors: fundingInfo.investors,
      companyWebsite: companyInfo.companyWebsite,
      location: companyInfo.location,
      employeeCount: companyInfo.employeeCount,
      foundingDate: companyInfo.foundingDate,
      industryTags: companyInfo.industryTags
    };
  } catch (error) {
    console.error('Error fetching full description:', error);
    return {
      companyInfo: '',
      description: '',
      fundingInfo: '',
      industryTags: []
    };
  }
}

// 添加字符串长度限制函数
function truncateString(str: string | undefined, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

const handler: Handler = async (event) => {
  try {
    console.log('Starting AI project search...');
    let allResults: SearchResultItem[] = [];

    // 执行每个来源的搜索
    for (const source of searchSources) {
      console.log(`Searching ${source.name}...`);
      const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
      searchUrl.searchParams.append('key', GOOGLE_API_KEY);
      searchUrl.searchParams.append('cx', GOOGLE_CX);
      searchUrl.searchParams.append('q', source.query);
      searchUrl.searchParams.append('dateRestrict', 'd90'); // 限制在最近90天内
      searchUrl.searchParams.append('num', '10');
      searchUrl.searchParams.append('fields', 'items(title,snippet,link,pagemap(metatags,article))');

      try {
        const response = await fetch(searchUrl.toString());
        if (!response.ok) {
          console.error(`Error searching ${source.name}:`, response.statusText);
          continue;
        }

        const searchResults: GoogleSearchResult = await response.json();
        if (searchResults.items) {
          // 为每个结果添加来源权重
          const weightedResults = searchResults.items.map(item => ({
            ...item,
            weight: source.weight
          }));
          allResults = [...allResults, ...weightedResults];
        }
      } catch (error) {
        console.error(`Error searching ${source.name}:`, error);
      }
    }

    if (allResults.length === 0) {
      console.log('No search results found');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '没有找到新的AI项目', count: 0 }),
      };
    }

    console.log(`Found ${allResults.length} total results before processing`);

    // 去重并按权重排序
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.link, item])).values()
    ).sort((a, b) => (b as any).weight - (a as any).weight);

    console.log(`${uniqueResults.length} unique results after deduplication`);

    // 处理搜索结果
    const processedResults = await Promise.all(
      uniqueResults.map(async (item) => {
        const projectInfo = await getFullProjectDescription(item);
        return {
          project_name: truncateString(extractProjectName(item.title), 255),
          description: projectInfo.description,          // TEXT类型，无需截断
          company_info: projectInfo.companyInfo,        // TEXT类型，无需截断
          funding_info: projectInfo.fundingInfo,        // TEXT类型，无需截断
          source_url: truncateString(item.link, 512),
          company_website: truncateString(projectInfo.companyWebsite, 512),
          funding_amount: truncateString(projectInfo.fundingAmount, 255),
          funding_round: truncateString(projectInfo.fundingRound, 255),
          funding_date: projectInfo.fundingDate,
          investors: projectInfo.investors || [],
          company_location: truncateString(projectInfo.location, 255),
          industry_tags: projectInfo.industryTags,
          employee_count: truncateString(projectInfo.employeeCount, 255),
          founding_date: projectInfo.foundingDate,
          created_at: new Date().toISOString()
        };
      })
    );

    // 过滤结果
    const validResults = processedResults.filter(result => 
      (result.description.length >= 100 || result.company_info.length >= 100) &&
      result.funding_info.length > 0 &&
      /2024|2025/.test(result.funding_info) &&
      !result.description.toLowerCase().includes('privacy policy')
    );

    console.log(`${validResults.length} valid results after filtering`);

    if (validResults.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '没有找到合适的AI项目描述', count: 0 }),
      };
    }

    // 保存到Supabase
    const { data, error } = await supabase
      .from('ai_funding')
      .upsert(
        validResults,
        {
          onConflict: 'project_name',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '成功更新AI项目数据',
        count: validResults.length,
        data: validResults,
      }),
    };
  } catch (error) {
    console.error('Error in search-ai-funding:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '搜索AI项目失败' }),
    };
  }
};

export { handler }; 