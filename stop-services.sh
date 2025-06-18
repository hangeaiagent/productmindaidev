#!/bin/bash
# ProductMind AI 服务停止脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 显示当前运行的服务
log_info "当前运行的服务："
pm2 list

# 停止前端服务
log_info "停止前端服务..."
pm2 stop netlify-functions 2>/dev/null || log_warn "前端服务未运行"
pm2 delete netlify-functions 2>/dev/null || true

# 停止AWS后台服务
log_info "停止AWS后台服务..."
pm2 stop aws-backend 2>/dev/null || log_warn "AWS后台服务未运行"
pm2 delete aws-backend 2>/dev/null || true

# 显示最终状态
log_info "所有服务已停止"
echo ""
log_info "服务状态："
pm2 list 