# ProductMind AI AWS Backend

一个基于 AWS ECS Fargate 的高性能后端服务，专门解决 Netlify Functions 30秒超时限制问题，支持大规模模板批量生成任务。

## 🚀 项目概述

本项目是 ProductMind AI 的 AWS 后端服务，主要功能包括：

- **批量模板生成**: 支持中英双语内容生成，突破30秒限制，支持5分钟长时间处理
- **AI 服务集成**: 集成 DeepSeek 和 OpenAI API，支持自动回退机制
- **高可用架构**: 基于 AWS ECS Fargate，支持自动扩缩容和负载均衡
- **完整监控**: 集成 CloudWatch 日志和健康检查
- **安全配置**: 使用 AWS Secrets Manager 管理敏感信息

## 📋 技术栈

- **运行时**: Node.js 18 + Express.js
- **语言**: TypeScript
- **数据库**: Supabase
- **AI 服务**: DeepSeek API + OpenAI API
- **缓存/队列**: Redis
- **容器化**: Docker + AWS ECS Fargate
- **负载均衡**: AWS Application Load Balancer
- **日志**: Winston + CloudWatch
- **监控**: AWS CloudWatch + 健康检查

## 🏗️ 项目结构

```
aws-backend/
├── src/                          # 源代码
│   ├── middleware/              # 中间件
│   │   ├── authMiddleware.ts    # JWT 认证
│   │   ├── errorHandler.ts     # 错误处理
│   │   └── requestLogger.ts    # 请求日志
│   ├── routes/                  # 路由
│   │   ├── healthRoutes.ts      # 健康检查
│   │   ├── templateRoutes.ts    # 模板生成
│   │   └── queueRoutes.ts       # 队列管理
│   ├── services/                # 服务层
│   │   ├── supabaseService.ts   # 数据库操作
│   │   ├── aiService.ts         # AI 内容生成
│   │   └── redisService.ts      # Redis 连接
│   ├── utils/                   # 工具函数
│   │   └── logger.ts            # 日志服务
│   ├── healthcheck.ts           # Docker 健康检查
│   └── server.ts                # 主服务器文件
├── aws/                         # AWS 部署配置
│   ├── task-definition.json     # ECS 任务定义
│   └── cloudformation-template.yaml # CloudFormation 模板
├── dist/                        # 编译输出
├── Dockerfile                   # Docker 配置
├── deploy.sh                    # 部署脚本
├── package.json                 # 依赖配置
├── tsconfig.json               # TypeScript 配置
└── README.md                    # 项目文档
```

## 🔧 本地开发

### 环境要求

- Node.js 18+
- Docker (可选)
- AWS CLI (用于部署)

### 安装依赖

```bash
npm install
```

### 环境变量配置

创建 `.env` 文件：

```env
# 基础配置
NODE_ENV=development
PORT=3000
API_VERSION=v1

# 跨域配置
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT 认证
JWT_SECRET=your_jwt_secret_key

# AI API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key

# Redis 配置 (可选)
REDIS_URL=redis://localhost:6379

# AWS 配置
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-southeast-1
```

### 开发模式启动

```bash
# 编译 TypeScript
npm run build

# 启动服务器
npm start

# 或者使用开发模式（自动重启）
npm run dev
```

### API 测试

```bash
# 健康检查
curl http://localhost:3000/health

# 测试模板服务
curl http://localhost:3000/test/templates

# 测试批量生成（演示模式）
curl -X POST http://localhost:3000/test/batch-generate \
  -H "Content-Type: application/json" \
  -d '{"demoMode": true, "languages": ["zh", "en"]}'

# 认证 API 测试（需要有效 JWT token）
curl -X POST http://localhost:3000/api/v1/templates/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"languages": ["zh"], "limit": 5}'
```

## 🚀 部署到 AWS

### 使用自动部署脚本

```bash
# 基础部署（编译 + 测试）
./deploy.sh

# 包含 Docker 镜像构建
./deploy.sh latest

# 构建并推送到 ECR
./deploy.sh latest push
```

### 手动部署步骤

#### 1. 准备 AWS 环境

```bash
# 配置 AWS CLI
aws configure

# 创建 ECR 仓库
aws ecr create-repository --repository-name productmind-aws-backend

# 获取登录令牌
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account.dkr.ecr.your-region.amazonaws.com
```

#### 2. 构建和推送 Docker 镜像

```bash
# 构建镜像
docker build -t productmind-aws-backend:latest .

# 标记镜像
docker tag productmind-aws-backend:latest your-account.dkr.ecr.your-region.amazonaws.com/productmind-aws-backend:latest

# 推送镜像
docker push your-account.dkr.ecr.your-region.amazonaws.com/productmind-aws-backend:latest
```

#### 3. 部署 CloudFormation 堆栈

```bash
# 部署基础设施
aws cloudformation deploy \
  --template-file aws/cloudformation-template.yaml \
  --stack-name productmind-backend \
  --parameter-overrides \
    VpcId=vpc-xxxxxxxxx \
    SubnetIds=subnet-xxxxxxxx,subnet-yyyyyyyy \
    PublicSubnetIds=subnet-aaaaaaaa,subnet-bbbbbbbb \
  --capabilities CAPABILITY_IAM
```

#### 4. 配置 Secrets Manager

```bash
# 配置 Supabase URL
aws secretsmanager create-secret \
  --name productmind/supabase-url \
  --secret-string '{"SUPABASE_URL":"your_supabase_url"}'

# 配置 Supabase Key
aws secretsmanager create-secret \
  --name productmind/supabase-anon-key \
  --secret-string '{"SUPABASE_ANON_KEY":"your_supabase_key"}'

# 配置 AI API Keys
aws secretsmanager create-secret \
  --name productmind/deepseek-api-key \
  --secret-string '{"DEEPSEEK_API_KEY":"your_deepseek_key"}'

aws secretsmanager create-secret \
  --name productmind/openai-api-key \
  --secret-string '{"OPENAI_API_KEY":"your_openai_key"}'
```

## 📊 监控和日志

### CloudWatch 日志

- 日志组: `/ecs/productmind-aws-backend`
- 保留期: 7 天
- 实时流式传输

### 健康检查

- **基础检查**: `GET /health`
- **详细检查**: `GET /health/detailed`
- **就绪检查**: `GET /health/ready`
- **存活检查**: `GET /health/live`

### 监控指标

- CPU 利用率
- 内存使用率
- 请求延迟
- 错误率
- 任务健康状态

## 🔧 配置选项

### 环境变量

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `development` | ✅ |
| `PORT` | 服务端口 | `3000` | ✅ |
| `SUPABASE_URL` | Supabase 地址 | - | ✅ |
| `SUPABASE_ANON_KEY` | Supabase 密钥 | - | ✅ |
| `JWT_SECRET` | JWT 密钥 | - | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | - | ❌ |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - | ❌ |
| `REDIS_URL` | Redis 连接地址 | - | ❌ |
| `CORS_ORIGIN` | 允许的跨域来源 | `*` | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | 速率限制 | `100` | ❌ |

### 服务配置

- **CPU**: 512 vCPU (0.5 核)
- **内存**: 1024 MB (1 GB)
- **最大执行时间**: 5 分钟（无 30 秒限制）
- **自动扩缩容**: 最小 1 个实例，最大 10 个实例
- **健康检查间隔**: 30 秒

## 🔐 安全考虑

- 使用 AWS Secrets Manager 存储敏感信息
- JWT 认证保护 API 端点
- 速率限制防止 API 滥用
- VPC 私有子网部署
- 安全组限制网络访问
- Docker 非 root 用户运行

## 🚨 故障排除

### 常见问题

1. **服务启动失败**
   ```bash
   # 检查日志
   aws logs get-log-events --log-group-name /ecs/productmind-aws-backend
   ```

2. **健康检查失败**
   ```bash
   # 本地测试健康检查
   curl http://localhost:3000/health
   ```

3. **认证问题**
   ```bash
   # 验证 JWT token
   node -e "console.log(require('jsonwebtoken').verify('your_token', 'your_secret'))"
   ```

4. **数据库连接问题**
   ```bash
   # 测试 Supabase 连接
   curl -H "apikey: your_supabase_key" "your_supabase_url/rest/v1/"
   ```

### 日志级别

- `error`: 系统错误和异常
- `warn`: 警告和性能问题
- `info`: 一般信息和操作记录
- `debug`: 调试信息（仅开发模式）

## 📈 性能优化

- **批量处理**: 支持批量生成，提高处理效率
- **缓存策略**: Redis 缓存常用数据
- **连接池**: 数据库连接池优化
- **异步处理**: 非阻塞异步操作
- **健康检查**: 快速响应健康状态

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如需帮助，请联系：
- 邮箱: support@productmind.ai
- 文档: [项目文档](https://docs.productmind.ai)
- 问题跟踪: [GitHub Issues](https://github.com/productmind/aws-backend/issues)

---

**注意**: 本项目专门用于解决 Netlify Functions 30秒超时限制，提供可扩展的批量处理能力。 