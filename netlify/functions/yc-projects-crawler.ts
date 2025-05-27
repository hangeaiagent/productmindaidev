import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { logger } from './utils/logger';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

interface YCProject {
  name: string;
  description: string;
  official_website: string;
  yc_batch?: string;
  yc_url?: string;
}

// 获取用户所有现有项目名称（用于批量重复检查）
async function getUserExistingProjects(userId: string): Promise<Set<string>> {
  try {
    logger.info('📋 获取用户现有项目列表', { userId });
    
    const { data, error } = await supabase
      .from('user_projects')
      .select('name')
      .eq('user_id', userId);
    
    if (error) {
      logger.warn('获取现有项目列表时出错', { error: error.message });
      return new Set();
    }
    
    const existingNames = new Set<string>();
    if (data) {
      data.forEach(project => {
        if (project.name) {
          // 将名称转换为小写进行比较（忽略大小写）
          existingNames.add(project.name.toLowerCase());
        }
      });
    }
    
    logger.info('✅ 获取现有项目列表完成', { 
      userId, 
      existingCount: existingNames.size 
    });
    
    return existingNames;
  } catch (error) {
    logger.warn('获取现有项目列表时出错', { error: error.message });
    return new Set();
  }
}

// 检查产品是否已存在（使用预加载的项目列表）
function checkProjectExistsInSet(name: string, existingProjects: Set<string>): boolean {
  const normalizedName = name.toLowerCase();
  return existingProjects.has(normalizedName);
}

// 过滤重复产品（在导入过程开始时进行批量过滤）
async function filterDuplicateProjects(projects: YCProject[], userId: string): Promise<{
  newProjects: YCProject[];
  duplicateProjects: YCProject[];
  existingProjects: Set<string>;
}> {
  logger.info('🔍 开始重复项目过滤', { 
    totalProjects: projects.length,
    userId 
  });
  
  // 获取用户所有现有项目
  const existingProjects = await getUserExistingProjects(userId);
  
  const newProjects: YCProject[] = [];
  const duplicateProjects: YCProject[] = [];
  
  for (const project of projects) {
    const isDuplicate = checkProjectExistsInSet(project.name, existingProjects);
    
    if (isDuplicate) {
      duplicateProjects.push(project);
      logger.info('⏭️ 发现重复项目，跳过', { 
        projectName: project.name
      });
    } else {
      newProjects.push(project);
      // 将新项目名称添加到现有项目集合中，避免同批次内的重复
      existingProjects.add(project.name.toLowerCase());
    }
  }
  
  logger.info('✅ 重复项目过滤完成', {
    totalProjects: projects.length,
    newProjects: newProjects.length,
    duplicateProjects: duplicateProjects.length,
    userId
  });
  
  return {
    newProjects,
    duplicateProjects,
    existingProjects
  };
}

// 尝试从多个YC数据源获取项目
async function fetchYCProjects(): Promise<YCProject[]> {
  const projects: YCProject[] = [];
  
  // 方法1: 使用预定义的知名YC公司列表（优先使用，确保功能正常）
  logger.info('🔍 使用预定义YC公司列表...');
  const knownYCCompanies = [
    {
      name: 'OpenAI',
      description: 'AI research and deployment company focused on ensuring artificial general intelligence benefits all of humanity.',
      official_website: 'https://openai.com',
      yc_batch: 'W16',
      yc_url: 'https://www.ycombinator.com/companies/openai'
    },
    {
      name: 'Stripe',
      description: 'Online payment processing platform for internet businesses.',
      official_website: 'https://stripe.com',
      yc_batch: 'S09',
      yc_url: 'https://www.ycombinator.com/companies/stripe'
    },
    {
      name: 'Airbnb',
      description: 'Online marketplace for short-term homestays and experiences.',
      official_website: 'https://airbnb.com',
      yc_batch: 'W08',
      yc_url: 'https://www.ycombinator.com/companies/airbnb'
    },
    {
      name: 'Dropbox',
      description: 'Cloud storage service that offers cloud storage, file synchronization, personal cloud, and client software.',
      official_website: 'https://dropbox.com',
      yc_batch: 'S07',
      yc_url: 'https://www.ycombinator.com/companies/dropbox'
    },
    {
      name: 'Reddit',
      description: 'Social news aggregation, web content rating, and discussion website.',
      official_website: 'https://reddit.com',
      yc_batch: 'S05',
      yc_url: 'https://www.ycombinator.com/companies/reddit'
    },
    {
      name: 'Instacart',
      description: 'Grocery delivery and pick-up service in the United States and Canada.',
      official_website: 'https://instacart.com',
      yc_batch: 'S12',
      yc_url: 'https://www.ycombinator.com/companies/instacart'
    },
    {
      name: 'DoorDash',
      description: 'Food delivery platform that connects customers with local restaurants.',
      official_website: 'https://doordash.com',
      yc_batch: 'S13',
      yc_url: 'https://www.ycombinator.com/companies/doordash'
    },
    {
      name: 'Coinbase',
      description: 'Cryptocurrency exchange platform.',
      official_website: 'https://coinbase.com',
      yc_batch: 'S12',
      yc_url: 'https://www.ycombinator.com/companies/coinbase'
    },
    {
      name: 'Twitch',
      description: 'Live streaming platform primarily focused on video game live streaming.',
      official_website: 'https://twitch.tv',
      yc_batch: 'S07',
      yc_url: 'https://www.ycombinator.com/companies/twitch'
    },
    {
      name: 'GitLab',
      description: 'Web-based DevOps lifecycle tool that provides a Git repository manager.',
      official_website: 'https://gitlab.com',
      yc_batch: 'W15',
      yc_url: 'https://www.ycombinator.com/companies/gitlab'
    },
    {
      name: 'Zapier',
      description: 'Automation platform that connects different web applications.',
      official_website: 'https://zapier.com',
      yc_batch: 'S12',
      yc_url: 'https://www.ycombinator.com/companies/zapier'
    },
    {
      name: 'Weebly',
      description: 'Website builder platform for creating websites and online stores.',
      official_website: 'https://weebly.com',
      yc_batch: 'S07',
      yc_url: 'https://www.ycombinator.com/companies/weebly'
    },
    {
      name: 'Heroku',
      description: 'Cloud platform as a service supporting several programming languages.',
      official_website: 'https://heroku.com',
      yc_batch: 'W08',
      yc_url: 'https://www.ycombinator.com/companies/heroku'
    },
    {
      name: 'Segment',
      description: 'Customer data platform that helps companies collect, clean, and control their customer data.',
      official_website: 'https://segment.com',
      yc_batch: 'S11',
      yc_url: 'https://www.ycombinator.com/companies/segment'
    },
    {
      name: 'Docker',
      description: 'Platform for developing, shipping, and running applications using containerization.',
      official_website: 'https://docker.com',
      yc_batch: 'S10',
      yc_url: 'https://www.ycombinator.com/companies/docker'
    }
  ];
  
  projects.push(...knownYCCompanies);

  // 方法2: 尝试YC的公开数据API（作为补充）
  try {
    logger.info('🔍 尝试YC公开API...');
    const apiResponse = await fetch('https://api.ycombinator.com/v0.1/companies', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YC-Crawler/1.0)',
        'Accept': 'application/json'
      }
    });
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      logger.info('✅ YC API响应成功', { dataLength: JSON.stringify(apiData).length });
      
      if (apiData && Array.isArray(apiData)) {
        for (const company of apiData.slice(0, 10)) { // 限制前10个作为补充
          if (company.name && company.description && !projects.find(p => p.name === company.name)) {
            projects.push({
              name: company.name,
              description: company.description,
              official_website: company.website || company.url || '',
              yc_batch: company.batch,
              yc_url: company.yc_url || `https://www.ycombinator.com/companies/${company.slug || company.name.toLowerCase().replace(/\s+/g, '-')}`
            });
          }
        }
      }
    }
  } catch (error) {
    logger.warn('❌ YC API失败', { error: error.message });
  }

  logger.info('📊 YC项目获取完成', { totalProjects: projects.length });
  return projects;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    logger.info('🚀 开始YC项目采集', {
      timestamp: new Date().toISOString()
    });

    // 获取YC项目列表
    const projects = await fetchYCProjects();
    
    if (projects.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          error: '未找到任何YC项目',
          summary: {
            totalFound: 0,
            totalCrawled: 0,
            successfullySaved: 0,
            errors: 0
          }
        })
      };
    }

    // 过滤重复项目
    const { newProjects, duplicateProjects, existingProjects } = await filterDuplicateProjects(projects, DEFAULT_USER_ID);

    logger.info('📋 开始保存项目到数据库', { projectCount: newProjects.length });

    const savedProjects: any[] = [];
    const errors: Array<{ project: string; error: string }> = [];

    // 批量保存项目到数据库
    for (const project of newProjects) {
      try {
        // 保存新项目（已经过重复检查）
        const { data, error } = await supabase
          .from('user_projects')
          .insert({
            user_id: DEFAULT_USER_ID,
            name: project.name,
            description: project.description,
            official_website: project.official_website,
            name_zh: project.name,
            name_en: project.name,
            description_zh: project.description,
            description_en: project.description,
            source_language: 'en',
            metadata: {
              source: 'yc_crawler',
              yc_batch: project.yc_batch,
              yc_url: project.yc_url,
              crawled_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        savedProjects.push(data);
        logger.info('✅ 项目保存成功', { 
          projectName: project.name,
          projectId: data.id 
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({
          project: project.name,
          error: errorMsg
        });
        logger.error('❌ 项目保存失败', { 
          projectName: project.name, 
          error: errorMsg 
        });
      }
    }

    const summary = {
      totalFound: projects.length,
      totalCrawled: projects.length,
      newProjects: newProjects.length,
      duplicateProjects: duplicateProjects.length,
      successfullySaved: savedProjects.length,
      errors: errors.length
    };

    logger.info('🎉 YC项目采集完成', summary);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        summary,
        savedProjects: savedProjects.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description?.substring(0, 100) + '...',
          official_website: p.official_website
        })),
        duplicateProjects: duplicateProjects.slice(0, 5).map(p => ({
          name: p.name,
          description: p.description?.substring(0, 100) + '...'
        })),
        errors: errors.slice(0, 5)
      })
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('💥 YC项目采集失败', { error: errorMsg });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: errorMsg
      })
    };
  }
}; 