import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 批量生产API
app.post('/api/batch-production', async (req, res) => {
  const { limitProjects = 2, limitTemplates = 2, dryRun = false } = req.body;
  
  console.log('📋 收到批量生产请求:', { limitProjects, limitTemplates, dryRun });
  
  // 模拟批量生产过程
  const mockResult = {
    success: true,
    stats: {
      total: limitProjects * limitTemplates,
      generated: dryRun ? 0 : limitProjects * limitTemplates,
      skipped: 0,
      failed: 0
    },
    details: [],
    execution: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: '1.5s'
    }
  };
  
  if (!dryRun) {
    for (let i = 1; i <= limitProjects; i++) {
      for (let j = 1; j <= limitTemplates; j++) {
        mockResult.details.push({
          projectId: `project_${i}`,
          projectName: `项目${i}`,
          templateId: `template_${j}`,
          templateName: `模板${j}`,
          status: 'generated',
          versionId: `v${Date.now()}_${i}_${j}`,
          contentLengths: {
            outputContentEn: Math.floor(Math.random() * 1000) + 500,
            outputContentZh: Math.floor(Math.random() * 1000) + 500
          }
        });
      }
    }
  }
  
  res.json(mockResult);
});

// 模板列表
app.get('/api/templates', (req, res) => {
  const templates = [
    { id: '1', name_zh: '产品需求文档', name_en: 'PRD', category: 'product' },
    { id: '2', name_zh: '商业计划书', name_en: 'Business Plan', category: 'business' },
    { id: '3', name_zh: '技术架构文档', name_en: 'Tech Doc', category: 'technical' }
  ];
  
  res.json({ success: true, data: templates, total: templates.length });
});

// 项目列表
app.get('/api/projects', (req, res) => {
  const projects = [
    { id: '1', name: 'AI智能助手', description: '基于深度学习的对话系统' },
    { id: '2', name: '区块链钱包', description: '安全的数字资产管理工具' },
    { id: '3', name: '在线教育平台', description: '互动式学习平台' }
  ];
  
  res.json({ success: true, data: projects, total: projects.length });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API测试服务器启动在 http://localhost:${PORT}`);
  console.log('📚 可用接口:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/api/templates`);
  console.log(`  GET  http://localhost:${PORT}/api/projects`);
  console.log(`  POST http://localhost:${PORT}/api/batch-production`);
  console.log('\n🧪 测试命令:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/batch-production -H "Content-Type: application/json" -d '{"limitProjects":2,"limitTemplates":2}'`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
}); 