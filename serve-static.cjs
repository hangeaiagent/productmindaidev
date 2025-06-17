const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 检查环境变量
console.log('🔧 环境变量检查:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? '已设置' : '未设置',
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '已设置' : '未设置',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置',
  VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置'
});

const templateService = require('./template-service.cjs');

const app = express();
const PORT = process.env.PORT || 3030;

// 使用templateService中的状态管理
const { generationStates, startTemplateGeneration, getGenerationStatus } = templateService;

app.use(express.json());

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
app.get('/preview/:projectId', async (req, res) => {
  const projectId = req.params.projectId;
  const filePath = path.join(__dirname, 'static-pages', `${projectId}.html`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
});

// 添加英文版本路由
app.get('/preview/:projectId-en', async (req, res) => {
  const projectId = req.params.projectId;
  const filePath = path.join(__dirname, 'static-pages', `${projectId}-en.html`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
});

// 添加直接访问路由
app.get('/:projectId', async (req, res) => {
  const projectId = req.params.projectId;
  const filePath = path.join(__dirname, 'static-pages', `${projectId}.html`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
});

// 添加英文版本直接访问路由
app.get('/:projectId-en', async (req, res) => {
  const projectId = req.params.projectId;
  const filePath = path.join(__dirname, 'static-pages', `${projectId}-en.html`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
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

// PATCH-v2.1.3: 生成模板API增强版本 - 修复参数传递和数据库保存
app.post('/api/generate-template', async (req, res) => {
  try {
    const { projectId, templateId } = req.body;
    
    // 验证参数
    if (typeof projectId !== 'string' || typeof templateId !== 'string') {
      return res.status(400).json({
        success: false,
        error: '无效的参数格式'
      });
    }

    // 使用templateService启动生成任务
    const result = await startTemplateGeneration(projectId, templateId);
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    // 返回任务信息
    res.json({
      ...result,
      statusUrl: `/api/generation-status/${result.taskId}`
    });
  } catch (error) {
    console.error('[PATCH-v2.1.3] 生成任务失败:', error);
    res.status(500).json({
      success: false,
      message: '[PATCH-v2.1.3] 生成任务失败',
      error: error.message
    });
  }
});

// PATCH-v2.1.3: 获取生成状态API
app.get('/api/generation-status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const result = getGenerationStatus(taskId);
  res.status(result.success ? 200 : 404).json(result);
});

// PATCH-v2.1.3: 下载生成的模板文件 - 修复文件名编码问题
app.get('/api/download-template/:taskId', (req, res) => {
  const { taskId } = req.params;
  const state = templateService.getGenerationStatus(taskId);
  
  if (!state.success || !state.completed || state.status === 'failed') {
    console.log('[PATCH-v2.1.3] 文件下载失败 - 任务未完成或失败:', taskId);
    return res.status(404).json({
      success: false,
      message: '[PATCH-v2.1.3] 文件未准备好或生成失败'
    });
  }

  console.log('[PATCH-v2.1.3] 开始文件下载:', taskId);
  
  // 模拟文件内容
  const content = `# ${state.result.templateName}

## 项目信息
- 项目ID: ${state.projectId}
- 模板ID: ${state.templateId}
- 生成时间: ${state.completedTime}

## 生成内容
${state.result.generatedContent}

---
*本文档由 ProductMind AI [PATCH-v2.1.3] 自动生成*`;

  // 设置下载头
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="template-${state.templateId}.md"`);
  
  res.send(content);
});

app.listen(PORT, () => {
  console.log('🚀 SEO页面服务器已启动 [PATCH-v2.1.3]');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📄 页面列表: http://localhost:${PORT}/`);
  console.log(`🎯 预览页面: http://localhost:${PORT}/preview/f738a8c4-dacc-49c5-b325-78df5b0d8dc7`);
  console.log(`📊 API信息: http://localhost:${PORT}/api/pages`);
  console.log(`🔄 [PATCH-v2.1.3] 新增功能: 修复参数传递错误和文件下载问题`);
  console.log(`🔧 [PATCH-v2.1.3] 修复: event对象参数错误，文件名编码问题`);
  console.log('💡 提示: 按 Ctrl+C 停止服务器');
}); 