const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3030;

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'static-pages')));

// 直接访问HTML文件 - 使用中间件处理
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const filename = req.path.substring(1); // 移除开头的 /
    const filePath = path.join(__dirname, 'static-pages', filename);
    
    if (fs.existsSync(filePath)) {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      return res.send(htmlContent);
    } else {
      return res.status(404).send(`
        <html>
          <head><title>页面未找到</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
            <h1>❌ 页面未找到</h1>
            <p>文件: ${filename}</p>
            <p><a href="/">← 返回首页</a></p>
          </body>
        </html>
      `);
    }
  }
  next();
});

// 主页 - 显示可用的页面列表
app.get('/', (req, res) => {
  const staticDir = path.join(__dirname, 'static-pages');
  
  if (!fs.existsSync(staticDir)) {
    return res.send(`
      <html>
        <head><title>SEO页面展示</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
          <h1>SEO页面展示</h1>
          <p>❌ 静态页面目录不存在</p>
          <p>请先运行 <code>node generate-seo-pages.cjs</code> 生成页面</p>
        </body>
      </html>
    `);
  }

  const files = fs.readdirSync(staticDir).filter(file => file.endsWith('.html'));
  
  const fileList = files.map(file => {
    const projectId = file.replace('.html', '');
    return `<li><a href="/preview/${projectId}">${projectId}</a> | <a href="/${file}">直接访问</a></li>`;
  }).join('');

  res.send(`
    <html>
      <head>
        <title>SEO页面展示</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          ul { list-style: none; padding: 0; }
          li { margin: 10px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          a { text-decoration: none; color: #667eea; font-weight: 500; margin-right: 10px; }
          a:hover { color: #764ba2; }
          .stats { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .demo-link { background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🎨 AI产品项目SEO页面展示</h1>
        <div class="stats">
          <strong>📊 统计信息：</strong><br>
          已生成页面数量: ${files.length}<br>
          服务器端口: ${PORT}
        </div>
        
        <h2>📋 可用页面：</h2>
        ${files.length > 0 ? `<ul>${fileList}</ul>` : '<p>暂无生成的页面</p>'}
        
        <h2>🚀 演示页面：</h2>
        <a href="/arc-portrait-enhancement-demo.html" class="demo-link">
          直接访问: ARC 人像修复演示页面
        </a>
        <a href="/preview/f738a8c4-dacc-49c5-b325-78df5b0d8dc7" class="demo-link">
          预览: Chat Video 项目页面
        </a>
        
        <h2>⚡ 快速操作：</h2>
        <p>• 生成更多页面: <code>node generate-seo-pages-fixed.cjs</code></p>
        <p>• 直接访问HTML: <code>http://localhost:${PORT}/[文件名].html</code></p>
        <p>• 预览页面: <code>http://localhost:${PORT}/preview/[项目ID]</code></p>
      </body>
    </html>
  `);
});

// 页面预览
app.get('/preview/:projectId', (req, res) => {
  const projectId = req.params.projectId;
  const filePath = path.join(__dirname, 'static-pages', `${projectId}.html`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send(`
      <html>
        <head><title>页面未找到</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1>❌ 页面未找到</h1>
          <p>项目ID: ${projectId}</p>
          <p><a href="/">← 返回首页</a></p>
        </body>
      </html>
    `);
  }
  
  // 读取并返回HTML文件
  const htmlContent = fs.readFileSync(filePath, 'utf8');
  res.send(htmlContent);
});

// API端点 - 获取页面信息
app.get('/api/pages', (req, res) => {
  const staticDir = path.join(__dirname, 'static-pages');
  
  if (!fs.existsSync(staticDir)) {
    return res.json({ error: '静态页面目录不存在' });
  }

  const files = fs.readdirSync(staticDir).filter(file => file.endsWith('.html'));
  const pages = files.map(file => {
    const projectId = file.replace('.html', '');
    const filePath = path.join(staticDir, file);
    const stats = fs.statSync(filePath);
    
    return {
      projectId,
      filename: file,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: `/preview/${projectId}`,
      directUrl: `/${file}`
    };
  });

  res.json({
    total: pages.length,
    pages
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 SEO页面服务器已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📄 页面列表: http://localhost:${PORT}/`);
  console.log(`🎯 直接访问: http://localhost:${PORT}/arc-portrait-enhancement-demo.html`);
  console.log(`🎯 预览页面: http://localhost:${PORT}/preview/f738a8c4-dacc-49c5-b325-78df5b0d8dc7`);
  console.log(`📊 API信息: http://localhost:${PORT}/api/pages`);
  console.log(`\n💡 提示: 按 Ctrl+C 停止服务器\n`);
}); 