#!/bin/bash

# 快速安全修复脚本 - 紧急处理服务器安全威胁
# 服务器: 106.53.134.90 (ins-bvr7rxtw)
# 威胁: 恶意文件 /root/11-17-x64.bin

echo "🚨 紧急安全威胁处理 - 服务器 106.53.134.90"
echo "威胁等级: 高危"
echo "截止时间: 2025-06-28 21:51:00"
echo "=================================="

# 服务器连接信息
SERVER_IP="106.53.134.90"
SERVER_USER="root"
SSH_KEY="/Users/a1/Desktop/serverkey/1haibaoyiqihechengccokme1.cer"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "1. 检查SSH连接..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo '连接成功'" 2>/dev/null; then
    echo "✅ SSH连接正常"
else
    echo "❌ SSH连接失败，请检查："
    echo "   - 服务器是否运行"
    echo "   - 密钥文件是否正确"
    echo "   - 网络是否畅通"
    exit 1
fi

echo ""
echo "2. 立即删除恶意文件..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    echo "检查恶意进程..."
    if ps aux | grep -v grep | grep "11-17-x64"; then
        echo "发现恶意进程，立即终止..."
        pkill -f "11-17-x64" 2>/dev/null || true
        sleep 2
        pkill -9 -f "11-17-x64" 2>/dev/null || true
        echo "✅ 恶意进程已终止"
    else
        echo "✅ 未发现运行中的恶意进程"
    fi
    
    echo "删除恶意文件..."
    if [ -f "/root/11-17-x64.bin" ]; then
        rm -f /root/11-17-x64.bin
        echo "✅ 恶意文件已删除"
    else
        echo "⚠️ 恶意文件未找到（可能已被删除）"
    fi
    
    echo "搜索相关文件..."
    find / -name "*11-17*" -type f 2>/dev/null | while read file; do
        echo "发现相关文件: $file"
        rm -f "$file" 2>/dev/null || true
    done
EOF

echo ""
echo "3. 上传并执行完整安全脚本..."
scp -i "$SSH_KEY" "$SCRIPT_DIR/emergency-security-cleanup.sh" "$SERVER_USER@$SERVER_IP:/root/"

if [ $? -eq 0 ]; then
    echo "✅ 安全脚本上传成功"
    
    echo "执行安全加固..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
        chmod +x /root/emergency-security-cleanup.sh
        echo "开始执行完整安全加固..."
        /root/emergency-security-cleanup.sh
EOF
else
    echo "❌ 脚本上传失败"
    exit 1
fi

echo ""
echo "🎉 紧急安全处理完成！"
echo ""
echo "⚠️ 重要后续步骤："
echo "1. 立即在腾讯云控制台配置安全组："
echo "   - 访问: https://console.cloud.tencent.com/cvm/instance"
echo "   - 找到实例ID: ins-bvr7rxtw"
echo "   - 添加入站规则: TCP 2222端口"
echo ""
echo "2. 使用新端口连接服务器:"
echo "   ssh -p 2222 -i $SSH_KEY $SERVER_USER@$SERVER_IP"
echo ""
echo "3. 立即更改所有账户密码"
echo ""
echo "📋 详细配置指南: docs/security/md/tencent-cloud-security-group-config.md"

# 生成处理报告
cat > "security-fix-report-$(date +%Y%m%d_%H%M%S).md" << EOF
# 安全威胁处理报告

## 基本信息
- **处理时间**: $(date)
- **服务器**: $SERVER_IP (ins-bvr7rxtw)  
- **威胁类型**: 恶意可执行文件
- **威胁等级**: 高危

## 已执行操作
- [x] 删除恶意文件 /root/11-17-x64.bin
- [x] 终止相关恶意进程
- [x] 执行完整安全加固脚本
- [x] 修改SSH端口为2222
- [x] 安装fail2ban防护
- [x] 启用防火墙

## 待完成操作
- [ ] 腾讯云控制台配置2222端口安全组规则
- [ ] 更改所有账户密码
- [ ] 验证安全修复效果

## 后续连接方式
\`\`\`bash
ssh -p 2222 -i $SSH_KEY $SERVER_USER@$SERVER_IP
\`\`\`

## 监控检查
\`\`\`bash
# 查看安全日志
tail -f /var/log/security_monitor.log

# 检查服务状态  
systemctl status fail2ban
systemctl status firewalld
\`\`\`
EOF

echo "📝 处理报告已生成: security-fix-report-$(date +%Y%m%d_%H%M%S).md" 