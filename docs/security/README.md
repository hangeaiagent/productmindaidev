# 服务器安全处理工具包

## 📁 目录结构

```
docs/security/
├── README.md                                 # 本说明文件
├── md/                                       # 文档目录
│   ├── server-security-incident-response.md # 安全事件响应指南
│   └── tencent-cloud-security-group-config.md # 腾讯云安全组配置指南
└── sh/                                       # 执行脚本目录
    ├── emergency-security-cleanup.sh         # 服务器端安全清理脚本
    └── deploy-security-fix.sh                # 本地远程部署脚本
```

## 🚨 紧急安全事件处理

### 事件详情
- **服务器**: 106.53.134.90 (实例ID: ins-bvr7rxtw)
- **威胁等级**: 高危
- **恶意文件**: `/root/11-17-x64.bin`  
- **威胁类型**: Linux后门程序
- **截止时间**: 2025-06-28 21:51:00

### 快速处理步骤

#### 1. 立即执行自动化修复
```bash
# 在项目根目录执行
cd /Users/a1/work/productmindai0521
./docs/security/sh/deploy-security-fix.sh
```

#### 2. 手动处理（如果自动化失败）
```bash
# 连接服务器
ssh -i /Users/a1/Desktop/serverkey/1haibaoyiqihechengccokme1.cer root@106.53.134.90

# 上传脚本并执行
scp -i /Users/a1/Desktop/serverkey/1haibaoyiqihechengccokme1.cer \
    docs/security/sh/emergency-security-cleanup.sh root@106.53.134.90:/root/
ssh -i /Users/a1/Desktop/serverkey/1haibaoyiqihechengccokme1.cer root@106.53.134.90 \
    "chmod +x /root/emergency-security-cleanup.sh && /root/emergency-security-cleanup.sh"
```

#### 3. 配置腾讯云安全组
执行脚本后，SSH端口将改为2222，必须在腾讯云控制台添加安全组规则：
- 访问：https://console.cloud.tencent.com/cvm/instance
- 找到实例ID：ins-bvr7rxtw
- 添加入站规则：TCP 2222端口

详见：[腾讯云安全组配置指南](md/tencent-cloud-security-group-config.md)

## 📚 文档说明

### md/server-security-incident-response.md
完整的安全事件响应指南，包含：
- 恶意文件技术分析
- 深度安全排查步骤
- 系统加固措施
- 持续监控方案

### md/tencent-cloud-security-group-config.md
腾讯云安全组配置详细指南，包含：
- 紧急端口配置步骤
- 安全组最佳实践
- 常见问题解答

## 🔧 脚本说明

### sh/emergency-security-cleanup.sh
服务器端执行的安全清理脚本，功能包括：
- 删除恶意文件和进程
- 修改SSH端口为2222
- 安装fail2ban防暴力破解
- 启用防火墙
- 创建安全监控脚本
- 系统更新

### sh/deploy-security-fix.sh  
本地远程部署脚本，功能包括：
- 自动连接服务器
- 上传安全清理脚本
- 远程执行安全修复
- 生成处理报告

## ⚠️ 重要提醒

1. **时间紧急**: 距离截止时间有限，请立即执行
2. **SSH端口变更**: 脚本执行后SSH端口将变为2222
3. **安全组配置**: 必须在腾讯云控制台配置新端口
4. **密码更新**: 处理完成后立即更改所有密码
5. **备份数据**: 执行前建议备份重要数据

## 📞 紧急联系

- **腾讯云客服**: 400-013-2233
- **实例ID**: ins-bvr7rxtw
- **服务器IP**: 106.53.134.90

## ✅ 处理完成检查清单

- [ ] 恶意文件已删除
- [ ] SSH端口已修改为2222
- [ ] 腾讯云安全组已配置2222端口
- [ ] fail2ban已安装运行
- [ ] 防火墙已启用
- [ ] 系统已更新
- [ ] 所有密码已更改
- [ ] 安全监控已配置

---

**最后更新**: $(date)  
**处理状态**: 待执行 