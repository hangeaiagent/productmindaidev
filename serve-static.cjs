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

// 添加static-pages/pdhtml目录的静态文件服务
app.use('/static-pages/pdhtml', express.static(path.join(__dirname, 'static-pages', 'pdhtml')));

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
  const pdhtmlDir = path.join(__dirname, 'static-pages', 'pdhtml');
  
  if (!fs.existsSync(staticDir)) {
    return res.send(`
      <html>
        <head><title>SEO页面展示</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
          <h1>SEO页面展示</h1>
          <p>❌ 静态页面目录不存在</p>
          <p>请先运行 <code>node aws-backend/enhanced-template-generator.mjs</code> 生成页面</p>
        </body>
      </html>
    `);
  }

  // 获取旧版本的页面文件
  const oldFiles = fs.readdirSync(staticDir).filter(file => file.endsWith('.html'));
  
  // 获取新版本的模板详情页面
  let templateFiles = [];
  if (fs.existsSync(pdhtmlDir)) {
    const projectDirs = fs.readdirSync(pdhtmlDir);
    projectDirs.forEach(projectDir => {
      const projectPath = path.join(pdhtmlDir, projectDir);
      if (fs.statSync(projectPath).isDirectory()) {
        const htmlFiles = fs.readdirSync(projectPath).filter(file => file.endsWith('.html'));
        htmlFiles.forEach(file => {
          const templateId = file.replace('.html', '').replace('en', '');
          const isEnglish = file.includes('en.html');
          templateFiles.push({
            templateId,
            filename: file,
            projectId: projectDir,
            language: isEnglish ? 'en' : 'zh',
            fullPath: path.join('pdhtml', projectDir, file)
          });
        });
      }
    });
  }

  // 生成旧版本文件列表
  const oldFileList = oldFiles.map(file => {
    const projectId = file.replace('.html', '');
    return `<li><strong>旧版本:</strong> <a href="/preview/${projectId}">${projectId}</a> | <a href="/${file}">直接访问</a></li>`;
  }).join('');

  // 生成新版本模板详情页面列表
  const templateFileList = templateFiles.map(template => {
    const lang = template.language === 'en' ? '英文' : '中文';
    const previewUrl = template.language === 'en' ? `/preview/${template.templateId}-en` : `/preview/${template.templateId}`;
    return `<li><strong>模板详情 (${lang}):</strong> <a href="${previewUrl}">${template.templateId}</a> | 项目: ${template.projectId}</li>`;
  }).join('');

  res.send(`
    <html>
      <head>
        <title>ProductMind AI - SEO页面展示中心</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            max-width: 1200px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          h1 { 
            color: #333; 
            text-align: center;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          h2 { color: #555; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          ul { list-style: none; padding: 0; }
          li { 
            margin: 10px 0; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border-left: 4px solid #667eea;
          }
          a { 
            text-decoration: none; 
            color: #667eea; 
            font-weight: 500; 
            margin-right: 15px; 
          }
          a:hover { color: #764ba2; }
          .stats { 
            background: linear-gradient(135deg, #e8f4fd 0%, #f0e8ff 100%); 
            padding: 20px; 
            border-radius: 12px; 
            margin: 20px 0; 
            border: 1px solid #667eea;
          }
          .demo-link { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 12px 24px; 
            border-radius: 8px; 
            display: inline-block; 
            margin: 10px 10px 10px 0; 
            transition: transform 0.2s;
          }
          .demo-link:hover { transform: translateY(-2px); }
          .section { margin: 30px 0; }
          .highlight { background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎨 ProductMind AI - SEO页面展示中心</h1>
          
        <div class="stats">
          <strong>📊 统计信息：</strong><br>
            模板详情页面: ${templateFiles.length} 个<br>
            旧版本页面: ${oldFiles.length} 个<br>
            服务器端口: ${PORT}<br>
            <strong>版本:</strong> Enhanced Template Generator v2.0.0
          </div>
          
          <div class="section">
            <h2>🎯 最新模板详情页面 (重构版)</h2>
            <div class="highlight">
              ✨ 包含面包屑导航、侧边栏、完整SEO优化和品牌一致性设计
            </div>
            ${templateFiles.length > 0 ? `<ul>${templateFileList}</ul>` : '<p>暂无生成的模板详情页面，请运行 <code>node aws-backend/enhanced-template-generator.mjs</code></p>'}
        </div>
        
          <div class="section">
            <h2>📋 旧版本页面</h2>
            ${oldFiles.length > 0 ? `<ul>${oldFileList}</ul>` : '<p>暂无旧版本页面</p>'}
          </div>
          
          <div class="section">
            <h2>🚀 快速演示：</h2>
            <a href="/preview/0077993c-1cfd-4175-892e-5dcfa12b09f2" class="demo-link">
              📄 模板详情演示 (中文)
            </a>
            <a href="/preview/0077993c-1cfd-4175-892e-5dcfa12b09f2-en" class="demo-link">
              📄 模板详情演示 (英文)
        </a>
        <a href="/preview/f738a8c4-dacc-49c5-b325-78df5b0d8dc7" class="demo-link">
              🎬 Chat Video 项目
        </a>
          </div>
          
          <div class="section">
            <h2>⚡ 开发工具：</h2>
            <p><strong>生成模板详情页面:</strong> <code>node aws-backend/enhanced-template-generator.mjs</code></p>
            <p><strong>生成单个页面:</strong> <code>node aws-backend/enhanced-template-generator.mjs --id [模板版本ID]</code></p>
            <p><strong>API信息:</strong> <a href="/api/pages">GET /api/pages</a></p>
            <p><strong>直接访问:</strong> <code>http://localhost:${PORT}/preview/[模板版本ID]</code></p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// 页面预览 - 支持模板版本ID
app.get('/preview/:templateId', async (req, res) => {
  const templateId = req.params.templateId;
  
  // 首先尝试在pdhtml目录下查找
  const pdhtmlDir = path.join(__dirname, 'static-pages', 'pdhtml');
  if (fs.existsSync(pdhtmlDir)) {
    // 遍历所有项目目录
    const projectDirs = fs.readdirSync(pdhtmlDir);
    for (const projectDir of projectDirs) {
      const projectPath = path.join(pdhtmlDir, projectDir);
      if (fs.statSync(projectPath).isDirectory()) {
        const templateFile = path.join(projectPath, `${templateId}.html`);
        if (fs.existsSync(templateFile)) {
          return res.sendFile(templateFile);
        }
      }
    }
  }
  
  // 回退到旧的静态页面目录
  const oldFilePath = path.join(__dirname, 'static-pages', `${templateId}.html`);
  if (fs.existsSync(oldFilePath)) {
    return res.sendFile(oldFilePath);
  }
  
  res.status(404).send(`
    <html>
      <head><title>页面未找到</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
        <h1>❌ 页面未找到</h1>
        <p>模板ID: ${templateId}</p>
        <p><a href="/">← 返回首页</a></p>
      </body>
    </html>
  `);
});

// 添加英文版本路由
app.get('/preview/:templateId-en', async (req, res) => {
  const templateId = req.params.templateId;
  
  // 首先尝试在pdhtml目录下查找
  const pdhtmlDir = path.join(__dirname, 'static-pages', 'pdhtml');
  if (fs.existsSync(pdhtmlDir)) {
    // 遍历所有项目目录
    const projectDirs = fs.readdirSync(pdhtmlDir);
    for (const projectDir of projectDirs) {
      const projectPath = path.join(pdhtmlDir, projectDir);
      if (fs.statSync(projectPath).isDirectory()) {
        const templateFile = path.join(projectPath, `${templateId}en.html`);
        if (fs.existsSync(templateFile)) {
          return res.sendFile(templateFile);
        }
      }
    }
  }
  
  // 回退到旧的静态页面目录
  const oldFilePath = path.join(__dirname, 'static-pages', `${templateId}-en.html`);
  if (fs.existsSync(oldFilePath)) {
    return res.sendFile(oldFilePath);
  }
  
    res.status(404).send('Page not found');
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