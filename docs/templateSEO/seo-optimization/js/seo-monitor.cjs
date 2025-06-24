const https = require('https');
const fs = require('fs');
const path = require('path');

// 中英文双语SEO监控配置
const SEO_CONFIG = {
  baseUrl: 'https://productmindai.com',
  languages: {
    zh: {
      name: '中文',
      code: 'zh-CN',
      pages: [
        { url: '/', name: '首页', critical: true },
        { url: '/ai-products', name: 'AI产品中心', critical: true },
        { url: '/dashboard', name: '仪表板', critical: false },
        { url: '/login', name: '登录页', critical: false },
        { url: '/register', name: '注册页', critical: false }
      ]
    },
    en: {
      name: 'English',
      code: 'en-US',
      pages: [
        { url: '/en/', name: 'Homepage', critical: true },
        { url: '/en/ai-products', name: 'AI Products Center', critical: true },
        { url: '/en/dashboard', name: 'Dashboard', critical: false },
        { url: '/en/login', name: 'Login Page', critical: false },
        { url: '/en/register', name: 'Register Page', critical: false }
      ]
    }
  },
  seoFiles: [
    { url: '/sitemap.xml', name: '主站点地图', type: 'sitemap' },
    { url: '/sitemap-zh.xml', name: '中文站点地图', type: 'sitemap' },
    { url: '/sitemap-en.xml', name: '英文站点地图', type: 'sitemap' },
    { url: '/sitemap-images.xml', name: '图片站点地图', type: 'sitemap' },
    { url: '/robots.txt', name: 'Robots文件', type: 'robots' }
  ]
};

class BilingualSEOMonitor {
  constructor() {
    this.reportPath = path.join(__dirname, '../../../..', 'logs', `seo-report-${new Date().toISOString().split('T')[0]}.json`);
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        criticalIssues: 0
      },
      languages: {},
      seoFiles: [],
      recommendations: [],
      performance: {}
    };
  }

  // 检查单个页面状态
  async checkPageStatus(url, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = https.get(url, { timeout }, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          const loadTime = Date.now() - startTime;
          
          resolve({
            url: url,
            status: res.statusCode,
            loadTime: loadTime,
            headers: res.headers,
            contentLength: data.length,
            hasMetaDescription: data.includes('meta name="description"'),
            hasOpenGraph: data.includes('property="og:'),
            hasStructuredData: data.includes('application/ld+json'),
            hasHreflang: data.includes('hreflang='),
            title: this.extractTitle(data),
            description: this.extractDescription(data),
            success: res.statusCode === 200
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url: url,
          status: 'TIMEOUT',
          error: `请求超时 (${timeout}ms)`,
          success: false
        });
      });

      req.on('error', (err) => {
        resolve({
          url: url,
          status: 'ERROR',
          error: err.message,
          success: false
        });
      });
    });
  }

  // 提取页面标题
  extractTitle(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  // 提取页面描述
  extractDescription(html) {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    return descMatch ? descMatch[1].trim() : '';
  }

  // 检查语言特定页面
  async checkLanguagePages(langKey, langConfig) {
    console.log(`🔍 检查${langConfig.name}页面...`);
    
    const results = [];
    
    for (const page of langConfig.pages) {
      const fullUrl = `${SEO_CONFIG.baseUrl}${page.url}`;
      console.log(`   检查: ${page.name} (${fullUrl})`);
      
      const result = await this.checkPageStatus(fullUrl);
      result.pageName = page.name;
      result.critical = page.critical;
      result.language = langKey;
      
      results.push(result);
      this.results.summary.totalChecks++;
      
      if (result.success) {
        this.results.summary.successfulChecks++;
        console.log(`   ✅ ${page.name}: ${result.status} (${result.loadTime}ms)`);
      } else {
        this.results.summary.failedChecks++;
        if (page.critical) {
          this.results.summary.criticalIssues++;
        }
        console.log(`   ❌ ${page.name}: ${result.status || result.error}`);
      }
    }
    
    return results;
  }

  // 检查SEO文件
  async checkSEOFiles() {
    console.log('🗂️  检查SEO文件...');
    
    const results = [];
    
    for (const file of SEO_CONFIG.seoFiles) {
      const fullUrl = `${SEO_CONFIG.baseUrl}${file.url}`;
      console.log(`   检查: ${file.name} (${fullUrl})`);
      
      const result = await this.checkPageStatus(fullUrl);
      result.fileName = file.name;
      result.fileType = file.type;
      
      results.push(result);
      this.results.summary.totalChecks++;
      
      if (result.success) {
        this.results.summary.successfulChecks++;
        console.log(`   ✅ ${file.name}: ${result.status} (${result.contentLength} bytes)`);
      } else {
        this.results.summary.failedChecks++;
        console.log(`   ❌ ${file.name}: ${result.status || result.error}`);
      }
    }
    
    return results;
  }

  // 生成优化建议
  generateRecommendations() {
    console.log('💡 生成优化建议...');
    
    const recommendations = [];
    
    // 检查语言页面问题
    Object.keys(this.results.languages).forEach(langKey => {
      const langResults = this.results.languages[langKey];
      const langConfig = SEO_CONFIG.languages[langKey];
      
      langResults.forEach(result => {
        if (!result.success) {
          recommendations.push({
            type: 'error',
            language: langKey,
            message: `${langConfig.name}页面 "${result.pageName}" 无法访问: ${result.status || result.error}`,
            priority: result.critical ? 'high' : 'medium'
          });
        }
        
        if (result.success) {
          if (!result.hasMetaDescription) {
            recommendations.push({
              type: 'seo',
              language: langKey,
              message: `${langConfig.name}页面 "${result.pageName}" 缺少meta description`,
              priority: 'medium'
            });
          }
          
          if (!result.hasOpenGraph) {
            recommendations.push({
              type: 'seo',
              language: langKey,
              message: `${langConfig.name}页面 "${result.pageName}" 缺少Open Graph标签`,
              priority: 'medium'
            });
          }
          
          if (!result.hasHreflang) {
            recommendations.push({
              type: 'seo',
              language: langKey,
              message: `${langConfig.name}页面 "${result.pageName}" 缺少hreflang标签`,
              priority: 'high'
            });
          }
          
          if (result.loadTime > 3000) {
            recommendations.push({
              type: 'performance',
              language: langKey,
              message: `${langConfig.name}页面 "${result.pageName}" 加载时间过长: ${result.loadTime}ms`,
              priority: 'high'
            });
          }
        }
      });
    });
    
    // 检查SEO文件问题
    this.results.seoFiles.forEach(result => {
      if (!result.success) {
        recommendations.push({
          type: 'error',
          message: `SEO文件 "${result.fileName}" 无法访问: ${result.status || result.error}`,
          priority: 'high'
        });
      }
    });
    
    return recommendations;
  }

  // 计算性能统计
  calculatePerformanceStats() {
    console.log('📊 计算性能统计...');
    
    const allResults = [];
    
    // 收集所有页面结果
    Object.keys(this.results.languages).forEach(langKey => {
      allResults.push(...this.results.languages[langKey]);
    });
    
    const successfulResults = allResults.filter(r => r.success && r.loadTime);
    
    if (successfulResults.length === 0) {
      return {
        averageLoadTime: 0,
        fastestPage: null,
        slowestPage: null,
        performanceGrade: 'F'
      };
    }
    
    const loadTimes = successfulResults.map(r => r.loadTime);
    const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    
    const fastestResult = successfulResults.reduce((prev, current) => 
      prev.loadTime < current.loadTime ? prev : current
    );
    
    const slowestResult = successfulResults.reduce((prev, current) => 
      prev.loadTime > current.loadTime ? prev : current
    );
    
    // 性能评级
    let performanceGrade = 'F';
    if (averageLoadTime < 1000) performanceGrade = 'A';
    else if (averageLoadTime < 2000) performanceGrade = 'B';
    else if (averageLoadTime < 3000) performanceGrade = 'C';
    else if (averageLoadTime < 5000) performanceGrade = 'D';
    
    return {
      averageLoadTime: Math.round(averageLoadTime),
      fastestPage: {
        name: fastestResult.pageName,
        time: fastestResult.loadTime
      },
      slowestPage: {
        name: slowestResult.pageName,
        time: slowestResult.loadTime
      },
      performanceGrade,
      totalPages: successfulResults.length
    };
  }

  // 生成监控报告
  async generateReport() {
    console.log('🔍 开始中英文双语SEO监控...');
    console.log('========================================');
    
    try {
      // 1. 检查各语言页面
      for (const [langKey, langConfig] of Object.entries(SEO_CONFIG.languages)) {
        this.results.languages[langKey] = await this.checkLanguagePages(langKey, langConfig);
      }
      
      // 2. 检查SEO文件
      this.results.seoFiles = await this.checkSEOFiles();
      
      // 3. 生成建议
      this.results.recommendations = this.generateRecommendations();
      
      // 4. 计算性能统计
      this.results.performance = this.calculatePerformanceStats();
      
      // 5. 保存报告
      const reportDir = path.dirname(this.reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(this.reportPath, JSON.stringify(this.results, null, 2));
      
      console.log('========================================');
      console.log('📋 SEO监控摘要:');
      console.log(`✅ 成功检查: ${this.results.summary.successfulChecks}/${this.results.summary.totalChecks}`);
      console.log(`❌ 失败检查: ${this.results.summary.failedChecks}`);
      console.log(`🚨 关键问题: ${this.results.summary.criticalIssues}`);
      console.log(`⚡ 平均加载时间: ${this.results.performance.averageLoadTime}ms`);
      console.log(`📊 性能评级: ${this.results.performance.performanceGrade}`);
      
      if (this.results.recommendations.length > 0) {
        console.log('\n🎯 优化建议:');
        this.results.recommendations.slice(0, 5).forEach(rec => {
          const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          console.log(`${priority} ${rec.message}`);
        });
        
        if (this.results.recommendations.length > 5) {
          console.log(`   ... 还有 ${this.results.recommendations.length - 5} 个建议`);
        }
      }
      
      console.log(`\n📁 详细报告: ${this.reportPath}`);
      
      return this.results;
      
    } catch (error) {
      console.error('❌ SEO监控失败:', error);
      throw error;
    }
  }
}

// 执行监控
if (require.main === module) {
  const monitor = new BilingualSEOMonitor();
  monitor.generateReport().catch(console.error);
}

module.exports = BilingualSEOMonitor; 