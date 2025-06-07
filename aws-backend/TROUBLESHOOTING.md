# 🔧 ProductMind AWS 部署故障排除指南

## 🚨 部署时间过长问题解决方案

### 📊 实时监控部署进度

如果部署时间超长，首先使用我们的监控工具来了解当前状态：

```bash
# 实时监控部署进度
./monitor-deploy.sh
```

这将显示：
- CloudFormation堆栈状态
- CodeBuild构建进度
- ECS服务状态
- 详细的进度信息

### 🔍 快速诊断问题

```bash
# 运行诊断工具
./diagnose.sh

# 生成详细报告
./diagnose.sh --report
```

### 📝 查看详细日志

```bash
# 查看实时日志
tail -f deploy.log

# 查看错误日志
grep "ERROR" deploy.log

# 查看警告日志
grep "WARNING" deploy.log
```

## 🕐 各阶段预期时间

### 正常部署时间线：

1. **前置检查** (1-2分钟)
   - 工具检查
   - AWS认证验证
   - 项目文件检查

2. **CloudFormation部署** (5-15分钟)
   - VPC创建：2-3分钟
   - 安全组创建：1分钟
   - ALB创建：3-5分钟
   - ECS集群创建：2-3分钟
   - IAM角色创建：1-2分钟

3. **CodeBuild构建** (3-8分钟)
   - 环境准备：1分钟
   - Docker构建：2-5分钟
   - 镜像推送：1-2分钟

4. **ECS服务部署** (3-5分钟)
   - 任务定义更新：1分钟
   - 服务更新：2-4分钟

**总计预期时间：12-30分钟**

## 🚨 常见超时问题及解决方案

### 1. CloudFormation超时

**症状**：堆栈创建超过15分钟
```bash
# 检查堆栈状态
./monitor-deploy.sh --once

# 查看详细事件
aws cloudformation describe-stack-events --stack-name productmind-backend
```

**解决方案**：
```bash
# 方案1：等待更长时间（最多30分钟）
./monitor-deploy.sh

# 方案2：清理并重新部署
./deploy-aws-enhanced.sh --cleanup
./deploy-aws-enhanced.sh --full-deploy

# 方案3：分步部署
./deploy-aws-enhanced.sh --setup-only
```

### 2. CodeBuild构建超时

**症状**：构建超过10分钟
```bash
# 检查构建状态
aws codebuild list-builds-for-project --project-name productmind-backend-build
```

**解决方案**：
```bash
# 方案1：重新触发构建
./deploy-aws-enhanced.sh --build-only

# 方案2：检查网络连接
./diagnose.sh

# 方案3：使用本地Docker（如果网络正常）
./quick-deploy.sh
```

### 3. ECS服务启动超时

**症状**：服务一直处于PENDING状态
```bash
# 检查服务状态
./monitor-deploy.sh --once

# 查看任务日志
./deploy-aws-enhanced.sh --logs
```

**解决方案**：
```bash
# 方案1：检查镜像是否存在
aws ecr list-images --repository-name productmind-backend-repo

# 方案2：重新部署服务
./deploy-aws-enhanced.sh --deploy-only

# 方案3：检查任务定义
aws ecs describe-task-definition --task-definition productmind-backend-task
```

## 🔧 调试模式部署

启用详细调试信息：

```bash
# 调试模式部署
./deploy-aws-enhanced.sh --debug --full-deploy

# 这将提供：
# - 详细的命令输出
# - 每个步骤的时间戳
# - 系统资源使用情况
# - 网络连接测试
```

## 📊 性能优化建议

### 1. 网络优化
```bash
# 检查网络连接
curl -w "@curl-format.txt" -o /dev/null -s "https://aws.amazon.com"

# 使用CDN镜像（中国用户）
export AWS_DEFAULT_REGION=cn-north-1
```

### 2. 并行部署
```bash
# 在一个终端运行部署
./deploy-aws-enhanced.sh --full-deploy

# 在另一个终端监控进度
./monitor-deploy.sh
```

### 3. 分步部署
```bash
# 步骤1：基础设施
./deploy-aws-enhanced.sh --setup-only

# 步骤2：构建镜像
./deploy-aws-enhanced.sh --build-only

# 步骤3：部署服务
./deploy-aws-enhanced.sh --deploy-only
```

## 🚨 紧急故障处理

### 部署完全卡住
```bash
# 1. 强制停止当前部署
Ctrl+C

# 2. 检查AWS资源状态
./diagnose.sh

# 3. 清理部分资源
aws cloudformation cancel-update-stack --stack-name productmind-backend

# 4. 完全清理重来
./deploy-aws-enhanced.sh --cleanup
./deploy-aws-enhanced.sh --full-deploy
```

### 资源配额限制
```bash
# 检查VPC限制
aws ec2 describe-vpcs --query 'length(Vpcs[])'

# 检查EIP限制
aws ec2 describe-addresses --query 'length(Addresses[])'

# 检查安全组限制
aws ec2 describe-security-groups --query 'length(SecurityGroups[])'
```

### 权限问题
```bash
# 检查当前用户权限
aws iam get-user

# 检查策略附加情况
aws iam list-attached-user-policies --user-name YOUR_USERNAME

# 测试关键权限
aws cloudformation validate-template --template-body file://aws/cloudformation-simple.yaml
```

## 📞 获取帮助

### 1. 生成诊断报告
```bash
./diagnose.sh --report
# 这将生成包含所有系统信息的详细报告
```

### 2. 收集日志
```bash
# 收集所有相关日志
tar -czf debug-logs-$(date +%Y%m%d-%H%M%S).tar.gz \
    deploy.log \
    diagnostic-report-*.txt \
    aws/cloudformation-simple.yaml \
    package.json
```

### 3. 检查AWS控制台
- CloudFormation: https://console.aws.amazon.com/cloudformation/
- ECS: https://console.aws.amazon.com/ecs/
- CodeBuild: https://console.aws.amazon.com/codesuite/codebuild/
- ECR: https://console.aws.amazon.com/ecr/

## 🎯 预防措施

### 1. 部署前检查
```bash
# 运行完整诊断
./diagnose.sh

# 验证AWS配置
aws sts get-caller-identity

# 检查网络连接
curl -I https://aws.amazon.com
```

### 2. 监控部署
```bash
# 在部署时开启监控
./monitor-deploy.sh &
./deploy-aws-enhanced.sh --full-deploy
```

### 3. 定期维护
```bash
# 清理旧的构建
aws codebuild list-builds --sort-order DESCENDING

# 清理旧的镜像
aws ecr list-images --repository-name productmind-backend-repo
```

---

**记住**：大多数部署问题都是网络或权限相关的。使用我们提供的监控和诊断工具可以快速定位问题！ 