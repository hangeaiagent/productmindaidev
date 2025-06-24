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
    this.urls = [];
  }

  // 生成XML URL条目
  generateUrlEntry(url, options = {}) {
    const {
      priority = '0.7',
      changefreq = 'weekly',
      lastmod = SITE_CONFIG.currentDate,
      bilingual = false
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
      this.urls.push(this.generateUrlEntry(page.url, {
        priority: page.priority,
        changefreq: page.changefreq,
        bilingual: page.bilingual
      }));

      // 英文页面
      if (page.bilingual) {
        const enUrl = page.url === '/' ? '/en/' : `/en${page.url}`;
        this.urls.push(this.generateUrlEntry(enUrl, {
          priority: page.priority,
          changefreq: page.changefreq,
          bilingual: page.bilingual
        }));
      }
    });

    console.log(`✅ 生成了 ${BASE_PAGES.length * 2} 个基础页面URL`);
  }

  // 生成产品页面URL
  generateProductPages(projects) {
    console.log('🔍 生成产品页面URL...');
    
    projects.forEach(project => {
      // 动态产品页面 - 中文
      this.urls.push(this.generateUrlEntry(`/products/${project.id}`, {
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: project.created_at ? project.created_at.split('T')[0] : SITE_CONFIG.currentDate
      }));

      // 动态产品页面 - 英文
      this.urls.push(this.generateUrlEntry(`/en/products/${project.id}`, {
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: project.created_at ? project.created_at.split('T')[0] : SITE_CONFIG.currentDate
      }));
    });

    console.log(`✅ 生成了 ${projects.length * 2} 个产品页面URL`);
  }

  // 生成静态SEO页面URL
  generateStaticPages(staticPageIds) {
    console.log('📄 生成静态SEO页面URL...');
    
    staticPageIds.forEach(pageId => {
      this.urls.push(this.generateUrlEntry(`${SITE_CONFIG.staticPagesPath}/${pageId}/index.html`, {
        priority: '0.7',
        changefreq: 'weekly'
      }));
    });

    console.log(`✅ 生成了 ${staticPageIds.length} 个静态页面URL`);
  }

  // 生成完整的sitemap.xml
  generateSitemap() {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    const xmlFooter = `</urlset>`;

    const sitemapContent = xmlHeader + '\n' + this.urls.join('\n') + '\n' + xmlFooter;

    return sitemapContent;
  }

  // 保存sitemap文件
  saveSitemap(content) {
    const sitemapPath = path.join(__dirname, 'public/sitemap.xml');
    
    // 确保目录存在
    const publicDir = path.dirname(sitemapPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // 备份现有文件
    if (fs.existsSync(sitemapPath)) {
      const backupPath = `${sitemapPath}.backup.${Date.now()}`;
      fs.copyFileSync(sitemapPath, backupPath);
      console.log(`📦 已备份现有sitemap: ${path.basename(backupPath)}`);
    }

    // 写入新文件
    fs.writeFileSync(sitemapPath, content, 'utf8');
    console.log(`✅ sitemap.xml 已保存到: ${sitemapPath}`);

    // 显示统计信息
    const stats = fs.statSync(sitemapPath);
    const urlCount = (content.match(/<url>/g) || []).length;
    
    console.log(`📊 Sitemap统计:`);
    console.log(`   - URL数量: ${urlCount}`);
    console.log(`   - 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

    return sitemapPath;
  }

  // 上传到远程服务器
  async uploadToRemote(localPath) {
    return new Promise((resolve) => {
      console.log('🚀 上传sitemap到远程服务器...');
      
      const { spawn } = require('child_process');
      const scp = spawn('scp', [
        '-i', '/Users/a1/work/productmindai.pem',
        localPath,
        'ec2-user@3.93.149.236:/home/productmindaidev/public/sitemap.xml'
      ]);

      scp.on('close', (code) => {
        if (code === 0) {
          console.log('✅ sitemap.xml 已上传到远程服务器');
          resolve(true);
        } else {
          console.error('❌ sitemap.xml 上传失败');
          resolve(false);
        }
      });

      scp.on('error', (error) => {
        console.error('❌ SCP上传错误:', error);
        resolve(false);
      });
    });
  }

  // 验证sitemap
  async verifySitemap() {
    console.log('🔍 验证sitemap可访问性...');
    
    try {
      const https = require('https');
      const url = `${SITE_CONFIG.baseUrl}/sitemap.xml`;
      
      return new Promise((resolve) => {
        const req = https.get(url, (res) => {
          if (res.statusCode === 200) {
            console.log(`✅ sitemap.xml 可正常访问 (HTTP ${res.statusCode})`);
            resolve(true);
          } else {
            console.error(`❌ sitemap.xml 访问失败 (HTTP ${res.statusCode})`);
            resolve(false);
          }
        });

        req.on('error', (error) => {
          console.error('❌ sitemap.xml 访问错误:', error.message);
          resolve(false);
        });

        req.setTimeout(10000, () => {
          console.error('❌ sitemap.xml 访问超时');
          req.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      console.error('❌ sitemap验证错误:', error);
      return false;
    }
  }

  // 主执行函数
  async run() {
    console.log('🚀 开始生成完整的sitemap.xml...');
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

      // 3. 生成sitemap内容
      const sitemapContent = this.generateSitemap();

      // 4. 保存本地文件
      const localPath = this.saveSitemap(sitemapContent);

      // 5. 上传到远程服务器
      const uploadSuccess = await this.uploadToRemote(localPath);

      // 6. 验证访问
      if (uploadSuccess) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.verifySitemap();
      }

      console.log('');
      console.log('🎉 sitemap.xml 生成完成！');
      console.log('=====================================');
      console.log(`🔗 sitemap地址: ${SITE_CONFIG.baseUrl}/sitemap.xml`);

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
