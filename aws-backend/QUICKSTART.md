# 🚀 ProductMind AI AWS Backend - 快速开始

## 5分钟部署指南

### 前提条件 ✅

- 已安装 AWS CLI 并配置好权限
- 已安装 Docker Desktop
- 有可用的 AWS VPC 和子网

### 步骤1: 基础测试 (1分钟)

```bash
cd aws-backend
./deploy-aws.sh --test-only
```

✅ 确保所有测试通过

### 步骤2: 配置AWS网络 (2分钟)

**方法A: 自动配置（推荐）**
```bash
./aws-helper.sh
```

**方法B: 手动配置**
```bash
cp deploy-config.example deploy-config
# 编辑 deploy-config 文件，填入VPC和子网信息
```

### 步骤3: 构建Docker镜像 (1分钟)

```bash
./deploy-aws.sh --docker-only
```

### 步骤4: 完整部署 (1分钟)

```bash
./deploy-aws.sh --full-deploy
```

### 步骤5: 验证部署

```bash
# 获取负载均衡器地址
aws cloudformation describe-stacks \
  --stack-name productmind-backend \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text

# 测试应用（替换为上面的地址）
curl http://your-load-balancer-dns/health
```

## 🎉 完成！

应用现在运行在 AWS ECS Fargate 上，支持：
- ✅ 突破30秒超时限制（5分钟处理时间）
- ✅ 自动扩缩容
- ✅ 负载均衡
- ✅ 健康检查
- ✅ 日志监控

## 📋 必需的环境变量

确保 `.env` 文件包含：
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-southeast-1
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

## 🔧 常用命令

```bash
# 重新部署新版本
./deploy-aws.sh --push --tag v1.0.1

# 查看日志
aws logs describe-log-streams --log-group-name /ecs/productmind-aws-backend

# 删除部署
aws cloudformation delete-stack --stack-name productmind-backend
```

## ❓ 遇到问题？

1. 查看详细文档: [DEPLOYMENT.md](DEPLOYMENT.md)
2. 检查错误日志: AWS CloudWatch
3. 验证网络配置: VPC和子网设置

---

**提示**: 第一次部署可能需要10-15分钟等待AWS资源创建完成。 