# ProductMind AI AWS Backend 部署指南

## 🚀 完整部署流程

本指南将帮助你将 ProductMind AI 后端服务部署到 AWS ECS Fargate。

## 📋 部署前准备

### 1. 环境要求

- Node.js 18+
- Docker Desktop
- AWS CLI
- 有效的AWS账户

### 2. 安装AWS CLI

```bash
# macOS
brew install awscli

# 或下载安装包
# https://aws.amazon.com/cli/
```

### 3. 配置AWS CLI

```bash
aws configure
```

输入以下信息：
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (建议: ap-southeast-1)
- Default output format (建议: json)

### 4. 验证AWS配置

```bash
aws sts get-caller-identity
```

应该返回你的AWS账户信息。

## 🔧 配置网络参数

### 方法1: 使用配置助手（推荐）

```bash
./aws-helper.sh
```

助手脚本将：
1. 列出你的VPC
2. 显示子网信息
3. 帮助选择合适的子网
4. 自动生成 `deploy-config` 文件

### 方法2: 手动配置

1. 复制配置模板：
```bash
cp deploy-config.example deploy-config
```

2. 编辑 `deploy-config` 文件：
```bash
# AWS 网络配置
VPC_ID=vpc-xxxxxxxxx                    # 你的VPC ID
SUBNET_IDS=subnet-xxxxxxxx,subnet-yyyyyyyy  # 私有子网IDs
PUBLIC_SUBNET_IDS=subnet-aaaaaaaa,subnet-bbbbbbbb  # 公有子网IDs
```

### 获取网络信息的AWS命令

```bash
# 列出VPC
aws ec2 describe-vpcs --output table

# 列出指定VPC的子网
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-xxxxxxxxx" --output table
```

## 🎯 部署步骤

### 第1步: 测试基础功能

```bash
./deploy-aws.sh --test-only
```

这将：
- 检查环境变量
- 编译TypeScript代码
- 运行功能测试
- 验证所有端点正常工作

### 第2步: 构建Docker镜像

```bash
./deploy-aws.sh --docker-only
```

这将：
- 构建Docker镜像
- 运行本地容器测试

### 第3步: 推送到ECR

```bash
./deploy-aws.sh --push --tag v1.0.0
```

这将：
- 创建ECR仓库（如果不存在）
- 构建并推送Docker镜像
- 标记为指定版本

### 第4步: 完整部署

```bash
./deploy-aws.sh --full-deploy
```

这将：
- 配置AWS Secrets Manager
- 部署CloudFormation基础设施
- 创建ECS服务和负载均衡器

## 📊 部署选项详解

### 命令行参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--test-only` | 仅运行测试 | `./deploy-aws.sh --test-only` |
| `--docker-only` | 仅构建Docker镜像 | `./deploy-aws.sh --docker-only` |
| `--push` | 构建并推送到ECR | `./deploy-aws.sh --push` |
| `--full-deploy` | 完整部署 | `./deploy-aws.sh --full-deploy` |
| `--skip-tests` | 跳过功能测试 | `./deploy-aws.sh --skip-tests --push` |
| `--tag <version>` | 指定镜像版本 | `./deploy-aws.sh --push --tag v1.0.0` |
| `--stack-name <name>` | CloudFormation堆栈名 | `./deploy-aws.sh --full-deploy --stack-name my-stack` |

### 环境变量配置

必需变量（在 `.env` 中配置）：
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

可选变量：
```env
JWT_SECRET=your_jwt_secret
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key
REDIS_URL=redis://localhost:6379
```

## 🏗️ 部署架构

部署完成后的架构：

```
Internet
    ↓
Application Load Balancer (公有子网)
    ↓
ECS Fargate 任务 (私有子网)
    ↓
Supabase / AI APIs
```

### 资源清单

- **ECR仓库**: 存储Docker镜像
- **ECS集群**: Fargate容器运行环境
- **Application Load Balancer**: 负载均衡和健康检查
- **CloudWatch**: 日志和监控
- **Secrets Manager**: 敏感信息管理
- **IAM角色**: 权限管理

## 🔍 验证部署

### 1. 检查CloudFormation堆栈

```bash
aws cloudformation describe-stacks --stack-name productmind-backend
```

### 2. 获取负载均衡器地址

```bash
aws cloudformation describe-stacks \
  --stack-name productmind-backend \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text
```

### 3. 测试应用端点

```bash
# 替换为你的负载均衡器地址
LOAD_BALANCER_DNS="your-alb-dns-name"

# 健康检查
curl http://$LOAD_BALANCER_DNS/health

# 测试模板服务
curl http://$LOAD_BALANCER_DNS/test/templates
```

### 4. 检查ECS服务状态

```bash
aws ecs describe-services \
  --cluster productmind-cluster \
  --services productmind-service
```

### 5. 查看日志

```bash
aws logs describe-log-streams --log-group-name /ecs/productmind-aws-backend
```

## 🛠️ 故障排除

### 常见问题

1. **Docker构建失败**
   - 检查网络连接
   - 确保Docker Desktop运行
   - 尝试重新构建

2. **ECR推送失败**
   - 检查AWS权限
   - 确认region配置正确
   - 重新登录ECR

3. **CloudFormation部署失败**
   - 检查VPC和子网配置
   - 确认IAM权限
   - 查看CloudFormation事件

4. **ECS任务启动失败**
   - 检查Secrets Manager配置
   - 查看ECS任务日志
   - 验证镜像是否正确

### 调试命令

```bash
# 查看CloudFormation事件
aws cloudformation describe-stack-events --stack-name productmind-backend

# 查看ECS任务日志
aws logs get-log-events --log-group-name /ecs/productmind-aws-backend --log-stream-name <stream-name>

# 检查ECR镜像
aws ecr describe-images --repository-name productmind-aws-backend
```

## 🔄 更新部署

### 更新应用代码

```bash
# 修改代码后重新部署
./deploy-aws.sh --push --tag v1.1.0

# 更新ECS服务使用新镜像
aws ecs update-service \
  --cluster productmind-cluster \
  --service productmind-service \
  --force-new-deployment
```

### 更新基础设施

```bash
# 修改CloudFormation模板后重新部署
./deploy-aws.sh --full-deploy
```

## 🗑️ 清理资源

```bash
# 删除CloudFormation堆栈
aws cloudformation delete-stack --stack-name productmind-backend

# 删除ECR镜像
aws ecr batch-delete-image \
  --repository-name productmind-aws-backend \
  --image-ids imageTag=latest
```

## 📞 支持

如果遇到问题，请：
1. 检查上述故障排除部分
2. 查看AWS CloudWatch日志
3. 联系开发团队支持

---

**注意**: 部署过程中会产生AWS费用，请确保了解相关成本。 