#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 环境变量配置
require('dotenv').config({ path: 'aws-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证环境变量
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必需的环境变量');
  console.error('请检查 aws-backend/.env 文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 配置
const SITE_CONFIG = {
  baseUrl: 'https://productmindai.com',
  staticPagesPath: '/static-pages/pdhtml',
  currentDate: new Date().toISOString().split('T')[0]
};

// 基础页面配置
const BASE_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily', bilingual: true },
  { url: '/ai-products', priority: '0.9', changefreq: 'daily', bilingual: true },
  { url: '/dashboard', priority: '0.8', changefreq: 'weekly', bilingual: true },
  { url: '/login', priority: '0.5', changefreq: 'monthly', bilingual: true },
  { url: '/register', priority: '0.5', changefreq: 'monthly', bilingual: true }
];

class CompleteSitemapGenerator {
  constructor() {
    this.allUrls = [];
    this.zhUrls = [];
    this.enUrls = [];
  }

  // 生成XML URL条目
  generateUrlEntry(url, options = {}) {
    const {
      priority = '0.7',
      changefreq = 'weekly',
      lastmod = SITE_CONFIG.currentDate,
      bilingual = false,
      language = null
    } = options;

    let urlEntry = `    <url>
        <loc>${SITE_CONFIG.baseUrl}${url}</loc>`;

    // 添加双语链接
    if (bilingual) {
      const baseUrl = url.startsWith('/en/') ? url.replace('/en/', '/') : url;
      const enUrl = url.startsWith('/en/') ? url : `/en${url === '/' ? '/' : url}`;
      
      urlEntry += `
        <xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_CONFIG.baseUrl}${baseUrl}"/>
        <xhtml:link rel="alternate" hreflang="en-US" href="${SITE_CONFIG.baseUrl}${enUrl}"/>`;
    }

    urlEntry += `
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;

    return urlEntry;
  }

  // 获取数据库中的所有项目
  async fetchProjects() {
    try {
      console.log('📊 从数据库获取项目数据...');
      
      const { data: projects, error } = await supabase
        .from('user_projects')
        .select('id, name, description, primary_category, created_at')
        .not('primary_category', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 数据库查询错误:', error);
        return [];
      }

      console.log(`✅ 获取到 ${projects.length} 个项目`);
      return projects || [];
    } catch (error) {
      console.error('❌ 数据库连接错误:', error);
      return [];
    }
  }

  // 获取远程静态页面列表
  async fetchStaticPages() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const ssh = spawn('ssh', [
        '-i', '/Users/a1/work/productmindai.pem',
        'ec2-user@3.93.149.236',
        'ls /home/productmindaidev/static-pages/pdhtml/'
      ]);

      let output = '';
      ssh.stdout.on('data', (data) => {
        output += data.toString();
      });

      ssh.on('close', (code) => {
        if (code === 0) {
          const pageIds = output.trim().split('\n').filter(id => id.trim().length > 0);
          console.log(`✅ 获取到 ${pageIds.length} 个静态页面`);
          resolve(pageIds);
        } else {
          console.error('❌ 获取静态页面列表失败');
          resolve([]);
        }
      });

      ssh.on('error', (error) => {
        console.error('❌ SSH连接错误:', error);
        resolve([]);
      });
    });
  }

  // 生成基础页面URL
  generateBasePages() {
    console.log('🏠 生成基础页面URL...');
    
    BASE_PAGES.forEach(page => {
      // 中文页面
      const zhUrl = this.generateUrlEntry(page.url, {
        priority: page.priority,
        changefreq: page.changefreq,
        bilingual: page.bilingual,
        language: 'zh'
      });
      this.allUrls.push(zhUrl);
      this.zhUrls.push(zhUrl);

      // 英文页面
      if (page.bilingual) {
        const enUrl = page.url === '/' ? '/en/' : `/en${page.url}`;
        const enUrlEntry = this.generateUrlEntry(enUrl, {
          priority: page.priority,
          changefreq: page.changefreq,
          bilingual: page.bilingual,
          language: 'en'
        });
        this.allUrls.push(enUrlEntry);
        this.enUrls.push(enUrlEntry);
      }
    });

    console.log(`✅ 生成了 ${BASE_PAGES.length * 2} 个基础页面URL`);
  }

  // 生成产品页面URL
  generateProductPages(projects) {
    console.log('🔍 生成产品页面URL...');
    
    projects.forEach(project => {
      const lastmod = project.created_at ? project.created_at.split('T')[0] : SITE_CONFIG.currentDate;
      
      // 动态产品页面 - 中文
      const zhUrl = this.generateUrlEntry(`/products/${project.id}`, {
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: lastmod,
        language: 'zh'
      });
      this.allUrls.push(zhUrl);
      this.zhUrls.push(zhUrl);

      // 动态产品页面 - 英文
      const enUrl = this.generateUrlEntry(`/en/products/${project.id}`, {
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: lastmod,
        language: 'en'
      });
      this.allUrls.push(enUrl);
      this.enUrls.push(enUrl);
    });

    console.log(`✅ 生成了 ${projects.length * 2} 个产品页面URL`);
  }

  // 生成静态SEO页面URL
  generateStaticPages(staticPageIds) {
    console.log('📄 生成静态SEO页面URL...');
    
    staticPageIds.forEach(pageId => {
      const staticUrl = this.generateUrlEntry(`${SITE_CONFIG.staticPagesPath}/${pageId}/index.html`, {
        priority: '0.7',
        changefreq: 'weekly'
      });
      this.allUrls.push(staticUrl);
      // 静态页面主要是中文，也加入中文sitemap
      this.zhUrls.push(staticUrl);
    });

    console.log(`✅ 生成了 ${staticPageIds.length} 个静态页面URL`);
  }

  // 生成XML sitemap
  generateSitemapXML(urls, title = '') {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    const xmlFooter = `</urlset>`;

    return xmlHeader + '\n' + urls.join('\n') + '\n' + xmlFooter;
  }

  // 生成sitemap索引文件
  generateSitemapIndex() {
    console.log('📋 生成sitemap索引文件...');
    
    const sitemaps = [
      { url: 'sitemap.xml', lastmod: SITE_CONFIG.currentDate },
      { url: 'sitemap-zh.xml', lastmod: SITE_CONFIG.currentDate },
      { url: 'sitemap-en.xml', lastmod: SITE_CONFIG.currentDate },
      { url: 'sitemap-images.xml', lastmod: SITE_CONFIG.currentDate }
    ];

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    const xmlFooter = `</sitemapindex>`;

    const sitemapEntries = sitemaps.map(sitemap => 
      `    <sitemap>
        <loc>${SITE_CONFIG.baseUrl}/${sitemap.url}</loc>
        <lastmod>${sitemap.lastmod}</lastmod>
    </sitemap>`
    );

    return xmlHeader + '\n' + sitemapEntries.join('\n') + '\n' + xmlFooter;
  }

  // 生成图片sitemap
  generateImageSitemap() {
    console.log('🖼️ 生成图片sitemap...');
    
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    const xmlFooter = `</urlset>`;

    const imageUrls = [
      `    <url>
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
    </url>`,
      `    <url>
        <loc>${SITE_CONFIG.baseUrl}/en/</loc>
        <image:image>
            <image:loc>${SITE_CONFIG.baseUrl}/og-image.jpg</image:loc>
            <image:title>ProductMind AI - Intelligent Product Management Platform</image:title>
            <image:caption>AI-driven Product Manager Assistant</image:caption>
        </image:image>
    </url>`
    ];

    return xmlHeader + '\n' + imageUrls.join('\n') + '\n' + xmlFooter;
  }

  // 保存sitemap文件
  saveSitemapFile(content, filename) {
    const sitemapPath = path.join(__dirname, '../../../public', filename);
    
    // 确保目录存在
    const publicDir = path.dirname(sitemapPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // 备份现有文件
    if (fs.existsSync(sitemapPath)) {
      const backupPath = `${sitemapPath}.backup.${Date.now()}`;
      fs.copyFileSync(sitemapPath, backupPath);
    }

    // 写入新文件
    fs.writeFileSync(sitemapPath, content, 'utf8');
    
    // 显示统计信息
    const stats = fs.statSync(sitemapPath);
    const urlCount = (content.match(/<url>|<sitemap>/g) || []).length;
    
    console.log(`✅ ${filename} 已保存`);
    console.log(`   - 条目数量: ${urlCount}`);
    console.log(`   - 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

    return sitemapPath;
  }

  // 主执行函数
  async run() {
    console.log('🚀 开始生成完整的sitemap体系...');
    console.log('=====================================');
    console.log(`📅 生成时间: ${new Date().toLocaleString()}`);
    console.log(`🌐 网站地址: ${SITE_CONFIG.baseUrl}`);
    console.log('');

    try {
      // 1. 获取数据
      const [projects, staticPageIds] = await Promise.all([
        this.fetchProjects(),
        this.fetchStaticPages()
      ]);

      // 2. 生成URL
      this.generateBasePages();
      this.generateProductPages(projects);
      this.generateStaticPages(staticPageIds);

      // 3. 生成各种sitemap文件
      console.log('\n📄 生成sitemap文件...');
      
      // 主sitemap
      const mainSitemap = this.generateSitemapXML(this.allUrls);
      this.saveSitemapFile(mainSitemap, 'sitemap.xml');

      // 中文sitemap
      const zhSitemap = this.generateSitemapXML(this.zhUrls);
      this.saveSitemapFile(zhSitemap, 'sitemap-zh.xml');

      // 英文sitemap
      const enSitemap = this.generateSitemapXML(this.enUrls);
      this.saveSitemapFile(enSitemap, 'sitemap-en.xml');

      // 图片sitemap
      const imageSitemap = this.generateImageSitemap();
      this.saveSitemapFile(imageSitemap, 'sitemap-images.xml');

      // sitemap索引
      const sitemapIndex = this.generateSitemapIndex();
      this.saveSitemapFile(sitemapIndex, 'sitemap-index.xml');

      console.log('');
      console.log('🎉 完整sitemap体系生成完成！');
      console.log('=====================================');
      console.log('📊 生成统计:');
      console.log(`   - 主sitemap: ${this.allUrls.length} URLs`);
      console.log(`   - 中文sitemap: ${this.zhUrls.length} URLs`);
      console.log(`   - 英文sitemap: ${this.enUrls.length} URLs`);
      console.log(`   - 图片sitemap: 2 URLs`);
      console.log(`   - sitemap索引: 4 sitemaps`);
      console.log('');
      console.log('🔗 访问地址:');
      console.log(`   - 主sitemap: ${SITE_CONFIG.baseUrl}/sitemap.xml`);
      console.log(`   - 中文sitemap: ${SITE_CONFIG.baseUrl}/sitemap-zh.xml`);
      console.log(`   - 英文sitemap: ${SITE_CONFIG.baseUrl}/sitemap-en.xml`);
      console.log(`   - 图片sitemap: ${SITE_CONFIG.baseUrl}/sitemap-images.xml`);
      console.log(`   - sitemap索引: ${SITE_CONFIG.baseUrl}/sitemap-index.xml`);

      return true;
    } catch (error) {
      console.error('❌ sitemap生成失败:', error);
      return false;
    }
  }
}

// 执行生成
if (require.main === module) {
  const generator = new CompleteSitemapGenerator();
  generator.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = CompleteSitemapGenerator;
