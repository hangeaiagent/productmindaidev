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

// 模拟的AI服务
const mockAiService = {
  async generateContent(request) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 模拟DeepSeek Reasoner生成的技术文档内容
    const content = request.language === 'zh' 
      ? `# ${request.template.name_zh}\n\n## 项目概述\n\n**项目名称**: ${request.project.name}\n**项目描述**: ${request.project.description}\n\n## 技术架构设计\n\n### 1. 系统架构\n- **前端**: React + TypeScript + Vite\n- **后端**: Node.js + Express + TypeScript\n- **数据库**: PostgreSQL + Redis\n- **部署**: Docker + AWS ECS\n\n### 2. 核心技术选型\n\n#### 前端技术栈\n\`\`\`typescript\n// React组件示例\nimport React from 'react';\nimport { useState, useEffect } from 'react';\n\ninterface ProjectProps {\n  name: string;\n  description: string;\n}\n\nconst ProjectCard: React.FC<ProjectProps> = ({ name, description }) => {\n  return (\n    <div className="project-card">\n      <h3>{name}</h3>\n      <p>{description}</p>\n    </div>\n  );\n};\n\`\`\`\n\n#### 后端架构\n\`\`\`typescript\n// Express路由示例\nimport express from 'express';\nimport { ProjectService } from './services/ProjectService';\n\nconst router = express.Router();\nconst projectService = new ProjectService();\n\nrouter.get('/projects', async (req, res) => {\n  try {\n    const projects = await projectService.getAllProjects();\n    res.json({ success: true, data: projects });\n  } catch (error) {\n    res.status(500).json({ success: false, error: error.message });\n  }\n});\n\`\`\`\n\n### 3. 数据库设计\n\n#### 项目表结构\n\`\`\`sql\nCREATE TABLE projects (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name VARCHAR(255) NOT NULL,\n  description TEXT,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\nCREATE INDEX idx_projects_name ON projects(name);\n\`\`\`\n\n### 4. 性能优化策略\n\n1. **缓存策略**: 使用Redis缓存热点数据\n2. **数据库优化**: 合理使用索引，查询优化\n3. **CDN部署**: 静态资源通过CDN分发\n4. **负载均衡**: 使用Nginx进行负载均衡\n\n### 5. 安全措施\n\n- JWT认证授权\n- HTTPS加密传输\n- SQL注入防护\n- XSS攻击防护\n- CORS配置\n\n### 6. 监控与日志\n\n- 使用Winston进行日志管理\n- 集成APM监控\n- 健康检查接口\n- 错误报警机制\n\n基于DeepSeek Reasoner AI模型生成的${request.template.name_zh}。`
      : `# ${request.template.name_en}\n\n## Project Overview\n\n**Project Name**: ${request.project.name}\n**Project Description**: ${request.project.description}\n\n## Technical Architecture Design\n\n### 1. System Architecture\n- **Frontend**: React + TypeScript + Vite\n- **Backend**: Node.js + Express + TypeScript\n- **Database**: PostgreSQL + Redis\n- **Deployment**: Docker + AWS ECS\n\n### 2. Core Technology Stack\n\n#### Frontend Technologies\n\`\`\`typescript\n// React Component Example\nimport React from 'react';\nimport { useState, useEffect } from 'react';\n\ninterface ProjectProps {\n  name: string;\n  description: string;\n}\n\nconst ProjectCard: React.FC<ProjectProps> = ({ name, description }) => {\n  return (\n    <div className="project-card">\n      <h3>{name}</h3>\n      <p>{description}</p>\n    </div>\n  );\n};\n\`\`\`\n\n#### Backend Architecture\n\`\`\`typescript\n// Express Route Example\nimport express from 'express';\nimport { ProjectService } from './services/ProjectService';\n\nconst router = express.Router();\nconst projectService = new ProjectService();\n\nrouter.get('/projects', async (req, res) => {\n  try {\n    const projects = await projectService.getAllProjects();\n    res.json({ success: true, data: projects });\n  } catch (error) {\n    res.status(500).json({ success: false, error: error.message });\n  }\n});\n\`\`\`\n\n### 3. Database Design\n\n#### Projects Table Schema\n\`\`\`sql\nCREATE TABLE projects (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name VARCHAR(255) NOT NULL,\n  description TEXT,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\nCREATE INDEX idx_projects_name ON projects(name);\n\`\`\`\n\n### 4. Performance Optimization\n\n1. **Caching Strategy**: Use Redis for hot data caching\n2. **Database Optimization**: Proper indexing and query optimization\n3. **CDN Deployment**: Static assets served via CDN\n4. **Load Balancing**: Nginx for load balancing\n\n### 5. Security Measures\n\n- JWT Authentication & Authorization\n- HTTPS Encryption\n- SQL Injection Protection\n- XSS Attack Prevention\n- CORS Configuration\n\n### 6. Monitoring & Logging\n\n- Winston for log management\n- APM monitoring integration\n- Health check endpoints\n- Error alerting system\n\nGenerated by DeepSeek Reasoner AI model for ${request.template.name_en}.`;
    
    return {
      content,
      status: 'success',
      model: 'deepseek-reasoner',
      tokens: Math.floor(Math.random() * 3000) + 2000, // 更多token反映复杂的技术文档
      reasoning_tokens: Math.floor(Math.random() * 1000) + 500 // DeepSeek Reasoner特有的推理token
    };
  }
};

// 单个内容生成API
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, project, template, language = 'zh', maxTokens = 8000 } = req.body;
    
    if (!prompt || !project || !template) {
      return res.status(400).json({ error: '缺少必要参数：prompt, project, template' });
    }
    
    console.log(`🤖 生成请求: ${template.name_zh || template.name_en} (${language}) - 使用DeepSeek Reasoner`);
    
    const request = { prompt, project, template, language, maxTokens };
    const result = await mockAiService.generateContent(request);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      model: 'deepseek-reasoner'
    });
    
  } catch (error) {
    console.error('生成错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API测试服务器启动在 http://localhost:${PORT}`);
  console.log('📚 可用接口:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/api/templates`);
  console.log(`  GET  http://localhost:${PORT}/api/projects`);
  console.log(`  POST http://localhost:${PORT}/api/batch-production`);
  console.log(`  POST http://localhost:${PORT}/api/generate`);
  console.log('\n🧪 测试命令:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/batch-production -H "Content-Type: application/json" -d '{"limitProjects":2,"limitTemplates":2}'`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/generate -H "Content-Type: application/json" -d '{"prompt":"","project":"","template":"","language":"zh","maxTokens":8000}'`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
}); 