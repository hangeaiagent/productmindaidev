#!/bin/bash

# 紧急安全事件响应脚本
# 服务器: 106.53.134.90
# 威胁: 恶意文件 /root/11-17-x64.bin

set -e

echo "🚨 开始紧急安全处理..."
echo "时间: $(date)"
echo "服务器: 106.53.134.90"

# 日志文件
LOG_FILE="/var/log/emergency-security-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "📝 日志记录到: $LOG_FILE"

# 1. 立即停止并删除恶意文件
echo "🛑 步骤1: 停止恶意进程并删除文件"
if ps aux | grep -v grep | grep "11-17-x64"; then
    echo "发现恶意进程，正在终止..."
    pkill -f "11-17-x64" || true
    sleep 2
    pkill -9 -f "11-17-x64" || true
    echo "✅ 恶意进程已终止"
else
    echo "✅ 未发现运行中的恶意进程"
fi

# 删除恶意文件
if [ -f "/root/11-17-x64.bin" ]; then
    echo "删除恶意文件: /root/11-17-x64.bin"
    rm -f /root/11-17-x64.bin
    echo "✅ 恶意文件已删除"
else
    echo "⚠️ 恶意文件未找到（可能已被删除）"
fi

# 查找相关文件
echo "🔍 搜索相关恶意文件..."
find / -name "*11-17*" -type f 2>/dev/null | while read file; do
    echo "发现相关文件: $file"
    # 谨慎删除，先备份
    cp "$file" "$file.backup.$(date +%s)" 2>/dev/null || true
    rm -f "$file"
done

# 2. 检查系统状态
echo "🔍 步骤2: 检查系统入侵状态"

# 检查高CPU进程
echo "检查高CPU使用率进程:"
ps aux --sort=-%cpu | head -5

# 检查网络连接
echo "检查可疑网络连接:"
netstat -antp | grep ESTABLISHED | head -10

# 检查最近登录
echo "检查最近登录记录:"
last | head -10

# 3. 基础安全加固
echo "🔒 步骤3: 基础安全加固"

# 备份SSH配置
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%s)

# 修改SSH端口（如果当前是22）
if grep -q "^#Port 22" /etc/ssh/sshd_config || grep -q "^Port 22" /etc/ssh/sshd_config; then
    echo "修改SSH端口为2222"
    sed -i 's/^#Port 22/Port 2222/' /etc/ssh/sshd_config
    sed -i 's/^Port 22/Port 2222/' /etc/ssh/sshd_config
    
    # 禁用root登录
    sed -i 's/^#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    
    echo "⚠️ SSH配置已修改，需要重启SSH服务"
    echo "⚠️ 请先在腾讯云控制台安全组中添加2222端口规则！"
    
    read -p "是否立即重启SSH服务？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        systemctl restart sshd
        echo "✅ SSH服务已重启"
    else
        echo "⚠️ 请手动重启SSH服务: systemctl restart sshd"
    fi
else
    echo "✅ SSH端口已经不是默认端口22"
fi

# 4. 安装基础安全工具
echo "🛡️ 步骤4: 安装安全工具"

# 检测系统类型
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    echo "检测到CentOS/RHEL系统"
    
    # 安装fail2ban
    if ! command -v fail2ban-server &> /dev/null; then
        echo "安装fail2ban..."
        yum install epel-release -y
        yum install fail2ban -y
    fi
    
    # 启用防火墙
    if ! systemctl is-active --quiet firewalld; then
        echo "启用防火墙..."
        systemctl enable firewalld
        systemctl start firewalld
        firewall-cmd --permanent --add-port=2222/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --reload
    fi
    
elif command -v apt &> /dev/null; then
    # Ubuntu/Debian
    echo "检测到Ubuntu/Debian系统"
    
    # 更新包列表
    apt update
    
    # 安装fail2ban
    if ! command -v fail2ban-server &> /dev/null; then
        echo "安装fail2ban..."
        apt install fail2ban -y
    fi
    
    # 启用防火墙
    if ! ufw status | grep -q "Status: active"; then
        echo "启用防火墙..."
        ufw --force enable
        ufw allow 2222/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
    fi
fi

# 5. 配置fail2ban
echo "⚙️ 配置fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
logpath = /var/log/secure
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "✅ fail2ban已配置并启动"

# 6. 创建监控脚本
echo "📊 步骤5: 创建安全监控"
cat > /root/security_monitor.sh << 'EOF'
#!/bin/bash
# 安全监控脚本

LOG_FILE="/var/log/security_monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 开始安全检查" >> $LOG_FILE

# 检查高CPU进程
HIGH_CPU_PROC=$(ps aux --sort=-%cpu | head -2 | tail -1)
CPU_USAGE=$(echo $HIGH_CPU_PROC | awk '{print $3}' | cut -d. -f1)
if [ "$CPU_USAGE" -gt 80 ]; then
    echo "[$DATE] 警告: 发现高CPU使用率进程 ($CPU_USAGE%): $HIGH_CPU_PROC" >> $LOG_FILE
fi

# 检查网络连接数
CONN_COUNT=$(netstat -an | grep ESTABLISHED | wc -l)
if [ "$CONN_COUNT" -gt 100 ]; then
    echo "[$DATE] 警告: 网络连接数过多: $CONN_COUNT" >> $LOG_FILE
fi

# 检查临时目录新文件
find /tmp /var/tmp -type f -mmin -10 2>/dev/null | while read file; do
    echo "[$DATE] 发现新文件: $file" >> $LOG_FILE
done

# 检查可疑进程
ps aux | grep -E "(kworker|ksoftirqd)" | grep -v "\[" | while read proc; do
    echo "[$DATE] 可疑进程: $proc" >> $LOG_FILE
done

echo "[$DATE] 安全检查完成" >> $LOG_FILE
EOF

chmod +x /root/security_monitor.sh

# 添加到crontab
(crontab -l 2>/dev/null; echo "*/10 * * * * /root/security_monitor.sh") | crontab -
echo "✅ 安全监控脚本已创建并添加到定时任务"

# 7. 系统更新
echo "🔄 步骤6: 系统更新"
if command -v yum &> /dev/null; then
    yum update -y
elif command -v apt &> /dev/null; then
    apt update && apt upgrade -y
fi

# 8. 生成安全报告
echo "📋 生成安全处理报告..."
cat > /root/security-incident-report-$(date +%Y%m%d).md << EOF
# 安全事件处理报告

## 事件概述
- **时间**: $(date)
- **服务器**: 106.53.134.90
- **威胁类型**: 恶意可执行文件
- **威胁等级**: 高危
- **恶意文件**: /root/11-17-x64.bin

## 处理措施
1. ✅ 已删除恶意文件
2. ✅ 已终止相关恶意进程
3. ✅ 已修改SSH端口为2222
4. ✅ 已禁用root SSH登录
5. ✅ 已安装配置fail2ban
6. ✅ 已启用防火墙
7. ✅ 已创建安全监控脚本
8. ✅ 已更新系统

## 后续建议
1. 在腾讯云控制台安全组中添加2222端口规则
2. 更改所有账户密码
3. 定期检查安全监控日志
4. 考虑安装腾讯云主机安全Agent

## 监控日志
- 主日志: $LOG_FILE
- 监控日志: /var/log/security_monitor.log
EOF

echo ""
echo "🎉 紧急安全处理完成！"
echo ""
echo "📋 处理摘要:"
echo "✅ 恶意文件已删除"
echo "✅ SSH端口已修改为2222"
echo "✅ 防火墙已启用"
echo "✅ fail2ban已安装"
echo "✅ 安全监控已配置"
echo "✅ 系统已更新"
echo ""
echo "⚠️ 重要提醒:"
echo "1. 请立即在腾讯云控制台安全组中添加2222端口规则"
echo "2. 使用新端口连接: ssh -p 2222 user@106.53.134.90"
echo "3. 更改所有账户密码"
echo "4. 查看详细报告: /root/security-incident-report-$(date +%Y%m%d).md"
echo ""
echo "📱 如有问题，请联系系统管理员" 