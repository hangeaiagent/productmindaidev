#!/bin/bash

# ProductMind AI 远程模板补充生成管理脚本
# 用于管理服务器上的模板补充生成任务

SERVER_KEY="/Users/a1/work/productmindai.pem"
SERVER_HOST="ec2-user@3.93.149.236"
SERVER_PATH="/home/productmindaidev"

echo "🚀 ProductMind AI 远程模板补充生成管理器"
echo "服务器: $SERVER_HOST"
echo "时间: $(date)"
echo "============================================================"

case "$1" in
    "status")
        echo "📊 检查服务器任务状态..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST" << 'REMOTE_STATUS'
cd /home/productmindaidev
echo "🔄 进程状态:"
ps aux | grep gennofinishpage.cjs | grep -v grep || echo "❌ 没有运行中的补充生成任务"
echo ""
echo "📁 日志文件:"
ls -la template-completion/logs/ 2>/dev/null || echo "❌ 没有日志文件"
echo ""
echo "💾 磁盘空间:"
df -h | grep -E "(Filesystem|/dev/)"
REMOTE_STATUS
        ;;
    "logs")
        echo "📋 查看最新日志..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST" << 'REMOTE_LOGS'
cd /home/productmindaidev
if ls template-completion/logs/completion-*.log 1> /dev/null 2>&1; then
    echo "📄 最新日志文件:"
    ls -lt template-completion/logs/completion-*.log | head -1
    echo ""
    echo "📊 最新日志内容（最后50行）:"
    tail -50 $(ls -t template-completion/logs/completion-*.log | head -1)
else
    echo "❌ 没有找到日志文件"
fi
REMOTE_LOGS
        ;;
    "monitor")
        echo "📊 实时监控日志..."
        echo "按 Ctrl+C 停止监控"
        ssh -i "$SERVER_KEY" "$SERVER_HOST" "cd /home/productmindaidev && tail -f template-completion/logs/completion-*.log"
        ;;
    "analyze")
        echo "📊 执行分析模式（不生成数据）..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST" << 'REMOTE_ANALYZE'
cd /home/productmindaidev
node template-completion/gennofinishpage.cjs
REMOTE_ANALYZE
        ;;
    "start")
        echo "🚀 启动补充生成任务..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST" << 'REMOTE_START'
cd /home/productmindaidev
echo "检查是否已有运行中的任务..."
if pgrep -f gennofinishpage.cjs > /dev/null; then
    echo "⚠️  已有运行中的补充生成任务"
    ps aux | grep gennofinishpage.cjs | grep -v grep
    echo "如需重启，请先执行: $0 stop"
else
    echo "📝 启动新的补充生成任务..."
    mkdir -p template-completion/logs
    nohup node template-completion/gennofinishpage.cjs --execute > template-completion/logs/completion-$(date +%Y%m%d_%H%M%S).log 2>&1 &
    sleep 2
    if pgrep -f gennofinishpage.cjs > /dev/null; then
        echo "✅ 补充生成任务启动成功"
        echo "进程ID: $(pgrep -f gennofinishpage.cjs)"
    else
        echo "❌ 启动失败，请检查日志"
    fi
fi
REMOTE_START
        ;;
    "stop")
        echo "🛑 停止补充生成任务..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST" << 'REMOTE_STOP'
cd /home/productmindaidev
if pgrep -f gennofinishpage.cjs > /dev/null; then
    echo "🛑 停止运行中的补充生成任务..."
    pkill -f gennofinishpage.cjs
    sleep 2
    if pgrep -f gennofinishpage.cjs > /dev/null; then
        echo "⚠️  强制停止..."
        pkill -9 -f gennofinishpage.cjs
    fi
    echo "✅ 任务已停止"
else
    echo "ℹ️  没有运行中的补充生成任务"
fi
REMOTE_STOP
        ;;
    "progress")
        echo "📈 查看生成进度..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST" << 'REMOTE_PROGRESS'
cd /home/productmindaidev
if ls template-completion/logs/completion-*.log 1> /dev/null 2>&1; then
    echo "📊 分析最新日志中的进度信息..."
    LATEST_LOG=$(ls -t template-completion/logs/completion-*.log | head -1)
    echo "日志文件: $LATEST_LOG"
    echo ""
    echo "🔍 进度统计:"
    grep -E "(进度|批次|✅|❌|生成)" "$LATEST_LOG" | tail -20
    echo ""
    echo "📈 最新状态:"
    tail -10 "$LATEST_LOG"
else
    echo "❌ 没有找到日志文件"
fi
REMOTE_PROGRESS
        ;;
    "ssh")
        echo "🔗 连接到服务器..."
        ssh -i "$SERVER_KEY" "$SERVER_HOST"
        ;;
    *)
        echo "使用方法:"
        echo "  $0 status     - 检查任务状态"
        echo "  $0 logs       - 查看最新日志"
        echo "  $0 monitor    - 实时监控日志"
        echo "  $0 analyze    - 执行分析模式"
        echo "  $0 start      - 启动补充生成"
        echo "  $0 stop       - 停止补充生成"
        echo "  $0 progress   - 查看生成进度"
        echo "  $0 ssh        - SSH连接服务器"
        echo ""
        echo "常用示例:"
        echo "  bash $0 status    # 检查状态"
        echo "  bash $0 monitor   # 实时监控"
        echo "  bash $0 progress  # 查看进度"
        ;;
esac
