# ProductMind AI 后端服务使用指南

## 📋 项目概述

ProductMind AI 后端服务提供了批量生产模板内容的功能，主要包含两个核心服务：

1. **aiService.ts** - AI内容生成服务
2. **batchProductionService.ts** - 批量生产服务

## 🚀 快速启动

### 方法1：使用启动脚本（推荐）

```bash
# 在项目根目录运行
./start-backend.sh
```

### 方法2：使用简单API测试服务器

```bash
# 在项目根目录运行
node test-api.mjs
```

### 方法3：手动启动aws-backend服务

```bash
cd aws-backend
npm install
cp env.example .env
# 编辑 .env 文件配置必要的环境变量
npm run dev
```

## 🔧 环境变量配置

在 `aws-backend/.env` 文件中配置以下变量：

```bash
# 必须配置的变量
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key

# 可选配置
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## 📚 API接口说明

### 1. 健康检查
```bash
GET /health

# 响应示例
{
  "status": "ok",
  "timestamp": "2025-06-19T08:40:39.860Z",
  "uptime": 2.582282236
}
```

### 2. 批量生产模板内容
```bash
POST /api/batch-production

# 请求体
{
  "limitProjects": 2,      // 限制处理的项目数量
  "limitTemplates": 2,     // 限制处理的模板数量
  "batchSize": 3,          // 批处理大小
  "dryRun": false,         // 是否为演示模式
  "skipExisting": true     // 是否跳过已存在的版本
}

# 响应示例
{
  "success": true,
  "stats": {
    "total": 4,
    "generated": 4,
    "skipped": 0,
    "failed": 0
  },
  "details": [
    {
      "projectId": "project_1",
      "projectName": "项目1",
      "templateId": "template_1",
      "templateName": "模板1",
      "status": "generated",
      "versionId": "v1750322446403_1_1",
      "contentLengths": {
        "outputContentEn": 1286,
        "outputContentZh": 1277
      }
    }
  ],
  "execution": {
    "startTime": "2025-06-19T08:40:46.403Z",
    "endTime": "2025-06-19T08:40:46.403Z",
    "duration": "1.5s"
  }
}
```

### 3. 获取模板列表
```bash
GET /api/templates

# 响应示例
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name_zh": "产品需求文档",
      "name_en": "PRD",
      "category": "product"
    }
  ],
  "total": 3
}
```

### 4. 获取项目列表
```bash
GET /api/projects

# 响应示例
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "AI智能助手",
      "description": "基于深度学习的对话系统"
    }
  ],
  "total": 3
}
```

## 🔬 核心服务功能

### aiService.ts

AI内容生成服务，支持：

- **多AI提供商**: DeepSeek、OpenAI
- **自动回退**: 主提供商失败时自动切换
- **双语生成**: 支持中英文内容生成
- **智能提示**: 基于项目信息和模板要求生成内容

主要方法：
```typescript
// 生成单个内容
await aiService.generateContent({
  prompt: "生成产品需求文档",
  project: { name: "AI助手", description: "智能对话系统" },
  template: { name_zh: "产品需求文档", name_en: "PRD" },
  language: "zh"
});

// 生成双语内容
await aiService.generateBilingualContent({
  prompt: "生成产品需求文档",
  project: { name: "AI助手", description: "智能对话系统" },
  template: { name_zh: "产品需求文档", name_en: "PRD" }
});
```

### batchProductionService.ts

批量生产服务，功能包括：

- **批量处理**: 支持大规模项目和模板的组合生成
- **智能跳过**: 检查并跳过已存在的版本
- **分批执行**: 避免过度负载，支持可配置的批处理大小
- **双语生成**: 自动生成英文和中文版本
- **错误恢复**: 单个任务失败不影响整体流程

主要方法：
```typescript
await batchProductionService.batchProductionTemplates({
  batchSize: 3,           // 批处理大小
  dryRun: false,          // 是否为演示模式
  skipExisting: true,     // 跳过已存在版本
  limitProjects: 10,      // 限制项目数量
  limitTemplates: 10      // 限制模板数量
});
```

## 🧪 测试命令

### 基础测试
```bash
# 健康检查
curl http://localhost:3000/health

# 获取模板列表
curl http://localhost:3000/api/templates

# 获取项目列表
curl http://localhost:3000/api/projects
```

### 批量生产测试
```bash
# 小规模测试（2个项目 × 2个模板）
curl -X POST http://localhost:3000/api/batch-production \
  -H "Content-Type: application/json" \
  -d '{"limitProjects":2,"limitTemplates":2}'

# 演示模式（不实际生成）
curl -X POST http://localhost:3000/api/batch-production \
  -H "Content-Type: application/json" \
  -d '{"limitProjects":5,"limitTemplates":3,"dryRun":true}'

# 完整测试（5个项目 × 3个模板）
curl -X POST http://localhost:3000/api/batch-production \
  -H "Content-Type: application/json" \
  -d '{"limitProjects":5,"limitTemplates":3,"batchSize":2}'
```

## 📊 数据库结构

服务依赖以下Supabase表：

- **templates**: 模板表，包含prompt_content和mdcprompt
- **template_categories**: 模板分类表，isshow=1的模板参与生成
- **user_projects**: 用户项目表
- **template_versions**: 生成的版本表，存储最终内容

## 🔄 批量生产流程

1. **获取可用模板**: 查询isshow=1的template_categories对应的templates
2. **获取项目列表**: 从user_projects表获取项目信息
3. **生成任务列表**: 排除template_versions中已存在的组合
4. **分批执行生成**:
   - 使用prompt_content生成英文版本
   - 翻译成中文版本
   - 使用mdcprompt生成Cursor规则文件
   - 保存到template_versions表

## 🎯 使用建议

1. **环境配置**: 确保配置了有效的API密钥
2. **小规模测试**: 先用小数据量测试（limitProjects=2, limitTemplates=2）
3. **监控日志**: 观察控制台输出了解处理进度
4. **错误处理**: 检查返回的details数组中的failed状态
5. **性能优化**: 根据API限制调整batchSize参数

## 🐛 故障排查

### 常见问题

1. **API密钥错误**: 检查DEEPSEEK_API_KEY或OPENAI_API_KEY配置
2. **数据库连接失败**: 检查SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY
3. **端口占用**: 使用`lsof -ti:3000`检查端口状态
4. **模块导入错误**: 确保使用正确的ESM导入语法

### 调试命令
```bash
# 检查环境变量
node -e "console.log(process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置')"

# 检查端口占用
lsof -ti:3000

# 杀死占用端口的进程
kill -9 $(lsof -ti:3000)
```

## 📈 性能特征

- **并发处理**: 支持批量并发生成
- **内存使用**: 适中，主要取决于生成内容的大小
- **API限制**: 受AI提供商的速率限制约束
- **可扩展性**: 支持水平扩展和负载均衡

## 🎉 成功案例

使用本服务可以实现：
- 一次性为多个项目生成完整的文档集合
- 自动化的双语内容生成
- 大规模的模板内容批量生产
- 智能的版本管理和重复检测 