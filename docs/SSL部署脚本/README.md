# ProductMind AI SSL部署脚本和文档

本目录包含了ProductMind AI项目的完整SSL部署脚本和相关文档。

## 📁 目录结构

### 🚀 部署脚本

| 脚本文件 | 用途 | 推荐使用 |
|---------|------|----------|
| `一键SSL部署脚本.sh` | **完整SSL部署脚本** | ⭐ **推荐** |
| `deploy-ssl-complete.sh` | SSL部署完整版本 | ✅ 备用 |
| `ssl-setup.sh` | 基础SSL配置脚本 | ✅ 简化版 |
| `setup-ssl.sh` | 详细SSL设置脚本 | ✅ 详细版 |
| `update-https-links.sh` | 本地HTTPS链接更新 | 🔧 工具脚本 |
| `update-https-links-server.sh` | 服务器HTTPS链接更新 | 🔧 工具脚本 |

### 📚 文档说明

| 文档文件 | 内容 | 用途 |
|---------|------|------|
| `SSL一键部署命令.md` | 简化部署命令 | 🚀 快速上手 |
| `SSL-DEPLOYMENT-GUIDE.md` | 完整部署指南 | 📖 详细说明 |
| `SSL部署操作指南.md` | 操作步骤指南 | 📋 操作手册 |
| `SSL配置指南.md` | 配置参数说明 | ⚙️ 配置参考 |
| `SSL部署手册.md` | 部署手册 | 📘 完整手册 |

## 🎯 快速开始

### 方法1：一键部署（推荐）

```bash
# 在服务器上执行
chmod +x 一键SSL部署脚本.sh
./一键SSL部署脚本.sh
```

### 方法2：分步执行

```bash
# 1. 基础SSL配置
chmod +x ssl-setup.sh
./ssl-setup.sh

# 2. 更新HTTPS链接
chmod +x update-https-links-server.sh
./update-https-links-server.sh
```

## ✅ SSL部署成功标志

部署成功后，您将看到：

- ✅ SSL证书申请成功
- ✅ Nginx配置更新
- ✅ HTTPS访问正常
- ✅ 自动续期设置完成
- ✅ HTTP自动重定向到HTTPS

## 🔧 维护和管理

### 证书续期

SSL证书会自动续期，每天凌晨3点检查：

```bash
# 手动检查续期
sudo certbot renew --dry-run

# 查看证书状态
sudo certbot certificates
```

### 故障排查

如果遇到问题，请查看：

1. **证书状态**: `sudo certbot certificates`
2. **Nginx状态**: `sudo systemctl status nginx`
3. **续期日志**: `tail -f /var/log/certbot-renew.log`

## 📋 部署清单

在执行SSL部署前，请确认：

- [ ] 域名DNS已正确解析到服务器IP
- [ ] 服务器防火墙已开放80和443端口
- [ ] Nginx已正确安装和配置
- [ ] 有足够的权限执行sudo命令

## 🆘 技术支持

如果在部署过程中遇到问题：

1. 查看对应的文档说明
2. 检查服务器日志
3. 确认网络和DNS配置
4. 联系技术支持

## 📝 更新记录

- **2025-06-22**: 完成SSL部署脚本整理
- **2025-06-22**: SSL证书成功部署到productmindai.com
- **2025-06-22**: 自动续期功能配置完成

---

**注意**: 请根据您的具体服务器环境选择合适的脚本执行。建议先在测试环境验证后再在生产环境使用。 