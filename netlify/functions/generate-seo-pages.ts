import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 25个产品管理模板 - 中文版
const productTemplatesCN = [
  'PRD-产品需求文档', 'MRD-市场需求文档', 'BRD-商业需求文档',
  '竞品分析报告', '用户画像分析', '用户体验地图', '产品路线图',
  '功能优先级矩阵', 'SWOT分析', '商业模式画布', '价值主张画布',
  '用户故事地图', 'MVP定义文档', '产品度量指标', '产品发布计划',
  '产品运营策略', '用户反馈分析', '产品迭代计划', '技术架构文档',
  '数据分析报告', '产品测试方案', '上线检查清单', '产品复盘报告',
  '市场策略文档', '产品风险评估'
];

// 25个产品管理模板 - 英文版
const productTemplatesEN = [
  'PRD-Product Requirements Document', 'MRD-Market Requirements Document', 'BRD-Business Requirements Document',
  'Competitive Analysis Report', 'User Persona Analysis', 'User Experience Map', 'Product Roadmap',
  'Feature Priority Matrix', 'SWOT Analysis', 'Business Model Canvas', 'Value Proposition Canvas',
  'User Story Map', 'MVP Definition Document', 'Product Metrics', 'Product Launch Plan',
  'Product Operations Strategy', 'User Feedback Analysis', 'Product Iteration Plan', 'Technical Architecture Document',
  'Data Analysis Report', 'Product Testing Plan', 'Launch Checklist', 'Product Retrospective Report',
  'Market Strategy Document', 'Product Risk Assessment'
];

interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  primary_category: string;
  secondary_category: string;
  created_at: string;
}

interface LanguageConfig {
  lang: string;
  langCode: string;
  templates: string[];
  texts: {
    title: string;
    subtitle: string;
    productOverview: string;
    downloadCenter: string;
    downloadAll: string;
    downloadTemplate: string;
    professionalTemplates: string;
    freeDownload: string;
    onlineAccess: string;
    unlimitedUse: string;
    breadcrumbHome: string;
    footerTitle: string;
    footerDescription: string;
    copyright: string;
  };
}

const languageConfigs: Record<string, LanguageConfig> = {
  zh: {
    lang: '中文',
    langCode: 'zh-CN',
    templates: productTemplatesCN,
    texts: {
      title: 'AI产品管理文档 | 免费下载25个模板',
      subtitle: '专业AI产品管理文档包 | 25个精品模板免费下载',
      productOverview: '产品概述',
      downloadCenter: '📦 文档模板下载中心',
      downloadAll: '🚀 一键下载全部文档 (ZIP格式)',
      downloadTemplate: '📥 下载此模板',
      professionalTemplates: '专业模板',
      freeDownload: '免费下载',
      onlineAccess: '在线访问',
      unlimitedUse: '无限使用',
      breadcrumbHome: '首页',
      footerTitle: 'AI产品管理平台',
      footerDescription: '专注于提供最专业的AI产品管理文档和模板服务',
      copyright: '© 2025 AI产品管理平台. 保留所有权利.'
    }
  },
  en: {
    lang: 'English',
    langCode: 'en-US',
    templates: productTemplatesEN,
    texts: {
      title: 'AI Product Management Docs | Free Download 25 Templates',
      subtitle: 'Professional AI Product Management Document Package | 25 Premium Templates Free Download',
      productOverview: 'Product Overview',
      downloadCenter: '📦 Document Template Download Center',
      downloadAll: '🚀 Download All Documents (ZIP Format)',
      downloadTemplate: '📥 Download Template',
      professionalTemplates: 'Professional Templates',
      freeDownload: 'Free Download',
      onlineAccess: 'Online Access',
      unlimitedUse: 'Unlimited Use',
      breadcrumbHome: 'Home',
      footerTitle: 'AI Product Management Platform',
      footerDescription: 'Dedicated to providing the most professional AI product management documents and template services',
      copyright: '© 2025 AI Product Management Platform. All rights reserved.'
    }
  }
};

// 生成产品概要
function generateProductSummary(project: Project, language: string = 'zh'): string {
  const cleanName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '').trim();
  const category = project.primary_category || (language === 'zh' ? 'AI产品' : 'AI Product');
  const subCategory = project.secondary_category || (language === 'zh' ? '智能应用' : 'Smart Application');
  
  if (language === 'zh') {
    return `
      <p><strong>🎯 产品核心价值：</strong>${cleanName}是一款${category}领域的创新AI产品，专注于${subCategory}相关功能的优化和提升。</p>
      <p><strong>🚀 主要功能特点：</strong></p>
      <ul>
          <li>✨ 智能化的产品管理流程优化</li>
          <li>📚 完整的文档模板体系支持</li>
          <li>📊 数据驱动的决策分析能力</li>
          <li>👥 团队协作和项目管理功能</li>
          <li>🤖 AI智能辅助和自动化特性</li>
      </ul>
      <p><strong>💼 应用场景：</strong>适用于产品经理、项目经理、创业团队等需要专业产品管理文档的用户群体。</p>
    `;
  } else {
    return `
      <p><strong>🎯 Core Product Value:</strong> ${cleanName} is an innovative AI product in the ${category} field, focusing on optimizing ${subCategory}-related functions.</p>
      <p><strong>🚀 Main Features:</strong></p>
      <ul>
          <li>✨ Intelligent product management process optimization</li>
          <li>📚 Complete document template system support</li>
          <li>📊 Data-driven decision analysis capabilities</li>
          <li>👥 Team collaboration and project management functions</li>
          <li>🤖 AI intelligent assistance and automation features</li>
      </ul>
      <p><strong>💼 Application Scenarios:</strong> Suitable for product managers, project managers, startup teams who need professional product management documents.</p>
    `;
  }
}

// 生成SEO优化的HTML页面
function generateProductPage(project: Project, summary: string, language: string = 'zh'): string {
  const config = languageConfigs[language];
  const cleanName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '').trim();
  const pageTitle = `${cleanName} - ${config.texts.title}`;
  const metaDescription = language === 'zh' 
    ? `${cleanName}产品管理完整文档包，包含PRD、MRD、BRD等25个专业模板。AI智能生成，助力产品成功。`
    : `${cleanName} complete product management document package, including 25 professional templates such as PRD, MRD, BRD. AI-generated to help product success.`;
  const keywords = language === 'zh'
    ? `${cleanName}, AI产品, 产品管理, PRD文档, 产品需求文档, ${project.primary_category}, ${project.secondary_category}`
    : `${cleanName}, AI Product, Product Management, PRD Document, Product Requirements Document, ${project.primary_category}, ${project.secondary_category}`;
  
  const baseUrl = 'https://ai-products.netlify.app';
  const langPrefix = language === 'en' ? '/en' : '';
  const otherLang = language === 'zh' ? 'en' : 'zh';
  const otherLangPrefix = language === 'zh' ? '/en' : '';
  
  return `<!DOCTYPE html>
<html lang="${config.langCode}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    
    <!-- SEO Meta Tags -->
    <title>${pageTitle}</title>
    <meta name="description" content="${metaDescription}">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="${config.texts.footerTitle}">
    
    <!-- Language and Alternate Links -->
    <link rel="alternate" href="${baseUrl}${langPrefix}/products/${project.id}" hreflang="${config.langCode}">
    <link rel="alternate" href="${baseUrl}${otherLangPrefix}/products/${project.id}" hreflang="${languageConfigs[otherLang].langCode}">
    
    <!-- Open Graph Tags -->
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${baseUrl}${langPrefix}/products/${project.id}">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${baseUrl}${langPrefix}/products/${project.id}">
    
    <!-- CSS -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: #f8fafc;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 0;
            text-align: center;
            position: relative;
        }
        
        .lang-switcher {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }
        
        .lang-switcher a {
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 20px;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        
        .lang-switcher a:hover {
            background: rgba(255,255,255,0.2);
        }
        
        .lang-switcher .active {
            background: rgba(255,255,255,0.3);
        }
        
        .header h1 {
            font-size: clamp(2rem, 5vw, 3rem);
            margin: 0 0 16px 0;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            font-size: 1.25rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .breadcrumb {
            background: white;
            padding: 16px 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 0.9rem;
        }
        
        .breadcrumb a {
            color: #4299e1;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        
        .breadcrumb a:hover {
            color: #2b6cb0;
        }
        
        .main-content {
            margin: 30px auto;
        }
        
        .product-info {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
            margin-bottom: 30px;
        }
        
        .product-info h2 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 1.75rem;
            border-bottom: 3px solid #4299e1;
            padding-bottom: 10px;
        }
        
        .summary {
            background: #f7fafc;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #4299e1;
            margin: 20px 0;
        }
        
        .summary ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .summary li {
            margin: 8px 0;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            text-align: center;
            padding: 25px;
            background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
            border-radius: 12px;
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #4299e1;
            margin-bottom: 5px;
        }
        
        .download-section {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
        }
        
        .download-all-btn {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: 700;
            width: 100%;
            margin: 25px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
        }
        
        .download-all-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
        }
        
        .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin: 30px 0;
        }
        
        .template-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 25px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .template-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border-color: #4299e1;
        }
        
        .template-card h3 {
            color: #2d3748;
            margin-bottom: 12px;
            font-size: 1.1rem;
        }
        
        .template-card p {
            color: #718096;
            margin-bottom: 20px;
            font-size: 0.95rem;
        }
        
        .download-btn {
            background: #48bb78;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .download-btn:hover {
            background: #38a169;
            transform: translateY(-1px);
        }
        
        .footer {
            background: #2d3748;
            color: white;
            padding: 50px 0;
            text-align: center;
            margin-top: 80px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 15px;
            }
            
            .product-info,
            .download-section {
                padding: 25px;
            }
            
            .template-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .lang-switcher {
                position: static;
                justify-content: center;
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="lang-switcher">
            <a href="${baseUrl}/products/${project.id}" class="${language === 'zh' ? 'active' : ''}">中文</a>
            <a href="${baseUrl}/en/products/${project.id}" class="${language === 'en' ? 'active' : ''}">English</a>
        </div>
        <div class="container">
            <h1>${cleanName}</h1>
            <p class="subtitle">${config.texts.subtitle}</p>
        </div>
    </header>
    
    <nav class="breadcrumb">
        <div class="container">
            <a href="${langPrefix}/">${config.texts.breadcrumbHome}</a> > 
            <a href="${langPrefix}/category/${encodeURIComponent(project.primary_category)}">${project.primary_category}</a> > 
            <span>${cleanName}</span>
        </div>
    </nav>
    
    <div class="container">
        <div class="main-content">
            <article class="product-info">
                <h2>${config.texts.productOverview}</h2>
                <p>${project.description || (language === 'zh' ? '这是一款创新的AI产品，为您提供专业的产品管理解决方案。' : 'This is an innovative AI product that provides professional product management solutions.')}</p>
                
                <div class="summary">
                    ${summary}
                </div>
                
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">25</div>
                        <div>${config.texts.professionalTemplates}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">100%</div>
                        <div>${config.texts.freeDownload}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">24/7</div>
                        <div>${config.texts.onlineAccess}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">∞</div>
                        <div>${config.texts.unlimitedUse}</div>
                    </div>
                </div>
            </article>
            
            <section class="download-section">
                <h2>${config.texts.downloadCenter}</h2>
                <p>${language === 'zh' ? '获取完整的产品管理文档包，包含25个由资深产品经理精心设计的专业模板：' : 'Get the complete product management document package, including 25 professional templates carefully designed by senior product managers:'}</p>
                
                <button class="download-all-btn" onclick="downloadAll('${language}')">
                    ${config.texts.downloadAll}
                </button>
                
                <div class="template-grid">
                    ${config.templates.map((template, index) => `
                        <div class="template-card">
                            <h3>📄 ${template}</h3>
                            <p>${language === 'zh' ? `专业的${template}模板，包含完整的框架结构和填写指南` : `Professional ${template} template with complete framework structure and filling guide`}</p>
                            <button class="download-btn" onclick="downloadTemplate('${template}', ${index + 1}, '${language}')">
                                ${config.texts.downloadTemplate}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </section>
        </div>
    </div>
    
    <footer class="footer">
        <div class="container">
            <h3>${config.texts.footerTitle}</h3>
            <p>${config.texts.footerDescription}</p>
            <p style="margin-top: 20px; opacity: 0.8;">${config.texts.copyright}</p>
        </div>
    </footer>
    
    <script>
        function downloadTemplate(templateName, index, language) {
            const content = generateTemplateContent(templateName, language);
            downloadFile(\`\${templateName}.md\`, content);
        }
        
        function downloadAll(language) {
            const templates = ${JSON.stringify(config.templates)};
            templates.forEach((template, index) => {
                setTimeout(() => {
                    const content = generateTemplateContent(template, language);
                    downloadFile(\`\${template}.md\`, content);
                }, index * 100);
            });
        }
        
        function generateTemplateContent(templateName, language) {
            const currentTime = new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
            const isZh = language === 'zh';
            
            return \`# \${templateName}

## \${isZh ? '📋 基本信息' : '📋 Basic Information'}
- **\${isZh ? '产品名称' : 'Product Name'}**: ${cleanName}
- **\${isZh ? '分类' : 'Category'}**: ${project.primary_category} > ${project.secondary_category}
- **\${isZh ? '生成时间' : 'Generated Time'}**: \${currentTime}
- **\${isZh ? '模板版本' : 'Template Version'}**: v1.0

## \${isZh ? '📖 模板说明' : '📖 Template Description'}
\${isZh 
  ? \`这是一个专业的\${templateName}模板，专为${cleanName}项目定制。\`
  : \`This is a professional \${templateName} template customized for ${cleanName} project.\`
}

## \${isZh ? '🎯 使用指南' : '🎯 Usage Guide'}
\${isZh ? '1. 根据项目需求填写相关内容' : '1. Fill in relevant content according to project needs'}
\${isZh ? '2. 参考示例进行调整和优化' : '2. Adjust and optimize with reference to examples'}
\${isZh ? '3. 与团队成员共享和协作' : '3. Share and collaborate with team members'}

---
© 2025 ${config.texts.footerTitle}
\`;
        }
        
        function downloadFile(filename, content) {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(content));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    </script>
</body>
</html>`;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  console.log('🚀 开始生成中英双语SEO优化的AI产品页面...');
  
  try {
    const { queryStringParameters } = event;
    const projectId = queryStringParameters?.id;
    const language = queryStringParameters?.lang || 'zh';
    const limit = parseInt(queryStringParameters?.limit || '10');
    
    // 验证语言参数
    if (!['zh', 'en'].includes(language)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Unsupported language. Use "zh" or "en".' })
      };
    }
    
    let projects: Project[];
    
    if (projectId) {
      // 生成单个项目页面
      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error || !data) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: language === 'zh' ? '项目不存在' : 'Project not found' })
        };
      }
      
      projects = [data as Project];
    } else {
      // 获取所有项目
      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .not('name', 'is', null)
        .not('name', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`获取项目数据失败: ${error.message}`);
      }
      
      projects = (data as Project[]) || [];
    }
    
    console.log(`📊 找到 ${projects.length} 个项目，语言: ${language}`);
    
    const generatedPages: Array<{
      id: string;
      name: string;
      language: string;
      title: string;
      url: string;
    }> = [];
    
    for (const project of projects) {
      try {
        const summary = generateProductSummary(project, language);
        const htmlContent = generateProductPage(project, summary, language);
        
        generatedPages.push({
          id: project.id,
          name: project.name,
          language,
          title: `${project.name} - ${language === 'zh' ? 'AI产品管理文档' : 'AI Product Management Docs'}`,
          url: `${language === 'en' ? '/en' : ''}/products/${project.id}`
        });
        
        console.log(`✅ 生成${language === 'zh' ? '中文' : '英文'}页面: ${project.name}`);
      } catch (pageError) {
        console.error(`❌ 生成页面失败 ${project.id}:`, pageError);
      }
    }
    
    // 如果是单个项目，直接返回HTML
    if (projectId && projects.length > 0) {
      const project = projects[0];
      const summary = generateProductSummary(project, language);
      const htmlContent = generateProductPage(project, summary, language);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Content-Language': language
        },
        body: htmlContent
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `${language === 'zh' ? '中英双语' : 'Bilingual'} SEO页面生成完成`,
        language,
        statistics: {
          totalGenerated: generatedPages.length,
          totalProjects: projects.length
        },
        pages: generatedPages.map(page => ({
          id: page.id,
          name: page.name,
          language: page.language,
          title: page.title,
          url: page.url
        }))
      })
    };
    
  } catch (error) {
    console.error('❌ 生成失败:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'SEO页面生成失败 / SEO page generation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
