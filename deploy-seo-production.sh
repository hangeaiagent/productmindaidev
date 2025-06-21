#!/bin/bash

# ============================================
# ProductMind AI - SEO页面生成生产部署脚本
# 版本: v1.0.0
# 功能: 环境检查、批量执行、日志监控
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_ROOT=$(pwd)
AWS_BACKEND_DIR="$PROJECT_ROOT/aws-backend"
LOG_DIR="$PROJECT_ROOT/logs"
OUTPUT_DIR="$PROJECT_ROOT/static-pages"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/seo-generation-$TIMESTAMP.log"
PID_FILE="$LOG_DIR/seo-generation.pid"
ENV_FILE="$AWS_BACKEND_DIR/.env"

# 打印带颜色的日志
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE} $1 ${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

# 环境检查函数
check_environment() {
    log_header "环境检查"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    log_success "Node.js 版本: $(node --version)"
    
    # 检查必要目录
    if [ ! -d "$AWS_BACKEND_DIR" ]; then
        log_error "aws-backend 目录不存在: $AWS_BACKEND_DIR"
        exit 1
    fi
    log_success "aws-backend 目录存在"
    
    # 检查环境变量文件
    if [ ! -f "$ENV_FILE" ]; then
        log_error "环境变量文件不存在: $ENV_FILE"
        log_info "请确保 aws-backend/.env 文件存在并包含必要配置"
        exit 1
    fi
    log_success "环境变量文件存在: $ENV_FILE"
    
    # 检查生成器文件
    if [ ! -f "$AWS_BACKEND_DIR/enhanced-template-generator.mjs" ]; then
        log_error "模板生成器不存在: $AWS_BACKEND_DIR/enhanced-template-generator.mjs"
        exit 1
    fi
    log_success "模板生成器存在"
    
    # 创建必要目录
    mkdir -p "$LOG_DIR"
    mkdir -p "$OUTPUT_DIR"
    log_success "日志目录: $LOG_DIR"
    log_success "输出目录: $OUTPUT_DIR"
}

# 启动批量生成
start_batch_generation() {
    log_header "启动批量生成"
    
    cd "$AWS_BACKEND_DIR"
    
    log_info "开始SEO页面批量生成 - $TIMESTAMP"
    log_info "日志文件: $LOG_FILE"
    log_info "输出目录: $OUTPUT_DIR"
    
    # 启动生成器（后台执行）
    nohup node enhanced-template-generator.mjs >> "$LOG_FILE" 2>&1 &
    GENERATION_PID=$!
    echo $GENERATION_PID > "$PID_FILE"
    
    log_success "生成器已启动，进程ID: $GENERATION_PID"
    log_info "使用以下命令监控进度:"
    echo -e "${YELLOW}  tail -f $LOG_FILE${NC}"
    echo -e "${YELLOW}  ./deploy-seo-production.sh monitor${NC}"
    
    cd "$PROJECT_ROOT"
}

# 监控执行状态
monitor_execution() {
    log_header "执行监控"
    
    if [ ! -f "$PID_FILE" ]; then
        log_error "未找到进程ID文件，生成器可能未运行"
        return 1
    fi
    
    CURRENT_PID=$(cat "$PID_FILE")
    
    if ! kill -0 "$CURRENT_PID" 2>/dev/null; then
        log_warning "进程 $CURRENT_PID 已停止"
        rm -f "$PID_FILE"
        return 1
    fi
    
    log_info "进程 $CURRENT_PID 正在运行"
    
    # 显示最新日志
    LATEST_LOG=$(ls -t "$LOG_DIR"/seo-generation-*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        log_info "最新日志文件: $LATEST_LOG"
        echo -e "${BLUE}=== 最近10行日志 ===${NC}"
        tail -10 "$LATEST_LOG"
        echo -e "${BLUE}===================${NC}"
        
        # 统计信息
        if [ -f "$LATEST_LOG" ]; then
            SUCCESS_COUNT=$(grep -c "✅ 成功处理" "$LATEST_LOG" 2>/dev/null || echo "0")
            ERROR_COUNT=$(grep -c "❌ 处理失败" "$LATEST_LOG" 2>/dev/null || echo "0")
            log_info "成功: $SUCCESS_COUNT, 错误: $ERROR_COUNT"
        fi
    fi
}

# 停止执行
stop_execution() {
    log_header "停止执行"
    
    if [ ! -f "$PID_FILE" ]; then
        log_warning "未找到进程ID文件"
        return 0
    fi
    
    CURRENT_PID=$(cat "$PID_FILE")
    
    if kill -0 "$CURRENT_PID" 2>/dev/null; then
        log_info "停止进程 $CURRENT_PID..."
        kill -TERM "$CURRENT_PID"
        sleep 3
        
        if kill -0 "$CURRENT_PID" 2>/dev/null; then
            log_warning "优雅停止失败，强制停止"
            kill -9 "$CURRENT_PID"
        fi
        
        log_success "进程已停止"
    else
        log_info "进程已经停止"
    fi
    
    rm -f "$PID_FILE"
}

# 显示帮助信息
show_help() {
    echo -e "${PURPLE}ProductMind AI - SEO页面生成生产部署脚本${NC}"
    echo
    echo "用法: $0 [命令]"
    echo
    echo "可用命令:"
    echo "  start     - 启动批量生成 (默认)"
    echo "  monitor   - 监控执行状态"
    echo "  stop      - 停止执行"
    echo "  help      - 显示帮助信息"
    echo
    echo "示例:"
    echo "  $0 start    # 启动批量生成"
    echo "  $0 monitor  # 监控执行状态"
    echo
}

# 主函数
main() {
    # 确保日志目录存在
    mkdir -p "$LOG_DIR"
    
    case "${1:-start}" in
        "start")
            check_environment
            start_batch_generation
            ;;
        "monitor")
            monitor_execution
            ;;
        "stop")
            stop_execution
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
