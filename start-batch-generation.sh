#!/bin/bash
# 批量模板生成任务启动脚本 (后台持续运行)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log_step() {
    echo -e "${BLUE}[STEP] $1${NC}"
}

log_highlight() {
    echo -e "${PURPLE}[HIGHLIGHT] $1${NC}"
}

echo "=== 批量模板生成任务启动脚本 ==="
echo "启动时间: $(date)"

# 检测环境
if [ -d "/home/productmindaidev" ]; then
    # 服务器环境
    PROJECT_DIR="/home/productmindaidev"
    log_info "检测到服务器环境"
else
    # 本地环境
    PROJECT_DIR=$(pwd)
    log_info "检测到本地环境"
fi

cd $PROJECT_DIR || { log_error "无法进入项目目录"; exit 1; }
log_info "当前工作目录: $PROJECT_DIR"

# 检查AWS后台服务是否运行
log_step "检查AWS后台服务状态..."
if curl -s http://localhost:3000/health > /dev/null; then
    log_info "✅ AWS后台服务正常运行"
else
    log_error "❌ AWS后台服务未运行，请先启动AWS后台服务"
    log_info "启动命令: ./start-aws-backend.sh"
    exit 1
fi

# 检查是否已有批量生成任务在运行
log_step "检查现有批量生成任务..."
EXISTING_BATCH=$(ps aux | grep -E "(continuous_batch|batch-generate)" | grep -v grep)
if [ -n "$EXISTING_BATCH" ]; then
    log_warn "检测到已有批量生成任务在运行:"
    echo "$EXISTING_BATCH"
    echo ""
    read -p "是否停止现有任务并启动新任务? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "停止现有批量生成任务..."
        pkill -f "continuous_batch" || true
        pkill -f "batch-generate" || true
        sleep 3
    else
        log_info "保持现有任务运行，退出"
        exit 0
    fi
fi

# 配置参数
USER_ID="afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1"
LANGUAGES="zh,en"
BATCH_SIZE=1
TEMPLATE_BATCH_SIZE=1
MAX_TIME=15000

# 显示配置
log_highlight "批量生成配置:"
echo "用户ID: $USER_ID"
echo "语言: $LANGUAGES"
echo "批次大小: $BATCH_SIZE"
echo "模板批次大小: $TEMPLATE_BATCH_SIZE"
echo "最大执行时间: ${MAX_TIME}ms"
echo ""

# 创建日志文件
LOG_FILE="continuous_execution.log"
log_step "创建日志文件: $LOG_FILE"

# 启动持续批量生成任务
log_step "启动持续批量生成任务..."

# 创建批量生成脚本
cat > continuous_batch_generation.sh << 'EOF'
#!/bin/bash

USER_ID="afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1"
LANGUAGES="zh,en"
BATCH_SIZE=1
TEMPLATE_BATCH_SIZE=1
MAX_TIME=15000
LOG_FILE="continuous_execution.log"

# 日志函数
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_with_timestamp "🚀 启动持续批量模板生成任务"
log_with_timestamp "配置: USER_ID=$USER_ID, LANGUAGES=$LANGUAGES, BATCH_SIZE=$BATCH_SIZE"

BATCH_COUNT=0
TOTAL_GENERATED=0
TOTAL_SKIPPED=0
TOTAL_ERRORS=0

while true; do
    BATCH_COUNT=$((BATCH_COUNT + 1))
    log_with_timestamp "=== 执行第 $BATCH_COUNT 个批次 ==="
    
    # 构建请求URL
    URL="http://localhost:3000/api/v1/batch-generate-templates"
    PARAMS="user_id=$USER_ID&languages=$LANGUAGES&batch_size=$BATCH_SIZE&template_batch_size=$TEMPLATE_BATCH_SIZE&max_time=$MAX_TIME"
    
    log_with_timestamp "请求URL: $URL?$PARAMS"
    
    # 发起请求
    RESPONSE=$(curl -s "$URL?$PARAMS" 2>&1)
    CURL_EXIT_CODE=$?
    
    if [ $CURL_EXIT_CODE -eq 0 ]; then
        # 解析响应
        if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
            # JSON响应有效
            SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
            GENERATED=$(echo "$RESPONSE" | jq -r '.generated // 0')
            SKIPPED=$(echo "$RESPONSE" | jq -r '.skipped // 0')
            ERRORS=$(echo "$RESPONSE" | jq -r '.errors // 0')
            
            TOTAL_GENERATED=$((TOTAL_GENERATED + GENERATED))
            TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
            TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
            
            log_with_timestamp "批次结果: 生成=$GENERATED, 跳过=$SKIPPED, 错误=$ERRORS"
            log_with_timestamp "累计统计: 生成=$TOTAL_GENERATED, 跳过=$TOTAL_SKIPPED, 错误=$TOTAL_ERRORS"
            
            if [ "$SUCCESS" = "true" ]; then
                log_with_timestamp "✅ 批次 $BATCH_COUNT 执行成功"
            else
                log_with_timestamp "⚠️  批次 $BATCH_COUNT 执行完成但有问题"
            fi
        else
            # 非JSON响应
            log_with_timestamp "❌ 批次 $BATCH_COUNT 响应格式错误: $RESPONSE"
        fi
    else
        log_with_timestamp "❌ 批次 $BATCH_COUNT 请求失败 (退出码: $CURL_EXIT_CODE)"
        log_with_timestamp "错误信息: $RESPONSE"
    fi
    
    # 等待间隔
    log_with_timestamp "等待30秒后执行下一批次..."
    sleep 30
done
EOF

chmod +x continuous_batch_generation.sh

# 后台启动批量生成任务
log_step "后台启动批量生成任务..."
nohup ./continuous_batch_generation.sh > /dev/null 2>&1 &
BATCH_PID=$!

log_info "✅ 批量生成任务已启动"
log_info "进程ID: $BATCH_PID"
log_info "日志文件: $LOG_FILE"

# 等待几秒确保任务启动
sleep 5

# 检查任务状态
if ps -p $BATCH_PID > /dev/null; then
    log_info "✅ 批量生成任务正在运行"
else
    log_error "❌ 批量生成任务启动失败"
    exit 1
fi

echo ""
log_highlight "🎉 批量生成任务启动完成！"
echo ""
log_info "📊 任务状态:"
ps aux | grep -E "(continuous_batch|batch-generate)" | grep -v grep
echo ""
log_info "📝 查看日志:"
echo "tail -f $LOG_FILE"
echo ""
log_info "🔄 停止任务:"
echo "pkill -f continuous_batch"
echo ""
log_info "💤 您可以安心关闭终端，任务将持续在后台运行！" 