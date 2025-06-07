# AWS ECS Fargate 完整部署指南

## 🚀 概述

本指南将帮助您将ProductMind后端部署到AWS ECS Fargate，解决Netlify Functions 30秒超时限制问题。

## 📋 前提条件

### 1. 必需的工具
- ✅ AWS CLI (已安装)
- ✅ Node.js 18+ (已安装)
- ✅ Docker (已安装)
- ⚠️ jq (可选，用于JSON解析)

### 2. AWS账户要求
- 有效的AWS账户
- 具有以下权限的IAM用户：
  - ECS Full Access
  - ECR Full Access
  - CloudFormation Full Access
  - IAM Role Creation
  - VPC Management
  - Application Load Balancer
  - CloudWatch Logs

## 🔧 部署步骤

### 第一步：配置AWS认证

```bash
# 配置AWS认证信息
aws configure

# 输入以下信息：
# AWS Access Key ID: [您的访问密钥ID]
# AWS Secret Access Key: [您的秘密访问密钥]
# Default region name: us-east-1 (推荐)
# Default output format: json
```

验证配置：
```bash
aws sts get-caller-identity
```

### 第二步：准备项目

```bash
# 确保在aws-backend目录中
cd aws-backend

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
```

### 第三步：选择部署方式

我们提供了两种部署脚本：

#### 方式一：增强版部署（推荐）
使用AWS CodeBuild构建Docker镜像，解决本地网络问题：

```bash
# 查看帮助
./deploy-aws-enhanced.sh --help

# 仅运行测试
./deploy-aws-enhanced.sh --test-only

# 完整部署
./deploy-aws-enhanced.sh --full-deploy
```

#### 方式二：标准部署
如果本地Docker网络正常：

```bash
# 标准部署
./deploy-aws.sh --full-deploy
```

### 第四步：监控部署进度

```bash
# 检查部署状态
./deploy-aws-enhanced.sh --status

# 查看服务日志
./deploy-aws-enhanced.sh --logs

# 查看CloudFormation堆栈状态
aws cloudformation describe-stacks --stack-name productmind-backend
```

### 第五步：验证部署

部署完成后，您将获得：

1. **应用URL**: `http://[ALB-DNS-NAME]`
2. **健康检查**: `http://[ALB-DNS-NAME]/health`
3. **API端点**: `http://[ALB-DNS-NAME]/api/v1/`

测试健康检查：
```bash
curl http://[ALB-DNS-NAME]/health
```

## 🛠️ 部署选项详解

### 环境变量配置

```bash
# 设置自定义堆栈名称
export STACK_NAME=my-backend

# 设置镜像标签
export IMAGE_TAG=v1.0.0

# 设置AWS区域
export AWS_REGION=us-west-2
```

### 分步部署

```bash
# 1. 仅设置基础设施
./deploy-aws-enhanced.sh --setup-only

# 2. 仅构建和推送镜像
./deploy-aws-enhanced.sh --build-only

# 3. 仅部署服务
./deploy-aws-enhanced.sh --deploy-only
```

## 🔍 故障排除

### 常见问题

#### 1. AWS认证失败
```
错误: SignatureDoesNotMatch
解决: 重新运行 aws configure，确保密钥正确
```

#### 2. Docker网络问题
```
错误: failed to resolve source metadata
解决: 使用增强版部署脚本，它会使用AWS CodeBuild构建镜像
```

#### 3. CloudFormation堆栈创建失败
```
错误: CREATE_FAILED
解决: 检查IAM权限，确保有足够的权限创建资源
```

#### 4. ECS服务启动失败
```
错误: Service tasks keep stopping
解决: 检查任务定义中的环境变量和健康检查配置
```

### 调试命令

```bash
# 查看CloudFormation事件
aws cloudformation describe-stack-events --stack-name productmind-backend

# 查看ECS服务详情
aws ecs describe-services --cluster productmind-backend-cluster --services productmind-backend-service

# 查看任务日志
aws logs tail /aws/ecs/productmind-backend --follow

# 查看ECR仓库
aws ecr describe-repositories --repository-names productmind-backend-repo
```

## 🧹 清理资源

删除所有AWS资源：

```bash
./deploy-aws-enhanced.sh --cleanup
```

或手动删除：

```bash
# 删除CloudFormation堆栈
aws cloudformation delete-stack --stack-name productmind-backend

# 删除ECR仓库
aws ecr delete-repository --repository-name productmind-backend-repo --force
```

## 💰 成本估算

基于默认配置的月度成本估算（美国东部区域）：

- **ECS Fargate**: ~$15-30/月 (512 vCPU, 1GB内存)
- **Application Load Balancer**: ~$16/月
- **NAT Gateway**: ~$32/月 (2个)
- **ECR存储**: ~$1/月 (10GB)
- **CloudWatch日志**: ~$1/月

**总计**: 约 $65-80/月

### 成本优化建议

1. **使用Fargate Spot**: 可节省70%成本
2. **单AZ部署**: 删除一个NAT Gateway可节省$16/月
3. **日志保留**: 减少日志保留期到3天
4. **定时缩容**: 在非工作时间将服务缩容到0

## 🔄 更新部署

### 更新应用代码

```bash
# 1. 更新代码后重新构建
npm run build

# 2. 构建新镜像
./deploy-aws-enhanced.sh --build-only

# 3. 部署新版本
./deploy-aws-enhanced.sh --deploy-only
```

### 更新基础设施

```bash
# 修改CloudFormation模板后
./deploy-aws-enhanced.sh --setup-only
```

## 📊 监控和日志

### CloudWatch监控

- **CPU使用率**: 监控任务CPU使用情况
- **内存使用率**: 监控内存使用情况
- **请求数量**: ALB请求指标
- **响应时间**: 应用响应时间

### 日志访问

```bash
# 实时查看日志
./deploy-aws-enhanced.sh --logs

# 或直接使用AWS CLI
aws logs tail /aws/ecs/productmind-backend --follow
```

## 🔐 安全最佳实践

1. **网络安全**:
   - ECS任务运行在私有子网
   - 仅ALB可以访问ECS任务
   - 安全组限制端口访问

2. **IAM权限**:
   - 最小权限原则
   - 任务角色仅有必需权限
   - 定期轮换访问密钥

3. **镜像安全**:
   - ECR镜像扫描启用
   - 使用非root用户运行容器
   - 定期更新基础镜像

## 📞 支持

如果遇到问题：

1. 查看本指南的故障排除部分
2. 检查AWS CloudFormation控制台的事件日志
3. 查看ECS服务的任务日志
4. 确认IAM权限配置正确

## 🎯 下一步

部署成功后，您可以：

1. 配置自定义域名和SSL证书
2. 设置CI/CD管道自动部署
3. 配置监控告警
4. 实施蓝绿部署策略
5. 配置自动扩缩容策略

---

**恭喜！您已成功将ProductMind后端部署到AWS ECS Fargate！** 🎉 