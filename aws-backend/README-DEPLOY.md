# 🚀 ProductMind AWS ECS Fargate 部署指南

## 📋 概述

本项目提供完整的AWS ECS Fargate部署方案，解决Netlify Functions 30秒超时限制问题，支持5分钟长时间处理。

## 🎯 核心优势

- ✅ **突破30秒限制**: 支持5分钟长时间处理
- ✅ **高可用性**: ECS Fargate自动扩缩容
- ✅ **生产就绪**: 完整的安全、监控、日志系统
- ✅ **一键部署**: 完全自动化部署流程
- ✅ **成本优化**: 月度成本约$65-80

## 📦 可用的部署脚本

### 1. 🚀 快速部署脚本（推荐新手）
```bash
./quick-deploy.sh
```
**特点**: 
- 一键部署，自动处理所有步骤
- 友好的用户界面和进度提示
- 自动检测Docker问题并切换到增强版

### 2. 🔧 增强版部署脚本（推荐生产）
```bash
./deploy-aws-enhanced.sh --full-deploy
```
**特点**:
- 使用AWS CodeBuild构建镜像，解决本地网络问题
- 支持分步部署和调试
- 完整的错误处理和日志

### 3. 📊 标准部署脚本
```bash
./deploy-aws.sh --full-deploy
```
**特点**:
- 传统部署方式
- 需要本地Docker网络正常

## 🔧 部署前准备

### 第一步：激活AWS CLI环境
```bash
source ~/aws-cli-env/bin/activate
```

### 第二步：配置AWS认证
```bash
aws configure
```
输入您的AWS访问密钥信息：
- AWS Access Key ID: `[您的访问密钥ID]`
- AWS Secret Access Key: `[您的秘密访问密钥]`
- Default region name: `us-east-1`
- Default output format: `json`

### 第三步：验证配置
```bash
aws sts get-caller-identity
```

## 🚀 快速开始（推荐）

### 一键部署
```bash
cd aws-backend
source ~/aws-cli-env/bin/activate
./quick-deploy.sh
```

这个脚本会自动：
1. 检查所有前提条件
2. 构建项目
3. 部署AWS基础设施
4. 构建和推送Docker镜像
5. 部署ECS服务
6. 显示访问地址

## 📊 实时监控和日志

### 🔍 实时监控部署进度
```bash
# 实时监控部署状态（推荐）
./monitor-deploy.sh

# 只查看一次状态
./monitor-deploy.sh --once

# 自定义刷新间隔
./monitor-deploy.sh --interval 10
```

监控器提供：
- 📊 CloudFormation堆栈状态
- 🔨 CodeBuild构建进度
- 🚀 ECS服务健康状态
- 🌐 应用访问地址和健康检查
- 📝 最新部署日志
- 🏗️ CloudFormation事件

### 🔧 快速诊断问题
```bash
# 快速诊断（推荐）
./diagnose.sh

# 生成详细诊断报告
./diagnose.sh --report
```

诊断器检查：
- ✅ 系统环境和工具
- ✅ AWS配置和认证
- ✅ 项目文件完整性
- ✅ AWS资源状态
- ✅ 网络连接
- ✅ 部署日志分析
- 💡 问题解决建议

### 📝 详细日志记录
所有部署脚本现在都支持详细日志：

```bash
# 启用调试模式
./deploy-aws-enhanced.sh --debug --full-deploy

# 查看实时日志
tail -f deploy.log

# 分析日志
grep "ERROR" deploy.log
grep "WARNING" deploy.log
```

日志功能：
- 🕐 时间戳记录
- 📊 进度条显示
- 🔍 详细错误诊断
- 📈 系统信息收集
- 💾 持久化日志文件

## 🔧 高级部署选项

### 分步部署（增强版脚本）

```bash
# 1. 仅运行测试
./deploy-aws-enhanced.sh --test-only

# 2. 仅设置基础设施
./deploy-aws-enhanced.sh --setup-only

# 3. 仅构建镜像
./deploy-aws-enhanced.sh --build-only

# 4. 仅部署服务
./deploy-aws-enhanced.sh --deploy-only

# 5. 完整部署
./deploy-aws-enhanced.sh --full-deploy

# 6. 调试模式部署
./deploy-aws-enhanced.sh --debug --full-deploy
```

### 管理命令

```bash
# 检查部署状态
./deploy-aws-enhanced.sh --status

# 查看服务日志
./deploy-aws-enhanced.sh --logs

# 清理所有资源
./deploy-aws-enhanced.sh --cleanup

# 实时监控
./monitor-deploy.sh

# 快速诊断
./diagnose.sh
```

## 📊 部署架构

```
Internet → ALB → ECS Fargate (Private Subnet) → ECR
                     ↓
              CloudWatch Logs
```

### 主要组件
- **ECS Fargate**: 无服务器容器运行环境
- **Application Load Balancer**: 负载均衡和健康检查
- **ECR**: Docker镜像仓库
- **VPC**: 私有网络环境
- **CloudWatch**: 日志和监控

## 🔍 故障排除

### 常见问题

#### 1. AWS认证失败
```bash
# 错误: SignatureDoesNotMatch
# 解决方案:
aws configure  # 重新配置认证信息
```

#### 2. Docker网络问题
```bash
# 错误: failed to resolve source metadata
# 解决方案: 使用增强版脚本
./deploy-aws-enhanced.sh --full-deploy
```

#### 3. CloudFormation失败
```bash
# 查看详细错误
aws cloudformation describe-stack-events --stack-name productmind-backend
```

#### 4. ECS服务启动失败
```bash
# 查看任务日志
./deploy-aws-enhanced.sh --logs
```

### 调试命令

```bash
# 查看CloudFormation堆栈状态
aws cloudformation describe-stacks --stack-name productmind-backend

# 查看ECS服务详情
aws ecs describe-services --cluster productmind-backend-cluster --services productmind-backend-service

# 查看ECR仓库
aws ecr describe-repositories --repository-names productmind-backend-repo
```

## 💰 成本估算

### 月度成本（美国东部区域）
- **ECS Fargate**: $15-30/月 (512 vCPU, 1GB内存)
- **Application Load Balancer**: $16/月
- **NAT Gateway**: $32/月 (2个)
- **ECR存储**: $1/月 (10GB)
- **CloudWatch日志**: $1/月

**总计**: 约 $65-80/月

### 成本优化建议
1. 使用Fargate Spot可节省70%成本
2. 单AZ部署可节省$16/月
3. 减少日志保留期
4. 非工作时间缩容到0

## 🔄 更新部署

### 更新应用代码
```bash
# 1. 构建新版本
npm run build

# 2. 重新部署
./quick-deploy.sh --force
```

### 更新基础设施
```bash
# 修改CloudFormation模板后
./deploy-aws-enhanced.sh --setup-only
```

## 🔐 安全特性

1. **网络安全**:
   - ECS任务运行在私有子网
   - 安全组限制端口访问
   - 仅ALB可以访问ECS任务

2. **IAM权限**:
   - 最小权限原则
   - 任务角色仅有必需权限

3. **镜像安全**:
   - ECR镜像扫描启用
   - 非root用户运行容器

## 📊 监控和日志

### 访问日志
```bash
# 实时查看日志
./deploy-aws-enhanced.sh --logs

# 或直接使用AWS CLI
aws logs tail /aws/ecs/productmind-backend --follow
```

### CloudWatch监控
- CPU使用率
- 内存使用率
- 请求数量
- 响应时间

## 🎯 部署后验证

部署完成后，您将获得：

1. **应用URL**: `http://[ALB-DNS-NAME]`
2. **健康检查**: `http://[ALB-DNS-NAME]/health`
3. **API端点**: `http://[ALB-DNS-NAME]/api/v1/`

### 测试命令
```bash
# 测试健康检查
curl http://[ALB-DNS-NAME]/health

# 测试API端点
curl http://[ALB-DNS-NAME]/api/v1/templates/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"languages":["zh","en"]}'
```

## 🧹 清理资源

### 完全清理
```bash
./deploy-aws-enhanced.sh --cleanup
```

### 手动清理
```bash
# 删除CloudFormation堆栈
aws cloudformation delete-stack --stack-name productmind-backend

# 删除ECR仓库
aws ecr delete-repository --repository-name productmind-backend-repo --force
```

## 📞 技术支持

### 文件结构
```
aws-backend/
├── quick-deploy.sh              # 快速部署脚本（推荐）
├── deploy-aws-enhanced.sh       # 增强版部署脚本
├── deploy-aws.sh               # 标准部署脚本
├── aws-helper.sh               # AWS网络配置助手
├── aws/
│   ├── cloudformation-simple.yaml    # 简化版CloudFormation模板
│   └── cloudformation-template.yaml  # 完整版CloudFormation模板
├── DEPLOYMENT_GUIDE.md         # 详细部署指南
├── README-DEPLOY.md           # 本文件
└── src/                       # 源代码目录
```

### 获取帮助
```bash
# 查看脚本帮助
./quick-deploy.sh --help
./deploy-aws-enhanced.sh --help
```

## 🎉 成功案例

部署成功后，您的ProductMind后端将：

1. ✅ **解决30秒超时限制** - 支持5分钟长时间处理
2. ✅ **高可用性部署** - 多AZ部署，自动故障转移
3. ✅ **自动扩缩容** - 根据负载自动调整实例数量
4. ✅ **完整监控** - CloudWatch日志和指标
5. ✅ **安全防护** - VPC私有网络，安全组保护

---

**🎯 立即开始部署：**
```bash
cd aws-backend
source ~/aws-cli-env/bin/activate
./quick-deploy.sh
```

**恭喜！您现在拥有了一个生产就绪的AWS ECS Fargate后端服务！** 🎉 