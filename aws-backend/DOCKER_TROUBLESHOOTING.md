# Docker 故障排除指南

## 🚨 Docker镜像拉取失败问题

如果遇到以下错误：
```
ERROR: failed to solve: node:18-alpine: failed to resolve source metadata
```

或者：
```
Error response from daemon: Head "https://registry-1.docker.io/v2/library/node/manifests/18-alpine": unauthorized
```

## 💡 解决方案

### 方法1: 重启Docker Desktop（推荐）

1. 完全退出Docker Desktop
2. 重新启动Docker Desktop
3. 等待Docker完全启动
4. 重试构建

### 方法2: 登录Docker Hub

```bash
docker login
# 输入Docker Hub用户名和密码
```

### 方法3: 清理Docker认证

```bash
# 清理Docker配置
docker logout
rm -rf ~/.docker/config.json

# 重新登录（可选）
docker login
```

### 方法4: 检查网络连接

```bash
# 测试连接
curl -I https://registry-1.docker.io/v2/

# 如果在公司网络，可能需要配置代理
```

### 方法5: 使用国内镜像源

编辑 Docker Desktop 设置：
1. 打开 Docker Desktop
2. 进入 Settings → Docker Engine
3. 添加镜像源配置：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

4. 点击 "Apply & Restart"

### 方法6: 跳过Docker构建（临时方案）

如果急需部署，可以先跳过Docker构建：

```bash
# 仅运行测试
./deploy-aws.sh --test-only

# 稍后解决Docker问题后再构建
./deploy-aws.sh --docker-only
```

## 🔍 验证修复

修复后，测试Docker是否正常：

```bash
# 测试拉取镜像
docker pull hello-world

# 测试运行
docker run hello-world

# 如果成功，再次尝试构建
./deploy-aws.sh --docker-only
```

## 📞 仍然有问题？

如果上述方法都无效：

1. 检查系统时间是否正确
2. 重启电脑
3. 重新安装Docker Desktop
4. 联系网络管理员检查防火墙设置

---

**提示**: Docker网络问题通常是临时的，重启Docker Desktop解决90%的问题。 