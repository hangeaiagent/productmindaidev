#!/bin/bash

# 远程部署安全修复脚本
# 用于从本地部署到服务器 106.53.134.90

SERVER_IP="106.53.134.90"
SERVER_USER="root"  # 根据实际情况修改
SSH_KEY="/Users/a1/Desktop/serverkey/1haibaoyiqihechengccokme1.cer"  # 需要确认这是否是正确的SSH密钥

echo "🚀 准备部署安全修复到服务器 $SERVER_IP"

# 检查密钥文件
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH密钥文件不存在: $SSH_KEY"
    echo "请确认密钥文件路径，或者使用密码登录"
    
    read -p "是否使用密码登录？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SSH_CMD="ssh $SERVER_USER@$SERVER_IP"
        SCP_CMD="scp"
    else
        echo "❌ 无法连接服务器，请检查SSH密钥"
        exit 1
    fi
else
    # 检查密钥文件格式
    file_type=$(file "$SSH_KEY")
    if [[ $file_type == *"PEM"* ]] || [[ $file_type == *"PRIVATE KEY"* ]]; then
        echo "✅ 检测到SSH私钥文件"
        SSH_CMD="ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
        SCP_CMD="scp -i $SSH_KEY"
    else
        echo "⚠️ 文件格式可能不正确: $file_type"
        echo "如果是证书文件(.cer)，请提供对应的私钥文件(.pem)"
        
        read -p "是否继续尝试使用该文件？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            SSH_CMD="ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
            SCP_CMD="scp -i $SSH_KEY"
        else
            echo "❌ 取消部署"
            exit 1
        fi
    fi
fi

# 测试连接
echo "🔍 测试服务器连接..."
if ! $SSH_CMD -o ConnectTimeout=10 "echo '连接成功'" 2>/dev/null; then
    echo "❌ 无法连接到服务器 $SERVER_IP"
    echo "请检查："
    echo "1. 服务器IP是否正确"
    echo "2. SSH密钥是否正确"
    echo "3. 服务器是否运行"
    echo "4. 网络是否畅通"
    exit 1
fi

echo "✅ 服务器连接成功"

# 上传安全修复脚本
echo "📤 上传安全修复脚本..."
$SCP_CMD emergency-security-cleanup.sh $SERVER_USER@$SERVER_IP:/root/emergency-security-cleanup.sh

if [ $? -eq 0 ]; then
    echo "✅ 脚本上传成功"
else
    echo "❌ 脚本上传失败"
    exit 1
fi

# 执行安全修复
echo "🛡️ 开始执行安全修复..."
echo "⚠️ 注意：执行过程中SSH端口可能会更改，请保持关注"

$SSH_CMD << 'EOF'
    # 设置脚本权限
    chmod +x /root/emergency-security-cleanup.sh
    
    # 执行安全修复脚本
    echo "开始执行安全修复..."
    /root/emergency-security-cleanup.sh
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 安全修复脚本执行完成！"
    echo ""
    echo "⚠️ 重要提醒："
    echo "1. SSH端口已修改为2222"
    echo "2. 请立即在腾讯云控制台安全组中添加2222端口规则"
    echo "3. 后续连接请使用：ssh -p 2222 -i $SSH_KEY $SERVER_USER@$SERVER_IP"
    echo "4. 请更改所有账户密码"
    echo ""
    echo "📋 查看处理结果："
    echo "连接到服务器查看报告：ssh -p 2222 -i $SSH_KEY $SERVER_USER@$SERVER_IP"
    echo "报告文件位置：/root/security-incident-report-$(date +%Y%m%d).md"
else
    echo "❌ 安全修复执行失败，请检查服务器日志"
fi

# 创建本地备份记录
cat > security-incident-local-$(date +%Y%m%d_%H%M%S).md << EOF
# 本地安全处理记录

## 服务器信息
- IP: $SERVER_IP
- 处理时间: $(date)
- 威胁文件: /root/11-17-x64.bin

## 执行的操作
1. 上传安全修复脚本到服务器
2. 远程执行安全清理和加固
3. SSH端口修改为2222
4. 安装fail2ban和防火墙

## 后续操作清单
- [ ] 在腾讯云控制台添加2222端口规则
- [ ] 更改所有账户密码
- [ ] 验证安全修复效果
- [ ] 安装腾讯云主机安全Agent
- [ ] 定期检查安全日志

## 连接命令
\`\`\`bash
# 新的SSH连接命令
ssh -p 2222 -i $SSH_KEY $SERVER_USER@$SERVER_IP
\`\`\`

## 监控命令
\`\`\`bash
# 查看安全监控日志
tail -f /var/log/security_monitor.log

# 查看系统状态
systemctl status fail2ban
systemctl status firewalld
\`\`\`
EOF

echo "📝 本地处理记录已保存到：security-incident-local-$(date +%Y%m%d_%H%M%S).md" 