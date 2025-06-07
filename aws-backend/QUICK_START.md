# 🚀 ProductMind AWS 快速开始指南

## 📋 5分钟快速部署

### 第一步：准备环境
```bash
# 1. 激活AWS CLI环境
source ~/aws-cli-env/bin/activate

# 2. 配置AWS认证（如果还没有配置）
aws configure

# 3. 进入项目目录
cd aws-backend
```

### 第二步：运行诊断检查
```bash
# 快速检查系统状态
./diagnose.sh
```

如果诊断发现问题，请根据提示解决后再继续。

### 第三步：一键部署
```bash
# 方式1：快速部署（推荐新手）
./quick-deploy.sh

# 方式2：增强版部署（推荐生产环境）
./deploy-aws-enhanced.sh --full-deploy

# 方式3：调试模式部署（如果遇到问题）
./deploy-aws-enhanced.sh --debug --full-deploy
```

### 第四步：监控部署进度
在部署过程中，打开新终端窗口：

```bash
# 实时监控部署状态
cd aws-backend
source ~/aws-cli-env/bin/activate
./monitor-deploy.sh
```

## 📊 部署时间预期

| 阶段 | 预期时间 | 说明 |
|------|----------|------|
| 前置检查 | 1-2分钟 | 验证工具和配置 |
| CloudFormation | 5-15分钟 | 创建AWS基础设施 |
| CodeBuild构建 | 3-8分钟 | 构建Docker镜像 |
| ECS服务部署 | 3-5分钟 | 启动容器服务 |
| **总计** | **12-30分钟** | 完整部署时间 |

## 🔍 实时监控功能

### 监控部署进度
```bash
./monitor-deploy.sh
```

显示内容：
- 📊 CloudFormation堆栈状态
- 🔨 CodeBuild构建进度  
- 🚀 ECS服务健康状态
- 🌐 应用访问地址
- 📝 最新部署日志

### 查看详细日志
```bash
# 实时查看日志
tail -f deploy.log

# 查看错误信息
grep "ERROR" deploy.log

# 查看警告信息  
grep "WARNING" deploy.log
```

## 🔧 故障排除

### 如果部署时间过长
```bash
# 1. 检查当前状态
./monitor-deploy.sh --once

# 2. 运行诊断
./diagnose.sh

# 3. 查看详细日志
tail -20 deploy.log
```

### 如果部署失败
```bash
# 1. 生成诊断报告
./diagnose.sh --report

# 2. 清理失败的资源
./deploy-aws-enhanced.sh --cleanup

# 3. 重新部署
./deploy-aws-enhanced.sh --full-deploy
```

### 常见问题快速解决

#### CloudFormation超时
```bash
# 等待更长时间或重新部署
./monitor-deploy.sh
# 或
./deploy-aws-enhanced.sh --cleanup
./deploy-aws-enhanced.sh --full-deploy
```

#### CodeBuild构建失败
```bash
# 重新触发构建
./deploy-aws-enhanced.sh --build-only
```

#### 网络连接问题
```bash
# 使用增强版部署（绕过本地Docker网络）
./deploy-aws-enhanced.sh --full-deploy
```

## 🎉 部署成功后

部署成功后，您将看到：

```
╔══════════════════════════════════════════════════════════════╗
║                      🎉 部署成功！                           ║
╚══════════════════════════════════════════════════════════════╝

🌐 应用访问地址：
   主页: http://productmind-backend-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com
   健康检查: http://productmind-backend-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com/health
   API端点: http://productmind-backend-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com/api/v1/

✅ 健康检查通过！服务正常运行
```

### 测试应用
```bash
# 测试健康检查
curl http://YOUR_ALB_URL/health

# 测试API端点（需要认证）
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://YOUR_ALB_URL/api/v1/templates/batch-generate
```

## 📊 管理命令

### 查看状态
```bash
./deploy-aws-enhanced.sh --status
```

### 查看日志
```bash
./deploy-aws-enhanced.sh --logs
```

### 更新应用
```bash
# 重新部署最新代码
./quick-deploy.sh --force
```

### 清理资源
```bash
./deploy-aws-enhanced.sh --cleanup
```

## 💰 成本信息

预估月度成本：**$65-80 USD**

主要组件：
- ECS Fargate: $15-30/月
- Application Load Balancer: $16/月  
- NAT Gateway: $32/月
- ECR存储: $1/月
- CloudWatch日志: $1/月

## 🆘 获取帮助

如果遇到问题：

1. **运行诊断**：`./diagnose.sh --report`
2. **查看日志**：`tail -f deploy.log`
3. **检查AWS控制台**：
   - [CloudFormation](https://console.aws.amazon.com/cloudformation/)
   - [ECS](https://console.aws.amazon.com/ecs/)
   - [CodeBuild](https://console.aws.amazon.com/codesuite/codebuild/)

---

**🎯 现在就开始部署吧！**

```bash
cd aws-backend
source ~/aws-cli-env/bin/activate
./quick-deploy.sh
``` 