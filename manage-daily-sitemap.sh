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
