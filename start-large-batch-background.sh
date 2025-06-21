#!/bin/bash

echo "🚀 ProductMind AI - 大规模批量生产后台启动"
echo "═══════════════════════════════════════════"

# 检查是否已有进程在运行
EXISTING_PROCESS=$(ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'ps aux | grep large-scale-batch-production-fixed | grep -v grep')

if [ ! -z "$EXISTING_PROCESS" ]; then
    echo "⚠️ 检测到已有批量生产进程在运行:"
    echo "$EXISTING_PROCESS"
    echo ""
    read -p "是否要停止现有进程并重新启动? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 停止现有进程..."
        ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'pkill -f large-scale-batch-production-fixed'
        sleep 3
    else
        echo "❌ 取消启动，保持现有进程运行"
        exit 0
    fi
fi

# 上传最新脚本
echo "📤 上传最新脚本到服务器..."
scp -i /Users/a1/work/productmindai.pem large-scale-batch-production-fixed.mjs ec2-user@3.93.149.236:/home/productmindaidev/

# 启动后台任务
echo "🚀 启动大规模批量生产..."
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'cd /home/productmindaidev && nohup env VITE_DEFAULT_API_KEY=sk-567abb67b99d4a65acaa2d9ed06c3782 node large-scale-batch-production-fixed.mjs > large-batch-fixed.log 2>&1 &'

sleep 2

# 检查启动状态
echo "📊 检查启动状态..."
NEW_PROCESS=$(ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'ps aux | grep large-scale-batch-production-fixed | grep -v grep')

if [ ! -z "$NEW_PROCESS" ]; then
    echo "✅ 批量生产进程启动成功!"
    echo "$NEW_PROCESS"
    echo ""
    echo "📋 查看实时日志:"
    echo "  ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'cd /home/productmindaidev && tail -f large-batch-fixed.log'"
    echo ""
    echo "📊 监控进度:"
    echo "  ./monitor-large-batch.sh"
    echo ""
    echo "🛑 停止任务:"
    echo "  ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'pkill -f large-scale-batch-production-fixed'"
else
    echo "❌ 批量生产进程启动失败!"
    echo "查看错误日志:"
    ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 'cd /home/productmindaidev && tail -10 large-batch-fixed.log'
fi

echo ""
echo "═══════════════════════════════════════════"
echo "启动脚本完成 - $(date)" 