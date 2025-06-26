# 服务器安全事件响应指南

## 🚨 紧急情况概述

**服务器**: 106.53.134.90 (实例ID: ins-bvr7rxtw)  
**威胁等级**: 高危  
**恶意文件**: `/root/11-17-x64.bin`  
**截止时间**: 2025-06-28 21:51:00  

## 📊 恶意文件分析报告

### 文件基本信息
- **文件类型**: ELF 64-bit LSB executable (Linux可执行文件)
- **架构**: x86-64 
- **文件大小**: 86,208 bytes (约84KB)
- **构建时间**: 未知 (stripped binary)
- **动态链接**: 是 (需要系统库支持)

### 技术特征分析
1. **文件特征**:
   - 64位Linux可执行程序
   - 使用pthread库 (多线程能力)
   - 包含网络通信函数 (send, recv, accept, connect)
   - 具备定时器功能 (clock_gettime)
   - 包含伪终端操作 (openpty) - 可能用于远程控制

2. **潜在威胁**:
   - **远程控制后门**: 具备网络通信和伪终端功能
   - **资源消耗**: 多线程设计可能用于挖矿或DDoS攻击
   - **持久化威胁**: 可能在系统中建立持久化机制
   - **数据窃取**: 可能收集系统信息或敏感数据

## 🛡️ 立即响应措施 (紧急)

### 第一步：立即隔离和删除恶意文件

```bash
# 连接到服务器 (注意：您的密钥文件似乎是.cer格式，需要确认SSH密钥)
# ssh -i /path/to/your/ssh_key user@106.53.134.90

# 1. 检查进程是否在运行
ps aux | grep "11-17-x64"
pkill -f "11-17-x64"  # 如果进程在运行，立即终止

# 2. 删除恶意文件
rm -f /root/11-17-x64.bin

# 3. 检查是否有副本或相关文件
find / -name "*11-17*" -type f 2>/dev/null
find / -name "*.bin" -path "/tmp/*" -o -path "/var/tmp/*" 2>/dev/null
```

### 第二步：检查系统入侵痕迹

```bash
# 检查最近的登录记录
last | head -20
lastlog

# 检查SSH登录日志
grep "Accepted" /var/log/secure | tail -20  # CentOS/RHEL
grep "Accepted" /var/log/auth.log | tail -20  # Ubuntu/Debian

# 检查可疑用户账户
cat /etc/passwd | grep -v "nologin\|false" | tail -10
```

## 🔍 深度安全排查 (参考腾讯云指南)

### 1. 检查隐藏账户及弱口令

```bash
# 检查系统用户
awk -F: '$3>=500 {print $1,$3,$7}' /etc/passwd

# 检查sudo权限
grep -E "^[^#].*sudo" /etc/group

# 检查最近创建的用户
grep "useradd\|userdel" /var/log/secure /var/log/auth.log 2>/dev/null | tail -10
```

### 2. 检查恶意进程及非法端口

```bash
# 检查异常进程
ps -ef | grep -E "kworker|ksoftirqd" | grep -v "\["  # 伪装成内核进程
ps aux --sort=-%cpu | head -10  # 高CPU使用率进程
ps aux --sort=-%mem | head -10  # 高内存使用率进程

# 检查网络连接
netstat -antp | grep LISTEN | grep -v "127.0.0.1"
ss -tulpn | grep LISTEN

# 检查可疑网络连接
netstat -antp | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr
```

### 3. 检查启动项和定时任务

```bash
# 检查systemd服务
systemctl list-unit-files --type=service --state=enabled | grep -v "^#"

# 检查传统启动项 (CentOS 6及以下)
chkconfig --list 2>/dev/null | grep "3:on\|5:on"

# 检查定时任务
crontab -l
cat /etc/crontab
ls -la /etc/cron.d/
ls -la /etc/cron.daily/
ls -la /etc/cron.hourly/
ls -la /var/spool/cron/*

# 检查rc.local
cat /etc/rc.local
```

### 4. 检查文件系统异常

```bash
# 检查最近修改的文件
find /etc /root /tmp /var/tmp -type f -mtime -7 -ls 2>/dev/null

# 检查可疑的可执行文件
find /tmp /var/tmp /dev/shm -type f -executable 2>/dev/null

# 检查大文件
find / -size +100M -type f 2>/dev/null | head -10
```

## 🔒 安全加固措施

### 1. 修改SSH配置

```bash
# 备份原配置
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# 修改SSH端口 (将22改为其他端口，如2222)
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# 禁用root登录
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 重启SSH服务
systemctl restart sshd
```

**⚠️ 注意**: 修改SSH端口后，需要在腾讯云控制台的安全组中添加新端口规则！

### 2. 配置防火墙

```bash
# CentOS 7+
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-port=2222/tcp  # 新SSH端口
firewall-cmd --permanent --add-port=80/tcp    # HTTP
firewall-cmd --permanent --add-port=443/tcp   # HTTPS
firewall-cmd --reload

# Ubuntu
ufw enable
ufw allow 2222/tcp
ufw allow 80/tcp
ufw allow 443/tcp
```

### 3. 安装安全监控

```bash
# 安装fail2ban防暴力破解
yum install fail2ban -y  # CentOS
apt install fail2ban -y  # Ubuntu

# 启用fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 配置fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
logpath = /var/log/secure
EOF

systemctl restart fail2ban
```

### 4. 系统更新和补丁

```bash
# CentOS/RHEL
yum update -y
yum install epel-release -y

# Ubuntu/Debian
apt update && apt upgrade -y
apt install unattended-upgrades -y
```

## 🔄 持续监控方案

### 1. 创建监控脚本

```bash
#!/bin/bash
# 文件名: security_monitor.sh

# 检查CPU异常
HIGH_CPU=$(ps aux --sort=-%cpu | head -2 | tail -1 | awk '{print $3}' | cut -d. -f1)
if [ "$HIGH_CPU" -gt 80 ]; then
    echo "WARNING: High CPU usage detected: $HIGH_CPU%"
    ps aux --sort=-%cpu | head -5
fi

# 检查网络连接
CONN_COUNT=$(netstat -an | grep ESTABLISHED | wc -l)
if [ "$CONN_COUNT" -gt 100 ]; then
    echo "WARNING: Too many network connections: $CONN_COUNT"
fi

# 检查新文件
find /tmp /var/tmp -type f -mmin -60 2>/dev/null | while read file; do
    echo "New file detected: $file"
done
```

### 2. 设置定时监控

```bash
# 添加到crontab
crontab -e
# 添加以下行：
# */10 * * * * /root/security_monitor.sh >> /var/log/security_monitor.log 2>&1
```

## 📋 应急联系和报告

### 1. 腾讯云安全中心
- 控制台: 云服务器 -> 安全组
- 主机安全: 安装腾讯云主机安全Agent

### 2. 安全事件记录
```bash
# 创建事件记录
cat > /var/log/security-incident-$(date +%Y%m%d).log << EOF
Security Incident Report
Date: $(date)
Server: 106.53.134.90
Incident: Malware detected - 11-17-x64.bin
Actions Taken:
- Removed malicious file
- Changed SSH port
- Enabled firewall
- Installed fail2ban
- Updated system
EOF
```

## ⚠️ 重要提醒

1. **立即行动**: 距离截止时间不足，请立即执行紧急响应措施
2. **备份数据**: 在清理前备份重要业务数据
3. **监控日志**: 持续监控系统日志，发现异常立即处理
4. **密码安全**: 更改所有账户密码，使用强密码
5. **网络隔离**: 考虑临时限制服务器的网络访问

## 🔧 自动化处理脚本

如需要，我可以为您创建一键式的安全处理脚本，包含所有必要的清理和加固步骤。

---

**紧急联系**: 如果需要立即协助，请提供SSH密钥正确路径，我可以帮您创建远程处理脚本。 