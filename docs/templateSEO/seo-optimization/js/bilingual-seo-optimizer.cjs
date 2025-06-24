const fs = require('fs');
const path = require('path');

// 中英文双语SEO内容配置
const BILINGUAL_SEO_CONFIG = {
  site: {
    domain: 'https://productmindai.com',
    name: {
      zh: 'ProductMind AI - 智能产品管理平台',
      en: 'ProductMind AI - Intelligent Product Management Platform'
    },
    description: {
      zh: 'ProductMind AI是专业的智能产品管理平台，为产品经理提供AI驱动的产品分析、文档生成、模板管理等服务。提供PRD、MRD、BRD等25+专业模板，助力产品成功。',
      en: 'ProductMind AI is a professional intelligent product management platform that provides product managers with AI-driven product analysis, document generation, template management and other services. Offering 25+ professional templates including PRD, MRD, BRD to help product success.'
    },
    keywords: {
      zh: 'ProductMind AI,产品管理,AI产品经理,PRD模板,产品需求文档,MRD模板,BRD模板,产品分析,智能产品管理,AI助手,产品文档生成',
      en: 'ProductMind AI,Product Management,AI Product Manager,PRD Template,Product Requirements Document,MRD Template,BRD Template,Product Analysis,Intelligent Product Management,AI Assistant,Product Document Generation'
    }
  },
  pages: {
    home: {
      zh: {
        title: 'ProductMind AI - 智能产品管理平台 | AI驱动的产品经理助手',
        description: 'ProductMind AI是专业的智能产品管理平台，为产品经理提供AI驱动的产品分析、文档生成、模板管理等服务。提供PRD、MRD、BRD等25+专业模板，助力产品成功。',
        keywords: 'ProductMind AI,产品管理,AI产品经理,PRD模板,产品需求文档,MRD模板,BRD模板,产品分析,智能产品管理,AI助手,产品文档生成'
      },
      en: {
        title: 'ProductMind AI - Intelligent Product Management Platform | AI-Driven Product Manager Assistant',
        description: 'ProductMind AI is a professional intelligent product management platform that provides product managers with AI-driven product analysis, document generation, template management and other services.',
        keywords: 'ProductMind AI,Product Management,AI Product Manager,PRD Template,Product Requirements Document,MRD Template,BRD Template,Product Analysis,Intelligent Product Management,AI Assistant'
      }
    },
    aiProducts: {
      zh: {
        title: 'AI产品中心 - 智能产品管理模板库 | ProductMind AI',
        description: '探索ProductMind AI的智能产品管理模板库，包含PRD、MRD、BRD等25+专业模板。AI驱动的产品分析工具，助力产品经理高效工作。',
        keywords: 'AI产品,产品模板,PRD模板,MRD模板,BRD模板,产品需求文档,市场需求文档,商业需求文档,产品管理工具'
      },
      en: {
        title: 'AI Products Center - Intelligent Product Management Template Library | ProductMind AI',
        description: 'Explore ProductMind AI\'s intelligent product management template library, including 25+ professional templates such as PRD, MRD, BRD. AI-driven product analysis tools to help product managers work efficiently.',
        keywords: 'AI Products,Product Templates,PRD Template,MRD Template,BRD Template,Product Requirements Document,Market Requirements Document,Business Requirements Document,Product Management Tools'
      }
    },
    dashboard: {
      zh: {
        title: '产品管理仪表板 - 智能数据分析 | ProductMind AI',
        description: '使用ProductMind AI的智能仪表板管理您的产品项目。实时数据分析、进度跟踪、团队协作，让产品管理更高效。',
        keywords: '产品仪表板,数据分析,项目管理,团队协作,产品进度,智能分析,产品指标'
      },
      en: {
        title: 'Product Management Dashboard - Intelligent Data Analysis | ProductMind AI',
        description: 'Manage your product projects with ProductMind AI\'s intelligent dashboard. Real-time data analysis, progress tracking, team collaboration for more efficient product management.',
        keywords: 'Product Dashboard,Data Analysis,Project Management,Team Collaboration,Product Progress,Intelligent Analysis,Product Metrics'
      }
    }
  }
};

class BilingualSEOOptimizer {
  constructor() {
    this.projectRoot = path.join(__dirname, '../../../..');
    this.publicDir = path.join(this.projectRoot, 'public');
    this.srcDir = path.join(this.projectRoot, 'src');
  }

  // 生成中英文双语的index.html
  generateBilingualIndexHTML() {
    console.log('🌐 生成中英文双语主页...');
    
    const zhConfig = BILINGUAL_SEO_CONFIG.pages.home.zh;
    const enConfig = BILINGUAL_SEO_CONFIG.pages.home.en;
    
    const htmlContent = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    
    <!-- 基础SEO - 中文 -->
    <title>${zhConfig.title}</title>
    <meta name="description" content="${zhConfig.description}" />
    <meta name="keywords" content="${zhConfig.keywords}" />
    <meta name="author" content="ProductMind AI" />
    <meta name="robots" content="index,follow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- 多语言支持 -->
    <link rel="alternate" hreflang="zh-CN" href="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    <link rel="alternate" hreflang="en-US" href="${BILINGUAL_SEO_CONFIG.site.domain}/en/" />
    <link rel="alternate" hreflang="x-default" href="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    <link rel="canonical" href="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    
    <!-- Open Graph / Facebook - 中文 -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    <meta property="og:title" content="${BILINGUAL_SEO_CONFIG.site.name.zh}" />
    <meta property="og:description" content="${BILINGUAL_SEO_CONFIG.site.description.zh}" />
    <meta property="og:image" content="${BILINGUAL_SEO_CONFIG.site.domain}/og-image.jpg" />
    <meta property="og:site_name" content="ProductMind AI" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    
    <!-- Twitter Cards - 中文 -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    <meta name="twitter:title" content="${BILINGUAL_SEO_CONFIG.site.name.zh}" />
    <meta name="twitter:description" content="${BILINGUAL_SEO_CONFIG.site.description.zh}" />
    <meta name="twitter:image" content="${BILINGUAL_SEO_CONFIG.site.domain}/og-image.jpg" />
    
    <!-- 网站图标 -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    
    <!-- 字体预加载 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- 结构化数据 - 双语支持 -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "${BILINGUAL_SEO_CONFIG.site.name.zh}",
      "alternateName": "${BILINGUAL_SEO_CONFIG.site.name.en}",
      "description": "${BILINGUAL_SEO_CONFIG.site.description.zh}",
      "url": "${BILINGUAL_SEO_CONFIG.site.domain}",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Web",
      "browserRequirements": "Modern browser with JavaScript support",
      "inLanguage": ["zh-CN", "en-US"],
      "author": {
        "@type": "Organization",
        "name": "ProductMind AI",
        "url": "${BILINGUAL_SEO_CONFIG.site.domain}",
        "sameAs": [
          "${BILINGUAL_SEO_CONFIG.site.domain}/en/"
        ]
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "156"
      },
      "potentialAction": {
        "@type": "UseAction",
        "target": "${BILINGUAL_SEO_CONFIG.site.domain}/dashboard"
      }
    }
    </script>
    
    <!-- 性能优化 -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link rel="preload" href="/src/main.tsx" as="script">
    
    <!-- 语言检测和切换脚本 -->
    <script>
      // 检测用户语言偏好
      function detectLanguage() {
        const userLang = navigator.language || navigator.userLanguage;
        const supportedLangs = ['zh-CN', 'zh', 'en-US', 'en'];
        
        // 检查是否已经在英文页面
        if (window.location.pathname.startsWith('/en/')) {
          return 'en';
        }
        
        // 如果用户偏好英文且当前在中文页面，提示切换
        if ((userLang.startsWith('en') || userLang === 'en-US') && 
            !window.location.pathname.startsWith('/en/')) {
          
          // 创建语言切换提示
          const langSwitchBanner = document.createElement('div');
          langSwitchBanner.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #1e40af;
            color: white;
            padding: 8px 16px;
            text-align: center;
            z-index: 9999;
            font-size: 14px;
          \`;
          langSwitchBanner.innerHTML = \`
            English version available. 
            <a href="/en/" style="color: #fbbf24; text-decoration: underline;">Switch to English</a>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 16px; cursor: pointer;">×</button>
          \`;
          
          document.body.appendChild(langSwitchBanner);
        }
      }
      
      // 页面加载完成后执行语言检测
      document.addEventListener('DOMContentLoaded', detectLanguage);
    </script>
    
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    
    <!-- Service Worker 注册 -->
    <script>
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered successfully');
          })
          .catch(error => {
            console.log('SW registration failed');
          });
      }
    </script>
  </body>
</html>`;

    const indexPath = path.join(this.projectRoot, 'index.html');
    fs.writeFileSync(indexPath, htmlContent);
    
    return indexPath;
  }

  // 生成英文版本的index.html
  generateEnglishIndexHTML() {
    console.log('🇺🇸 生成英文版主页...');
    
    const enConfig = BILINGUAL_SEO_CONFIG.pages.home.en;
    const zhConfig = BILINGUAL_SEO_CONFIG.pages.home.zh;
    
    const htmlContent = `<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    
    <!-- 基础SEO - 英文 -->
    <title>${enConfig.title}</title>
    <meta name="description" content="${enConfig.description}" />
    <meta name="keywords" content="${enConfig.keywords}" />
    <meta name="author" content="ProductMind AI" />
    <meta name="robots" content="index,follow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- 多语言支持 -->
    <link rel="alternate" hreflang="en-US" href="${BILINGUAL_SEO_CONFIG.site.domain}/en/" />
    <link rel="alternate" hreflang="zh-CN" href="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    <link rel="alternate" hreflang="x-default" href="${BILINGUAL_SEO_CONFIG.site.domain}/" />
    <link rel="canonical" href="${BILINGUAL_SEO_CONFIG.site.domain}/en/" />
    
    <!-- Open Graph / Facebook - 英文 -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BILINGUAL_SEO_CONFIG.site.domain}/en/" />
    <meta property="og:title" content="${BILINGUAL_SEO_CONFIG.site.name.en}" />
    <meta property="og:description" content="${BILINGUAL_SEO_CONFIG.site.description.en}" />
    <meta property="og:image" content="${BILINGUAL_SEO_CONFIG.site.domain}/og-image.jpg" />
    <meta property="og:site_name" content="ProductMind AI" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="zh_CN" />
    
    <!-- Twitter Cards - 英文 -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${BILINGUAL_SEO_CONFIG.site.domain}/en/" />
    <meta name="twitter:title" content="${BILINGUAL_SEO_CONFIG.site.name.en}" />
    <meta name="twitter:description" content="${BILINGUAL_SEO_CONFIG.site.description.en}" />
    <meta name="twitter:image" content="${BILINGUAL_SEO_CONFIG.site.domain}/og-image.jpg" />
    
    <!-- 网站图标 -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    
    <!-- 字体预加载 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- 结构化数据 - 英文版 -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "${BILINGUAL_SEO_CONFIG.site.name.en}",
      "alternateName": "${BILINGUAL_SEO_CONFIG.site.name.zh}",
      "description": "${BILINGUAL_SEO_CONFIG.site.description.en}",
      "url": "${BILINGUAL_SEO_CONFIG.site.domain}/en/",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Web",
      "browserRequirements": "Modern browser with JavaScript support",
      "inLanguage": ["en-US", "zh-CN"],
      "author": {
        "@type": "Organization",
        "name": "ProductMind AI",
        "url": "${BILINGUAL_SEO_CONFIG.site.domain}",
        "sameAs": [
          "${BILINGUAL_SEO_CONFIG.site.domain}/"
        ]
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "156"
      },
      "potentialAction": {
        "@type": "UseAction",
        "target": "${BILINGUAL_SEO_CONFIG.site.domain}/en/dashboard"
      }
    }
    </script>
    
    <!-- 性能优化 -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link rel="preload" href="/src/main.tsx" as="script">
    
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    
    <!-- Service Worker 注册 -->
    <script>
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered successfully');
          })
          .catch(error => {
            console.log('SW registration failed');
          });
      }
    </script>
  </body>
</html>`;

    // 确保public/en目录存在
    const enDir = path.join(this.publicDir, 'en');
    if (!fs.existsSync(enDir)) {
      fs.mkdirSync(enDir, { recursive: true });
    }
    
    const enIndexPath = path.join(enDir, 'index.html');
    fs.writeFileSync(enIndexPath, htmlContent);
    
    return enIndexPath;
  }

  // 生成双语robots.txt
  generateBilingualRobots() {
    console.log('🤖 生成双语robots.txt...');
    
    const robotsContent = `# ProductMind AI - Robots.txt (Bilingual Support)
# 更新时间 / Updated: ${new Date().toISOString().split('T')[0]}
# 中英文双语网站爬虫配置 / Bilingual Website Crawler Configuration

User-agent: *
Allow: /

# 中文页面 / Chinese Pages
Allow: /
Allow: /ai-products
Allow: /dashboard
Allow: /static-pages/

# 英文页面 / English Pages  
Allow: /en/
Allow: /en/ai-products
Allow: /en/dashboard

# 静态资源 / Static Resources
Allow: /assets/
Allow: /images/
Allow: /public/
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.svg
Allow: /*.ico
Allow: /*.webp

# 禁止访问的目录 / Disallowed Directories
Disallow: /admin/
Disallow: /.netlify/
Disallow: /api/
Disallow: /src/
Disallow: /node_modules/
Disallow: /logs/
Disallow: /.git/
Disallow: /*.log
Disallow: /*?*
Disallow: /private/
Disallow: /temp/
Disallow: /backup/

# 搜索引擎特定规则 / Search Engine Specific Rules
User-agent: Googlebot
Crawl-delay: 1
Allow: /

User-agent: Bingbot  
Crawl-delay: 2
Allow: /

User-agent: Baiduspider
Crawl-delay: 3
Allow: /

User-agent: YandexBot
Crawl-delay: 2
Allow: /

# 禁止不良爬虫 / Block Bad Bots
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# 站点地图 / Sitemaps
Sitemap: ${BILINGUAL_SEO_CONFIG.site.domain}/sitemap.xml
Sitemap: ${BILINGUAL_SEO_CONFIG.site.domain}/sitemap-zh.xml
Sitemap: ${BILINGUAL_SEO_CONFIG.site.domain}/sitemap-en.xml
Sitemap: ${BILINGUAL_SEO_CONFIG.site.domain}/sitemap-images.xml
Sitemap: ${BILINGUAL_SEO_CONFIG.site.domain}/sitemap-static.xml

# 缓存友好设置 / Cache-Friendly Settings
# 建议爬取频率: 每日一次主要页面，每周一次静态页面
# Recommended crawl frequency: Daily for main pages, weekly for static pages`;

    const robotsPath = path.join(this.publicDir, 'robots.txt');
    fs.writeFileSync(robotsPath, robotsContent);
    
    return robotsPath;
  }

  // 生成SEO配置文件
  generateSEOConfigFile() {
    console.log('⚙️  生成SEO配置文件...');
    
    const configPath = path.join(__dirname, 'seo-config.json');
    fs.writeFileSync(configPath, JSON.stringify(BILINGUAL_SEO_CONFIG, null, 2));
    
    return configPath;
  }

  // 主要执行方法
  async optimize() {
    console.log('🌐 开始中英文双语SEO优化...');
    console.log('========================================');
    
    try {
      // 确保必要目录存在
      if (!fs.existsSync(this.publicDir)) {
        fs.mkdirSync(this.publicDir, { recursive: true });
      }

      const results = {
        timestamp: new Date().toISOString(),
        files: {}
      };

      // 1. 生成中文主页
      results.files.zhIndex = this.generateBilingualIndexHTML();
      console.log('✅ 中文主页生成完成');

      // 2. 生成英文主页
      results.files.enIndex = this.generateEnglishIndexHTML();
      console.log('✅ 英文主页生成完成');

      // 3. 生成双语robots.txt
      results.files.robots = this.generateBilingualRobots();
      console.log('✅ 双语robots.txt生成完成');

      // 4. 生成SEO配置文件
      results.files.config = this.generateSEOConfigFile();
      console.log('✅ SEO配置文件生成完成');

      // 保存优化报告
      const reportPath = path.join(__dirname, '../../../..', 'logs', `bilingual-seo-optimization-${new Date().toISOString().split('T')[0]}.json`);
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

      console.log('========================================');
      console.log('🎉 中英文双语SEO优化完成！');
      console.log('📁 生成的文件:');
      Object.keys(results.files).forEach(key => {
        console.log(`   - ${key}: ${results.files[key]}`);
      });
      console.log(`📋 优化报告: ${reportPath}`);
      
      return results;

    } catch (error) {
      console.error('❌ 双语SEO优化失败:', error);
      throw error;
    }
  }
}

// 执行优化
if (require.main === module) {
  const optimizer = new BilingualSEOOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = BilingualSEOOptimizer; 