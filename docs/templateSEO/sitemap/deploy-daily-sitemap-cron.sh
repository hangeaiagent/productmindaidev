#!/bin/bash
# ProductMind AI Sitemap每日自动生成部署脚本
# 将本地sitemap系统部署到服务器并设置每日定时任务

echo "🚀 ProductMind AI Sitemap每日自动生成部署"
echo "=========================================="

# 配置
SERVER_USER="ec2-user"
SERVER_HOST="3.93.149.236"
SERVER_KEY="/Users/a1/work/productmindai.pem"
SERVER_PATH="/home/productmindaidev"
LOCAL_SITEMAP_DIR="docs/templateSEO/sitemap"

# 检查本地文件
echo "📋 1. 检查本地文件..."
if [ ! -f "$LOCAL_SITEMAP_DIR/enhanced-daily-sitemap-generator.sh" ]; then
    echo "❌ 本地增强版生成脚本不存在"
    exit 1
fi

if [ ! -f "$LOCAL_SITEMAP_DIR/generate-complete-sitemap.cjs" ]; then
    echo "❌ 本地sitemap生成脚本不存在"
    exit 1
fi

echo "✅ 本地文件检查完成"

# 同步整个sitemap目录到服务器
echo "📋 2. 同步sitemap目录到服务器..."
rsync -avz --delete \
    -e "ssh -i $SERVER_KEY" \
    "$LOCAL_SITEMAP_DIR/" \
    "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/docs/templateSEO/sitemap/"

if [ $? -eq 0 ]; then
    echo "✅ 文件同步成功"
else
    echo "❌ 文件同步失败"
    exit 1
fi

# 设置脚本执行权限
echo "📋 3. 设置脚本执行权限..."
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" \
    "chmod +x $SERVER_PATH/docs/templateSEO/sitemap/*.sh"

echo "✅ 执行权限设置完成"

# 备份现有定时任务
echo "📋 4. 备份现有定时任务..."
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" \
    "crontab -l > $SERVER_PATH/logs/crontab-backup-\$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || echo '# 无现有定时任务' > $SERVER_PATH/logs/crontab-backup-\$(date +%Y%m%d_%H%M%S).txt"

echo "✅ 定时任务备份完成"

# 更新定时任务
echo "📋 5. 更新定时任务配置..."

# 创建新的定时任务配置
TEMP_CRON="/tmp/productmind-cron-$$"

# 获取现有定时任务（排除旧的sitemap任务）
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" \
    "crontab -l 2>/dev/null | grep -v 'sitemap' | grep -v 'ProductMind AI Sitemap'" > "$TEMP_CRON"

# 添加新的每日sitemap生成任务
cat >> "$TEMP_CRON" << EOF

# ProductMind AI Sitemap每日自动生成 - 每天凌晨3点
0 3 * * * cd $SERVER_PATH && bash docs/templateSEO/sitemap/enhanced-daily-sitemap-generator.sh >> logs/sitemap-daily-cron.log 2>&1
EOF

# 上传并应用新的定时任务
scp -i "$SERVER_KEY" "$TEMP_CRON" "$SERVER_USER@$SERVER_HOST:/tmp/new-crontab"
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "crontab /tmp/new-crontab && rm /tmp/new-crontab"

# 清理临时文件
rm "$TEMP_CRON"

if [ $? -eq 0 ]; then
    echo "✅ 定时任务更新成功"
else
    echo "❌ 定时任务更新失败"
    exit 1
fi

# 验证定时任务
echo "📋 6. 验证定时任务配置..."
echo "当前定时任务："
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "crontab -l | grep -A1 -B1 sitemap"

# 测试脚本执行
echo "📋 7. 测试脚本执行..."
echo "正在执行测试运行..."

ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" \
    "cd $SERVER_PATH && timeout 60 bash docs/templateSEO/sitemap/enhanced-daily-sitemap-generator.sh 2>&1 | head -20"

# 创建管理脚本
echo "📋 8. 创建管理脚本..."
cat > manage-daily-sitemap.sh << 'EOF'
#!/bin/bash
# ProductMind AI Sitemap每日生成管理脚本

SERVER_KEY="/Users/a1/work/productmindai.pem"
SERVER_USER="ec2-user"
SERVER_HOST="3.93.149.236"
SERVER_PATH="/home/productmindaidev"

case "$1" in
    "status")
        echo "📊 检查定时任务状态..."
        ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "crontab -l | grep sitemap"
        ;;
    "logs")
        echo "📋 查看最新日志..."
        ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "tail -30 $SERVER_PATH/logs/sitemap-daily-cron.log"
        ;;
    "test")
        echo "🧪 测试执行脚本..."
        ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && bash docs/templateSEO/sitemap/enhanced-daily-sitemap-generator.sh"
        ;;
    "deploy")
        echo "🚀 重新部署..."
        bash docs/templateSEO/sitemap/deploy-daily-sitemap-cron.sh
        ;;
    *)
        echo "使用方法: $0 {status|logs|test|deploy}"
        echo "  status - 查看定时任务状态"
        echo "  logs   - 查看执行日志"
        echo "  test   - 手动测试执行"
        echo "  deploy - 重新部署"
        ;;
esac
EOF

chmod +x manage-daily-sitemap.sh
echo "✅ 管理脚本创建完成: manage-daily-sitemap.sh"

# 部署总结
echo ""
echo "🎉 ProductMind AI Sitemap每日自动生成部署完成！"
echo "=========================================="
echo "✅ 文件同步: 完成"
echo "✅ 权限设置: 完成"
echo "✅ 定时任务: 每天凌晨3点执行"
echo "✅ 备份配置: 完成"
echo "✅ 管理脚本: 已创建"
echo ""
echo "📋 新的定时任务配置："
echo "   时间: 每天凌晨3点 (0 3 * * *)"
echo "   脚本: docs/templateSEO/sitemap/enhanced-daily-sitemap-generator.sh"
echo "   日志: logs/sitemap-daily-cron.log"
echo ""
echo "📊 管理命令："
echo "   ./manage-daily-sitemap.sh status  - 查看状态"
echo "   ./manage-daily-sitemap.sh logs    - 查看日志"
echo "   ./manage-daily-sitemap.sh test    - 测试执行"
echo "   ./manage-daily-sitemap.sh deploy  - 重新部署"
echo ""
echo "🔔 功能特性："
echo "   ✅ 每日自动生成所有sitemap文件"
echo "   ✅ 自动通知Google Search Console"
echo "   ✅ 自动通知Bing搜索引擎"
echo "   ✅ 详细执行报告和日志"
echo "   ✅ 错误处理和状态监控"
echo ""

exit 0 