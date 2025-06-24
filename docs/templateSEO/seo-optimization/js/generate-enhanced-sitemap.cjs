const fs = require('fs');
const path = require('path');

// 网站基础配置 - 中英文双语
const SITE_CONFIG = {
  baseUrl: 'https://productmindai.com',
  languages: {
    zh: {
      code: 'zh-CN',
      name: '中文',
      prefix: '',
      defaultPages: [
        { url: '/', priority: '1.0', changefreq: 'daily', title: 'ProductMind AI - 智能产品管理平台' },
        { url: '/ai-products', priority: '0.9', changefreq: 'daily', title: 'AI产品中心' },
        { url: '/dashboard', priority: '0.8', changefreq: 'weekly', title: '产品管理仪表板' },
        { url: '/login', priority: '0.5', changefreq: 'monthly', title: '用户登录' },
        { url: '/register', priority: '0.5', changefreq: 'monthly', title: '用户注册' }
      ]
    },
    en: {
      code: 'en-US',
      name: 'English',
      prefix: '/en',
      defaultPages: [
        { url: '/en/', priority: '1.0', changefreq: 'daily', title: 'ProductMind AI - Intelligent Product Management Platform' },
        { url: '/en/ai-products', priority: '0.9', changefreq: 'daily', title: 'AI Products Center' },
        { url: '/en/dashboard', priority: '0.8', changefreq: 'weekly', title: 'Product Management Dashboard' },
        { url: '/en/login', priority: '0.5', changefreq: 'monthly', title: 'User Login' },
        { url: '/en/register', priority: '0.5', changefreq: 'monthly', title: 'User Registration' }
      ]
    }
  }
};

class BilingualSitemapGenerator {
  constructor() {
    this.projectRoot = path.join(__dirname, '../../../..');
    this.staticDir = path.join(this.projectRoot, 'static-pages/pdhtml');
    this.publicDir = path.join(this.projectRoot, 'public');
  }

  // 扫描静态SEO页面 - 中英文版本
  scanStaticPages() {
    console.log('🔍 扫描静态SEO页面...');
    const staticPages = [];
    
    if (!fs.existsSync(this.staticDir)) {
      console.log('⚠️  静态页面目录不存在:', this.staticDir);
      return staticPages;
    }

    const projects = fs.readdirSync(this.staticDir);
    let zhCount = 0, enCount = 0;

    projects.forEach(projectId => {
      const projectDir = path.join(this.staticDir, projectId);
      if (fs.statSync(projectDir).isDirectory()) {
        const files = fs.readdirSync(projectDir);
        
        files.forEach(file => {
          if (file.endsWith('.html')) {
            const isEnglish = file.endsWith('en.html');
            const isIndex = file === 'index.html';
            
            if (isIndex) {
              // 项目主页 - 中文版
              staticPages.push({
                url: `/static-pages/pdhtml/${projectId}/index.html`,
                priority: '0.7',
                changefreq: 'weekly',
                lang: 'zh',
                type: 'project-home'
              });
              zhCount++;
            } else if (isEnglish) {
              // 英文版本模板详情页
              staticPages.push({
                url: `/static-pages/pdhtml/${projectId}/${file}`,
                priority: '0.7',
                changefreq: 'weekly',
                lang: 'en',
                type: 'template-detail'
              });
              enCount++;
            } else {
              // 中文版本模板详情页
              staticPages.push({
                url: `/static-pages/pdhtml/${projectId}/${file}`,
                priority: '0.7',
                changefreq: 'weekly',
                lang: 'zh',
                type: 'template-detail'
              });
              zhCount++;
            }
          }
        });
      }
    });

    console.log(`📊 静态页面统计: 中文 ${zhCount} 个, 英文 ${enCount} 个`);
    return staticPages;
  }

  // 生成主站点地图
  generateMainSitemap() {
    console.log('🗺️  生成主站点地图...');
    
    const staticPages = this.scanStaticPages();
    const currentDate = new Date().toISOString().split('T')[0];
    
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    // 添加基础页面 - 中英文版本
    Object.keys(SITE_CONFIG.languages).forEach(langKey => {
      const lang = SITE_CONFIG.languages[langKey];
      const otherLang = langKey === 'zh' ? 'en' : 'zh';
      const otherLangConfig = SITE_CONFIG.languages[otherLang];
      
      lang.defaultPages.forEach(page => {
        xmlContent += `    <url>
        <loc>${SITE_CONFIG.baseUrl}${page.url}</loc>
        <xhtml:link rel="alternate" hreflang="${lang.code}" href="${SITE_CONFIG.baseUrl}${page.url}"/>
        <xhtml:link rel="alternate" hreflang="${otherLangConfig.code}" href="${SITE_CONFIG.baseUrl}${otherLangConfig.prefix}${page.url.replace(lang.prefix, '')}"/>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>
`;
      });
    });

    // 添加静态页面
    staticPages.forEach(page => {
      xmlContent += `    <url>
        <loc>${SITE_CONFIG.baseUrl}${page.url}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>
`;
    });

    xmlContent += '</urlset>';

    // 写入主站点地图
    const mainSitemapPath = path.join(this.publicDir, 'sitemap.xml');
    fs.writeFileSync(mainSitemapPath, xmlContent);
    
    return {
      path: mainSitemapPath,
      totalPages: Object.keys(SITE_CONFIG.languages).reduce((sum, lang) => 
        sum + SITE_CONFIG.languages[lang].defaultPages.length, 0) + staticPages.length,
      staticPages: staticPages.length
    };
  }

  // 生成语言特定的站点地图
  generateLanguageSpecificSitemaps() {
    console.log('🌐 生成语言特定站点地图...');
    const results = {};
    
    Object.keys(SITE_CONFIG.languages).forEach(langKey => {
      const lang = SITE_CONFIG.languages[langKey];
      const currentDate = new Date().toISOString().split('T')[0];
      
      let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

      // 添加该语言的基础页面
      lang.defaultPages.forEach(page => {
        xmlContent += `    <url>
        <loc>${SITE_CONFIG.baseUrl}${page.url}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>
`;
      });

      xmlContent += '</urlset>';

      // 写入语言特定站点地图
      const langSitemapPath = path.join(this.publicDir, `sitemap-${langKey}.xml`);
      fs.writeFileSync(langSitemapPath, xmlContent);
      
      results[langKey] = {
        path: langSitemapPath,
        pages: lang.defaultPages.length
      };
    });

    return results;
  }

  // 生成站点地图索引
  generateSitemapIndex() {
    console.log('📋 生成站点地图索引...');
    
    const currentDate = new Date().toISOString().split('T')[0];
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${SITE_CONFIG.baseUrl}/sitemap.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${SITE_CONFIG.baseUrl}/sitemap-zh.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${SITE_CONFIG.baseUrl}/sitemap-en.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${SITE_CONFIG.baseUrl}/sitemap-images.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${SITE_CONFIG.baseUrl}/sitemap-static.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
</sitemapindex>`;

    const indexPath = path.join(this.publicDir, 'sitemap-index.xml');
    fs.writeFileSync(indexPath, xmlContent);
    
    return indexPath;
  }

  // 生成图片站点地图
  generateImageSitemap() {
    console.log('🖼️  生成图片站点地图...');
    
    const currentDate = new Date().toISOString().split('T')[0];
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <url>
        <loc>${SITE_CONFIG.baseUrl}/</loc>
        <image:image>
            <image:loc>${SITE_CONFIG.baseUrl}/og-image.jpg</image:loc>
            <image:title>ProductMind AI - 智能产品管理平台</image:title>
            <image:caption>AI驱动的产品经理助手</image:caption>
        </image:image>
        <image:image>
            <image:loc>${SITE_CONFIG.baseUrl}/logo.png</image:loc>
            <image:title>ProductMind AI Logo</image:title>
            <image:caption>ProductMind AI 品牌标识</image:caption>
        </image:image>
    </url>
    <url>
        <loc>${SITE_CONFIG.baseUrl}/en/</loc>
        <image:image>
            <image:loc>${SITE_CONFIG.baseUrl}/og-image.jpg</image:loc>
            <image:title>ProductMind AI - Intelligent Product Management Platform</image:title>
            <image:caption>AI-driven Product Manager Assistant</image:caption>
        </image:image>
    </url>
</urlset>`;

    const imageSitemapPath = path.join(this.publicDir, 'sitemap-images.xml');
    fs.writeFileSync(imageSitemapPath, xmlContent);
    
    return imageSitemapPath;
  }

  // 主要执行方法
  async generate() {
    console.log('🚀 开始生成中英文双语站点地图...');
    console.log('========================================');
    
    // 确保public目录存在
    if (!fs.existsSync(this.publicDir)) {
      fs.mkdirSync(this.publicDir, { recursive: true });
    }

    try {
      // 1. 生成主站点地图
      const mainResult = this.generateMainSitemap();
      console.log(`✅ 主站点地图: ${mainResult.totalPages} 个页面`);

      // 2. 生成语言特定站点地图
      const langResults = this.generateLanguageSpecificSitemaps();
      Object.keys(langResults).forEach(lang => {
        console.log(`✅ ${SITE_CONFIG.languages[lang].name}站点地图: ${langResults[lang].pages} 个页面`);
      });

      // 3. 生成图片站点地图
      const imageResult = this.generateImageSitemap();
      console.log(`✅ 图片站点地图: ${imageResult}`);

      // 4. 生成站点地图索引
      const indexResult = this.generateSitemapIndex();
      console.log(`✅ 站点地图索引: ${indexResult}`);

      // 生成报告
      const report = {
        timestamp: new Date().toISOString(),
        mainSitemap: {
          path: mainResult.path,
          totalPages: mainResult.totalPages,
          staticPages: mainResult.staticPages
        },
        languageSitemaps: langResults,
        imageSitemap: imageResult,
        sitemapIndex: indexResult,
        summary: {
          totalSitemaps: 5,
          totalPages: mainResult.totalPages,
          languages: Object.keys(SITE_CONFIG.languages).length
        }
      };

      // 保存报告
      const reportPath = path.join(this.projectRoot, 'logs', `sitemap-generation-${new Date().toISOString().split('T')[0]}.json`);
      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      }
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log('========================================');
      console.log('🎉 中英文双语站点地图生成完成！');
      console.log(`📊 总页面数: ${mainResult.totalPages}`);
      console.log(`🌐 支持语言: ${Object.keys(SITE_CONFIG.languages).length} 种`);
      console.log(`📁 文件数量: 5 个站点地图文件`);
      console.log(`📋 详细报告: ${reportPath}`);
      
      return report;

    } catch (error) {
      console.error('❌ 站点地图生成失败:', error);
      throw error;
    }
  }
}

// 执行生成
if (require.main === module) {
  const generator = new BilingualSitemapGenerator();
  generator.generate().catch(console.error);
}

module.exports = BilingualSitemapGenerator; 