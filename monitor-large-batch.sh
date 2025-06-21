#!/bin/bash

# 大规模批量生产监控脚本
echo "🔍 ProductMind AI - 大规模批量生产监控"
echo "═══════════════════════════════════════"

# 检查进程状态
echo "📊 进程状态检查:"
PROCESS_COUNT=$(ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'ps aux | grep large-scale-batch-production-fixed | grep -v grep | wc -l')
if [ "$PROCESS_COUNT" -gt 0 ]; then
    echo "  ✅ 批量生产进程正在运行 (${PROCESS_COUNT}个进程)"
else
    echo "  ❌ 批量生产进程未运行"
fi

echo ""
echo "📋 最新日志 (最后20行):"
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'cd /home/productmindaidev && tail -20 large-batch-fixed.log'

echo ""
echo "📈 进度统计:"
# 检查进度文件
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'cd /home/productmindaidev && if [ -f batch-progress.json ]; then cat batch-progress.json; else echo "进度文件不存在"; fi'

echo ""
echo "💾 磁盘空间检查:"
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'df -h /home/productmindaidev'

echo ""
echo "🔄 系统资源使用:"
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'top -bn1 | head -5'

echo ""
echo "═══════════════════════════════════════"
echo "监控完成 - $(date)" 