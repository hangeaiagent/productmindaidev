#!/bin/bash

# ============================================
# ProductMind AI - SEO页面生成状态监控脚本
# ============================================

SERVER="ec2-user@3.93.149.236"
KEY_FILE="/Users/a1/work/productmindai.pem"
REMOTE_DIR="/home/productmindaidev"

echo "🔍 ProductMind AI - SEO页面生成状态监控"
echo "========================================"

# 检查进程状态
echo "�� 检查生成进程状态..."
ssh -i "$KEY_FILE" "$SERVER" "cd $REMOTE_DIR && if [ -f logs/seo-generation.pid ]; then PID=\$(cat logs/seo-generation.pid); if kill -0 \$PID 2>/dev/null; then echo '✅ 进程运行中 (PID: '\$PID')'; else echo '⚠️  进程已停止'; fi; else echo '❌ 未找到进程文件'; fi"

echo ""
echo "📈 生成统计..."

# 文件统计
ssh -i "$KEY_FILE" "$SERVER" "cd $REMOTE_DIR && echo '�� 生成文件统计:' && find aws-backend/pdhtml/ -name '*.html' 2>/dev/null | wc -l | xargs echo '  HTML文件数量:' && du -sh aws-backend/pdhtml/ 2>/dev/null | cut -f1 | xargs echo '  总大小:'"

echo ""
echo "📋 最新日志 (最后10行):"
echo "------------------------"

# 显示最新日志
ssh -i "$KEY_FILE" "$SERVER" "cd $REMOTE_DIR && ls -t logs/seo-generation-*.log 2>/dev/null | head -1 | xargs tail -10"

echo ""
echo "🔄 实时监控命令:"
echo "  ./monitor-seo-status.sh"
echo "  ssh -i $KEY_FILE $SERVER 'cd $REMOTE_DIR && tail -f logs/seo-generation-*.log'"

