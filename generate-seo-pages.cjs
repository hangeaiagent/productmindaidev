#!/usr/bin/env node

/**
 * 生成AI产品项目详情页面的静态SEO页面
 * 针对user_projects表中primary_category不为空的项目
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase配置 - 从环境变量获取
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// 验证必需的环境变量
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必需的环境变量');
  console.error('请设置以下环境变量:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('\n您可以创建 .env 文件或使用以下命令设置:');
  console.error('export VITE_SUPABASE_URL="your_supabase_url"');
  console.error('export VITE_SUPABASE_ANON_KEY="your_supabase_key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 配置
const OUTPUT_DIR = './static-pages';
const PUBLIC_BASE_URL = 'https://productmindai.com';

/**
 * 获取项目的模板数据
 */
async function getProjectTemplates(projectId) {
  try {
    const { data: templates, error } = await supabase
      .from('template_versions')
      .select(`
        *,
        templates:template_id (
          id,
          name_en,
          name_zh,
          description_en,
          description_zh,
          category_id
        )
      `)
      .eq('project_id', projectId)
      .not('output_content_zh', 'is', null);

    if (error) {
      console.warn(`获取项目 ${projectId} 的模板失败:`, error);
      return [];
    }

    return templates?.map(tv => ({
      id: tv.template_id,
      name: tv.templates?.name_zh || tv.templates?.name_en,
      name_zh: tv.templates?.name_zh,
      name_en: tv.templates?.name_en,
      description: tv.templates?.description_zh || tv.templates?.description_en,
      description_zh: tv.templates?.description_zh,
      description_en: tv.templates?.description_en,
      category: tv.templates?.category_id || '通用模板',
      version_id: tv.id,
      output_content_zh: tv.output_content_zh,
      output_content_en: tv.output_content_en
    })) || [];
  } catch (error) {
    console.error(`获取项目 ${projectId} 模板异常:`, error);
    return [];
  }
}

/**
 * 获取分类信息
 */
async function getCategoryInfo(categoryCode) {
  if (!categoryCode) return null;
  
  try {
    const { data: category, error } = await supabase
      .from('user_projectscategory')
      .select('*')
      .eq('category_code', categoryCode)
      .single();

    if (error) {
      console.warn(`获取分类 ${categoryCode} 信息失败:`, error);
      return null;
    }

    return category;
  } catch (error) {
    console.error(`获取分类 ${categoryCode} 异常:`, error);
    return null;
  }
}

/**
 * 获取模板分类数据（只显示isshow=1的分类）
 */
async function getTemplateCategoriesWithTemplates(projectId) {
  try {
    // 获取所有isshow=1的分类
    const { data: categories, error: categoriesError } = await supabase
      .from('template_categories')
      .select('*')
      .eq('isshow', 1)
      .order('name_zh');

    if (categoriesError) {
      console.warn('获取模板分类失败:', categoriesError);
      return [];
    }

    // 获取项目的模板，关联模板分类信息
    const { data: templates, error: templatesError } = await supabase
      .from('template_versions')
      .select(`
        *,
        templates:template_id (
          id,
          name_en,
          name_zh,
          description_en,
          description_zh,
          category_id,
          template_categories:category_id (
            id,
            name_zh,
            name_en,
            isshow
          )
        )
      `)
      .eq('project_id', projectId)
      .not('output_content_zh', 'is', null);

    if (templatesError) {
      console.warn('获取项目模板失败:', templatesError);
      return [];
    }

    // 组织数据：只返回isshow=1的分类及其对应的模板
    const result = categories.map(category => {
      const categoryTemplates = templates?.filter(tv => 
        tv.templates?.template_categories?.id === category.id &&
        tv.templates?.template_categories?.isshow === 1
      ) || [];

      return {
        id: category.id,
        name: category.name_zh || category.name_en || '未命名分类',
        name_zh: category.name_zh,
        name_en: category.name_en,
        templates: categoryTemplates.map(tv => ({
          id: tv.template_id,
          name: tv.templates?.name_zh || tv.templates?.name_en || '未命名模板',
          name_zh: tv.templates?.name_zh,
          name_en: tv.templates?.name_en,
          description: tv.templates?.description_zh || tv.templates?.description_en,
          description_zh: tv.templates?.description_zh,
          description_en: tv.templates?.description_en,
          category_name: category.name_zh || category.name_en,
          version_id: tv.id,
          output_content_zh: tv.output_content_zh,
          output_content_en: tv.output_content_en
        }))
      };
    }).filter(category => category.templates.length > 0); // 只返回有模板的分类

    return result;
  } catch (error) {
    console.error('获取模板分类数据异常:', error);
    return [];
  }
}

/**
 * 生成模板分类网格
 */
function generateTemplateCategoryGrid(categoriesWithTemplates) {
  if (!categoriesWithTemplates || categoriesWithTemplates.length === 0) {
    return '<p style="text-align: center; color: rgba(255,255,255,0.8);">暂无可用的模板分类</p>';
  }
  
  return categoriesWithTemplates.map(category => `
    <div class="category-card">
        <div class="category-icon">
            <svg viewBox="0 0 24 24">
                <path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19Z"/>
            </svg>
        </div>
        <h3 class="category-name">${category.name}</h3>
        <p class="category-count">${category.templates.length} 个模板</p>
    </div>
  `).join('');
}

/**
 * 生成模板网格（基于分类数据）
 */
function generateTemplateGrid(categoriesWithTemplates, projectId) {
  // 提取所有模板
  const allTemplates = categoriesWithTemplates.flatMap(category => category.templates);
  
  if (!allTemplates || allTemplates.length === 0) {
    return `
      <div class="no-templates">
        <svg viewBox="0 0 24 24" class="no-templates-icon">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
        </svg>
        <h3>暂无模板</h3>
        <p>该项目还没有生成模板内容，或者模板分类未启用显示</p>
      </div>
    `;
  }

  return allTemplates.map(template => `
    <div class="template-card">
        <div class="template-header">
            <div>
                <h3 class="template-name">${template.name}</h3>
            </div>
            <div class="template-type">${template.category_name}</div>
        </div>
        <p class="template-description">${(template.description || '暂无描述').substring(0, 120)}...</p>
        <div class="template-actions">
            <button class="btn-view-details" onclick="viewTemplateDetails('${projectId}', '${template.version_id}')">
                <svg viewBox="0 0 24 24">
                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                </svg>
                查看详情
            </button>
        </div>
    </div>
  `).join('');
}

/**
 * 生成单个项目的SEO页面
 */
async function generateProjectPage(projectId, isDemo = false) {
  try {
    console.log(`🔄 开始处理项目: ${projectId}`);

    // 获取项目信息
    const { data: project, error: projectError } = await supabase
      .from('user_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`项目不存在或获取失败: ${projectError?.message}`);
    }

    // 获取模板分类数据（只包含isshow=1的分类）
    const categoriesWithTemplates = await getTemplateCategoriesWithTemplates(projectId);
    
    // 获取分类信息
    const categoryInfo = await getCategoryInfo(project.primary_category_code);

    // 生成HTML内容
    const htmlContent = generateSEOTemplate(project, categoriesWithTemplates, categoryInfo);

    if (isDemo) {
      // 演示模式，直接返回HTML内容
      return { project, categoriesWithTemplates, categoryInfo, htmlContent };
    } else {
      // 创建输出目录
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      // 写入文件 - 新规则：/static-pages/pdhtml/<项目ID>/index.html
      const projectDir = path.join(OUTPUT_DIR, 'pdhtml', projectId);
      const fileName = 'index.html';
      const filePath = path.join(projectDir, fileName);
      
      // 确保项目目录存在
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(filePath, htmlContent, 'utf8');

      const totalTemplates = categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0);
      console.log(`✅ 生成页面: ${fileName} (${totalTemplates} 个模板，${categoriesWithTemplates.length} 个分类)`);
      return { project, categoriesWithTemplates, categoryInfo, filePath };
    }

  } catch (error) {
    console.error(`❌ 处理项目 ${projectId} 失败:`, error);
    throw error;
  }
}

/**
 * 生成SEO优化的HTML模板
 */
function generateSEOTemplate(project, categoriesWithTemplates, categoryInfo) {
  const projectName = project.name_zh || project.name || '未命名项目';
  const projectDesc = project.description_zh || project.description || '暂无描述';
  const categoryName = categoryInfo?.category_name || '人工智能';
  const totalTemplates = categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0);
  
  // SEO关键词生成
  const keywords = [
    projectName,
    categoryName,
    'AI产品',
    '人工智能',
    '模板下载',
    '产品文档',
    '项目管理',
    'ProductMind AI'
  ].join(', ');

  // 结构化数据 (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": projectName,
    "description": projectDesc,
    "applicationCategory": categoryName,
    "operatingSystem": "Web",
    "url": `${PUBLIC_BASE_URL}/project/${project.id}`,
    "author": {
      "@type": "Organization",
      "name": "ProductMind AI",
      "url": "https://productmindai.com"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO基础标签 -->
    <title>${projectName} - ${categoryName}产品文档模板 | ProductMind AI</title>
    <meta name="description" content="${projectDesc.substring(0, 160)}...">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="ProductMind AI">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${PUBLIC_BASE_URL}/project/${project.id}">
    
    <!-- Open Graph标签 -->
    <meta property="og:title" content="${projectName} - AI产品文档模板">
    <meta property="og:description" content="${projectDesc}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${PUBLIC_BASE_URL}/project/${project.id}">
    <meta property="og:site_name" content="ProductMind AI">
    <meta property="og:locale" content="zh_CN">
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${projectName} - AI产品文档模板">
    <meta name="twitter:description" content="${projectDesc}">
    
    <!-- 结构化数据 -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
    
    <!-- 样式 -->
    <style>
        ${getAIProductStyles()}
    </style>
</head>
<body>
    <div class="ai-container">
        <!-- 导航栏 -->
        <nav class="ai-nav">
            <div class="nav-content">
                <div class="logo">
                    <svg class="logo-icon" viewBox="0 0 32 32">
                        <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#667eea"/>
                                <stop offset="100%" style="stop-color:#764ba2"/>
                            </linearGradient>
                        </defs>
                        <circle cx="16" cy="16" r="14" fill="url(#logoGradient)"/>
                        <path d="M12 10h8v2h-8v-2zm0 4h8v2h-8v-2zm0 4h6v2h-6v-2z" fill="white"/>
                    </svg>
                    <span class="logo-text">ProductMind AI</span>
                </div>
                <div class="nav-actions">
                    <a href="/" class="nav-link">首页</a>
                    <a href="/projects" class="nav-link">项目库</a>
                    <a href="/dashboard?projectId=${project.id}&isPublic=true" class="nav-link">控制台</a>
                </div>
            </div>
        </nav>

        <!-- 面包屑导航 -->
        <nav class="breadcrumb">
            <div class="breadcrumb-content">
                <a href="/">首页</a>
                <span class="separator">›</span>
                <a href="/projects">项目库</a>
                <span class="separator">›</span>
                <a href="/category/${project.primary_category_code}">${categoryName}</a>
                <span class="separator">›</span>
                <span class="current">${projectName}</span>
            </div>
        </nav>

        <!-- 主要内容 -->
        <main class="main-content">
            <!-- 项目头部 -->
            <header class="project-header">
                <div class="category-tag">${categoryName}</div>
                <h1 class="project-title">${projectName}</h1>
                <p class="project-description">${projectDesc}</p>
                
                <!-- 项目统计 -->
                <div class="project-stats">
                    <div class="stat-item">
                        <span class="stat-value">${totalTemplates}</span>
                        <span class="stat-label">模板数量</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${new Date(project.created_at).toLocaleDateString()}</span>
                        <span class="stat-label">创建时间</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">4.8★</span>
                        <span class="stat-label">用户评分</span>
                    </div>
                </div>
                
                <!-- 快速操作 -->
                <div class="quick-actions">
                    <a href="/dashboard?projectId=${project.id}&isPublic=true" class="btn-primary">
                        <svg viewBox="0 0 24 24">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                        </svg>
                        查看详情
                    </a>
                </div>
            </header>

            ${totalTemplates > 0 ? `
            <!-- 模板分类导航 -->
            <section class="template-categories">
                <h2 class="section-title">
                    <svg class="section-icon" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    模板分类
                </h2>
                <div class="category-grid">
                    ${generateTemplateCategoryGrid(categoriesWithTemplates)}
                </div>
            </section>
            ` : ''}

            <!-- 模板列表 -->
            <section class="template-list">
                <div class="list-header">
                    <h2 class="section-title">可用模板</h2>
                    ${totalTemplates > 0 ? `
                    <div class="list-actions">
                        <button class="btn-download-all" onclick="downloadAllTemplates('${project.id}')">
                            <svg viewBox="0 0 24 24">
                                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                            </svg>
                            下载全部模板
                        </button>
                        <button class="btn-download-mdc" onclick="downloadAllMDC('${project.id}')">
                            <svg viewBox="0 0 24 24">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            下载MDC文件
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div class="template-grid">
                    ${generateTemplateGrid(categoriesWithTemplates, project.id)}
                </div>
            </section>
        </main>

        <!-- 页脚 -->
        <footer class="ai-footer">
            <div class="footer-content">
                <div class="footer-main">
                    <div class="footer-section">
                        <h3>ProductMind AI</h3>
                        <p>智能产品管理平台，让产品管理更简单</p>
                    </div>
                    <div class="footer-section">
                        <h4>产品</h4>
                        <ul>
                            <li><a href="/templates">模板库</a></li>
                            <li><a href="/tools">AI工具</a></li>
                            <li><a href="/pricing">价格方案</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2025 ProductMind AI. 保留所有权利</p>
                    <div class="footer-links">
                        <a href="/privacy">隐私政策</a>
                        <a href="/terms">服务条款</a>
                        <a href="/sitemap.xml">网站地图</a>
                    </div>
                </div>
            </div>
        </footer>
    </div>

    <!-- JavaScript -->
    <script>
        ${getPageJavaScript()}
    </script>
</body>
</html>`;
}

/**
 * AI产品风格的CSS样式
 */
function getAIProductStyles() {
  return `
    :root {
        --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        --accent-color: #667eea;
        --text-primary: #1a202c;
        --text-secondary: #4a5568;
        --text-light: #718096;
        --bg-white: rgba(255, 255, 255, 0.95);
        --shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.15);
        --border-radius: 16px;
        --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
        background: var(--primary-gradient);
        min-height: 100vh;
        color: var(--text-primary);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
    }

    .ai-container { min-height: 100vh; display: flex; flex-direction: column; }

    .ai-nav {
        background: var(--bg-white);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding: 1rem 0;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .nav-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 700;
        font-size: 1.25rem;
        color: var(--text-primary);
        text-decoration: none;
    }

    .logo-icon { width: 32px; height: 32px; }

    .nav-actions { display: flex; gap: 2rem; }

    .nav-link {
        color: var(--text-secondary);
        text-decoration: none;
        font-weight: 500;
        transition: var(--transition);
    }

    .nav-link:hover { color: var(--accent-color); }

    .breadcrumb {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 0.75rem 0;
    }

    .breadcrumb-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .breadcrumb a {
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        transition: var(--transition);
    }

    .breadcrumb a:hover { color: white; }
    .breadcrumb .separator { color: rgba(255, 255, 255, 0.6); }
    .breadcrumb .current { color: white; font-weight: 500; }

    .main-content {
        flex: 1;
        max-width: 1200px;
        margin: 0 auto;
        padding: 3rem 2rem;
        width: 100%;
    }

    .project-header {
        background: var(--bg-white);
        backdrop-filter: blur(20px);
        border-radius: 24px;
        padding: 3rem;
        margin-bottom: 3rem;
        box-shadow: var(--shadow-lg);
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .project-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--primary-gradient);
    }

    .category-tag {
        display: inline-block;
        background: var(--primary-gradient);
        color: white;
        padding: 0.5rem 1.5rem;
        border-radius: 50px;
        font-size: 0.875rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .project-title {
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 800;
        background: var(--primary-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 1rem;
        line-height: 1.2;
    }

    .project-description {
        font-size: 1.25rem;
        color: var(--text-secondary);
        max-width: 800px;
        margin: 0 auto 2rem;
        line-height: 1.7;
    }

    .project-stats {
        display: flex;
        justify-content: center;
        gap: 3rem;
        margin: 2rem 0;
        flex-wrap: wrap;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        border-radius: var(--border-radius);
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        min-width: 120px;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--accent-color);
        margin-bottom: 0.25rem;
    }

    .stat-label {
        font-size: 0.875rem;
        color: var(--text-light);
        font-weight: 500;
    }

    .quick-actions {
        margin-top: 2rem;
    }

    .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--primary-gradient);
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 600;
        text-decoration: none;
        transition: var(--transition);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-primary svg { width: 20px; height: 20px; fill: currentColor; }

    .section-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.875rem;
        font-weight: 700;
        color: white;
        margin-bottom: 2rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .section-icon { width: 28px; height: 28px; fill: currentColor; }

    .template-categories { margin-bottom: 4rem; }

    .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .category-card {
        background: var(--bg-white);
        border-radius: var(--border-radius);
        padding: 2rem 1.5rem;
        text-align: center;
        transition: var(--transition);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .category-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: var(--shadow-lg);
    }

    .category-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 1rem;
        background: var(--primary-gradient);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .category-icon svg { width: 24px; height: 24px; fill: white; }

    .category-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    .category-count { font-size: 0.875rem; color: var(--text-light); }

    .template-list { margin-bottom: 4rem; }

    .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .list-actions { display: flex; gap: 1rem; flex-wrap: wrap; }

    .btn-download-all, .btn-download-mdc {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-white);
        color: var(--accent-color);
        border: 2px solid transparent;
        padding: 0.875rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        backdrop-filter: blur(20px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn-download-all:hover, .btn-download-mdc:hover {
        background: white;
        border-color: var(--accent-color);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .btn-download-all svg, .btn-download-mdc svg { width: 20px; height: 20px; fill: currentColor; }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
    }

    .template-card {
        background: var(--bg-white);
        border-radius: 20px;
        padding: 2rem;
        transition: var(--transition);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
    }

    .template-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--primary-gradient);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.3s ease;
    }

    .template-card:hover::after { transform: scaleX(1); }
    .template-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); }

    .template-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        gap: 1rem;
    }

    .template-name {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
        line-height: 1.3;
        flex: 1;
    }

    .template-type {
        background: var(--secondary-gradient);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 50px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .template-description {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
        line-height: 1.6;
    }

    .template-actions { display: flex; gap: 0.75rem; }

    .btn-view-details {
        flex: 1;
        background: var(--primary-gradient);
        color: white;
        border: none;
        padding: 0.875rem 1rem;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn-view-details:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-view-details svg { width: 16px; height: 16px; fill: currentColor; }
    
    .btn-download {
        flex: 1;
        background: var(--primary-gradient);
        color: white;
        border: none;
        padding: 0.875rem 1rem;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn-download:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-download svg { width: 16px; height: 16px; fill: currentColor; }

    .no-templates {
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 2rem;
        background: var(--bg-white);
        border-radius: 20px;
        backdrop-filter: blur(20px);
    }

    .no-templates-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
        fill: var(--text-light);
    }

    .no-templates h3 {
        font-size: 1.5rem;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    .no-templates p { color: var(--text-secondary); }

    .ai-footer {
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.8));
        color: white;
        margin-top: 4rem;
        backdrop-filter: blur(20px);
    }

    .footer-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 3rem 2rem 1rem;
    }

    .footer-main {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    .footer-section h3, .footer-section h4 { margin-bottom: 1rem; color: white; }
    .footer-section p { color: rgba(255, 255, 255, 0.7); line-height: 1.6; }
    .footer-section ul { list-style: none; }
    .footer-section ul li { margin-bottom: 0.5rem; }
    .footer-section a { color: rgba(255, 255, 255, 0.7); text-decoration: none; transition: var(--transition); }
    .footer-section a:hover { color: white; }

    .footer-bottom {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .footer-links { display: flex; gap: 2rem; flex-wrap: wrap; }
    .footer-links a { color: rgba(255, 255, 255, 0.7); text-decoration: none; transition: var(--transition); }
    .footer-links a:hover { color: white; }

    @media (max-width: 768px) {
        .nav-content { padding: 0 1rem; flex-direction: column; gap: 1rem; }
        .nav-actions { gap: 1rem; }
        .breadcrumb-content { padding: 0 1rem; flex-wrap: wrap; }
        .main-content { padding: 2rem 1rem; }
        .project-header { padding: 2rem; }
        .project-stats { gap: 1.5rem; }
        .list-header { flex-direction: column; align-items: stretch; }
        .template-grid { grid-template-columns: 1fr; }
        .footer-main { grid-template-columns: 1fr; text-align: center; }
        .footer-bottom { flex-direction: column; text-align: center; }
        .footer-links { justify-content: center; }
    }

    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .template-card, .category-card { animation: fadeInUp 0.6s ease-out; }
    .template-card:nth-child(2n) { animation-delay: 0.1s; }
    .template-card:nth-child(3n) { animation-delay: 0.2s; }
  `;
}

/**
 * 生成页面JavaScript
 */
function getPageJavaScript() {
  return `
    function viewTemplateDetails(projectId, templateVersionId) {
        // 根据路径规则生成SEO页面链接：本地服务器上的模板详情页面
        const url = 'http://localhost:3030/static-pages/pdhtml/' + projectId + '/' + templateVersionId + '.html';
        window.open(url, '_blank');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'view_details', {
                event_category: 'template',
                event_label: templateVersionId,
                event_value: 1
            });
        }
    }

    function downloadTemplate(projectId, templateId) {
        const url = '/api/templates/download/' + templateId + '?project_id=' + projectId;
        window.open(url, '_blank');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'download', {
                event_category: 'template',
                event_label: templateId,
                event_value: 1
            });
        }
    }

    function downloadAllTemplates(projectId) {
        const url = '/api/projects/' + projectId + '/templates/download-all';
        window.open(url, '_blank');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'download_all', {
                event_category: 'templates',
                event_label: projectId
            });
        }
    }

    function downloadAllMDC(projectId) {
        const url = '/api/projects/' + projectId + '/mdc/download-all';
        window.open(url, '_blank');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'download_mdc', {
                event_category: 'mdc',
                event_label: projectId
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.animationPlayState = 'running';
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.template-card, .category-card').forEach(card => {
                observer.observe(card);
            });
        }

        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                event_category: 'project_detail',
                event_label: window.location.pathname
            });
        }
    });
  `;
}

module.exports = {
  generateProjectPage,
  generateSEOTemplate
};

// 如果直接运行此脚本，生成指定项目的页面
if (require.main === module) {
  const targetProjectId = process.argv[2] || 'b6bf6237-a8d2-4910-836f-6477604f0a2d';
  
  generateProjectPage(targetProjectId, false)
    .then((result) => {
      console.log(`🎉 成功生成项目页面: ${result.filePath}`);
      console.log(`📊 项目信息: ${result.project.name || '未命名'}`);
      console.log(`📋 模板数量: ${result.categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0)}`);
      console.log(`🏷️ 分类数量: ${result.categoriesWithTemplates.length}`);
    })
    .catch((error) => {
      console.error('❌ 生成失败:', error);
    });
}