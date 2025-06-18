#!/bin/bash

echo "=== ProductMind AI 服务启动脚本 ==="
echo "启动时间: $(date)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取当前工作目录
CURRENT_DIR=$(pwd)
log_info "当前工作目录: $CURRENT_DIR"

# 创建日志目录
mkdir -p logs/aws-backend

# 检查环境变量文件是否存在（如果不存在则使用默认.env）
if [ -f .env.frontend ]; then
    FRONTEND_ENV=".env.frontend"
elif [ -f .env ]; then
    FRONTEND_ENV=".env"
    log_warn "使用默认.env文件作为前端环境变量"
else
    log_error "未找到前端环境变量文件"
    exit 1
fi

if [ -f .env.aws-backend ]; then
    BACKEND_ENV=".env.aws-backend"
elif [ -f .env ]; then
    BACKEND_ENV=".env"
    log_warn "使用默认.env文件作为后台环境变量"
else
    log_error "未找到后台环境变量文件"
    exit 1
fi

# 停止已存在的服务（仅停止我们管理的服务）
log_info "停止现有相关服务..."
pm2 stop netlify-functions 2>/dev/null || true
pm2 stop aws-backend 2>/dev/null || true
pm2 delete netlify-functions 2>/dev/null || true
pm2 delete aws-backend 2>/dev/null || true

# 启动AWS后台服务
log_info "启动AWS后台服务..."
if [ -f "ecosystem.config.aws.cjs" ]; then
    # 临时设置环境变量
    export $(cat $BACKEND_ENV | grep -v '^#' | xargs)
    pm2 start ecosystem.config.aws.cjs || {
        log_error "AWS后台服务启动失败"
        exit 1
    }
else
    log_error "未找到 ecosystem.config.aws.cjs 配置文件"
    exit 1
fi

# 等待AWS后台服务启动
log_info "等待AWS后台服务启动..."
sleep 5

# 检查AWS后台服务状态
AWS_PORT=${AWS_BACKEND_PORT:-3000}
if curl -s http://localhost:$AWS_PORT/health > /dev/null; then
    log_info "AWS后台服务健康检查通过"
else
    log_warn "AWS后台服务健康检查失败，但继续启动前端服务"
fi

# 启动前端服务
log_info "启动前端服务..."
if [ -f "ecosystem.config.frontend.cjs" ]; then
    # 临时设置环境变量
    export $(cat $FRONTEND_ENV | grep -v '^#' | xargs)
    pm2 start ecosystem.config.frontend.cjs || {
        log_error "前端服务启动失败"
        exit 1
    }
else
    log_error "未找到 ecosystem.config.frontend.cjs 配置文件"
    exit 1
fi

# 等待前端服务启动
log_info "等待前端服务启动..."
sleep 5

# 检查前端服务状态
FRONTEND_PORT=${FRONTEND_PORT:-8888}
if curl -s http://localhost:$FRONTEND_PORT/health > /dev/null; then
    log_info "前端服务健康检查通过"
else
    log_warn "前端服务健康检查失败"
fi

# 显示服务状态
log_info "所有服务启动完成！"
echo ""
log_info "服务状态："
pm2 list

# 显示日志访问方式
echo ""
log_info "查看日志："
echo "前端服务日志：pm2 logs netlify-functions"
echo "AWS后台日志：pm2 logs aws-backend"
echo ""
log_info "服务访问："
echo "前端服务：http://localhost:$FRONTEND_PORT"
echo "AWS后台：http://localhost:$AWS_PORT"

# 1. 停止所有服务（如果在运行）
log_info "1. 停止现有服务..."
pm2 stop all 2>/dev/null || true
sleep 3

# 2. 清理僵尸进程
log_info "2. 清理僵尸进程..."
pkill -f "node" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "netlify" 2>/dev/null || true
sleep 2

# 3. 检查端口占用
log_info "3. 检查端口占用..."
for port in 3000 8888; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        log_warn "清理端口 $port 上的进程: $pids"
        echo "$pids" | xargs -r kill -9
        sleep 1
    fi
done

# 4. 检查必要文件
log_info "4. 检查必要文件..."
if [ ! -f "backend-server.cjs" ]; then
    log_error "backend-server.cjs 文件不存在，请先运行部署脚本"
    exit 1
fi

if [ ! -f "ecosystem.config.cjs" ]; then
    log_error "ecosystem.config.cjs 文件不存在，请先运行部署脚本"
    exit 1
fi

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    log_error "前端构建文件不存在，请先运行部署脚本"
    exit 1
fi

log_info "✓ 所有必要文件检查通过"

# 5. 清理PM2日志（可选）
if [ "$1" = "--clean-logs" ]; then
    log_info "5. 清理PM2日志..."
    pm2 flush
else
    log_info "5. 跳过日志清理（使用 --clean-logs 参数可清理日志）"
fi

# 6. 启动所有服务
log_info "6. 启动所有服务..."

# 检查是否有AWS后端
if [ -d "aws-backend" ] && [ -f "aws-backend/package.json" ]; then
    log_info "检测到AWS后端，将启动完整服务..."
    pm2 start ecosystem.config.cjs --env production
else
    log_info "未检测到AWS后端，只启动Netlify函数服务..."
    pm2 start ecosystem.config.cjs --only netlify-functions --env production
fi

# 7. 等待服务启动
log_info "7. 等待服务启动..."
sleep 15

# 8. 验证服务状态
log_info "8. 验证服务状态..."

echo "=== PM2服务状态 ==="
pm2 list

echo ""
echo "=== 端口监听状态 ==="
netstat_output=$(netstat -tuln | grep -E ":80|:3000|:8888")
if [ ! -z "$netstat_output" ]; then
    echo "$netstat_output"
else
    log_warn "未检测到预期端口监听"
fi

echo ""
echo "=== 服务健康检查 ==="

# 检查Netlify函数服务
log_info "检查Netlify函数服务 (端口8888)..."
health_response=$(curl -s -w "%{http_code}" http://localhost:8888/health 2>/dev/null)
http_code="${health_response: -3}"

if [ "$http_code" = "200" ]; then
    log_info "✓ Netlify函数服务健康"
    echo "健康检查响应: $(echo "$health_response" | head -c -3 | jq -r '.status, .timestamp, .functions' 2>/dev/null || echo "$health_response" | head -c -3)"
else
    log_error "✗ Netlify函数服务不健康 (HTTP $http_code)"
fi

# 检查AWS后端服务（如果存在）
if pm2 list | grep -q "aws-backend.*online"; then
    log_info "检查AWS后端服务 (端口3000)..."
    aws_response=$(curl -s -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    aws_http_code="${aws_response: -3}"
    
    if [ "$aws_http_code" = "200" ]; then
        log_info "✓ AWS后端服务健康"
    else
        log_warn "✗ AWS后端服务不健康 (HTTP $aws_http_code)"
    fi
fi

# 检查前端访问
log_info "检查前端访问..."
frontend_response=$(curl -s -w "%{http_code}" http://productmindai.com 2>/dev/null)
frontend_http_code="${frontend_response: -3}"

if [ "$frontend_http_code" = "200" ]; then
    log_info "✓ 前端访问正常"
else
    log_warn "✗ 前端访问异常 (HTTP $frontend_http_code)"
fi

# 9. 显示最新日志
echo ""
log_info "9. 显示最新日志..."
pm2 logs --lines 15

# 10. 保存PM2配置
pm2 save

echo ""
log_info "=== 服务启动完成 ==="
echo "完成时间: $(date)"
echo ""
echo "📊 服务状态概览:"

# 统计服务状态
online_count=$(pm2 list | grep -c "online" || echo "0")
total_count=$(pm2 list | grep -E "online|stopped|errored" | wc -l || echo "0")

echo "  ├─ PM2服务: $online_count/$total_count 在线"

if [ "$http_code" = "200" ]; then
    echo "  ├─ Netlify函数: ✓ 正常"
else
    echo "  ├─ Netlify函数: ✗ 异常"
fi

if pm2 list | grep -q "aws-backend.*online"; then
    if [ "$aws_http_code" = "200" ]; then
        echo "  ├─ AWS后端: ✓ 正常"
    else
        echo "  ├─ AWS后端: ✗ 异常"
    fi
else
    echo "  ├─ AWS后端: - 未启动"
fi

if [ "$frontend_http_code" = "200" ]; then
    echo "  └─ 前端访问: ✓ 正常"
else
    echo "  └─ 前端访问: ✗ 异常"
fi

echo ""
echo "🔗 快速访问:"
echo "  ├─ 网站: http://productmindai.com"
echo "  ├─ 健康检查: http://productmindai.com/health"
echo "  └─ 系统信息: http://productmindai.com/system"
echo ""
echo "📋 常用命令:"
echo "  ├─ 查看状态: pm2 list"
echo "  ├─ 查看日志: pm2 logs"
echo "  ├─ 查看特定服务日志: pm2 logs [服务名]"
echo "  ├─ 重启服务: pm2 restart [服务名]"
echo "  ├─ 停止服务: pm2 stop [服务名]"
echo "  └─ 重新部署: ./deploy-production.sh"

# 如果有任何服务不正常，提示用户
if [ "$online_count" -lt "$total_count" ] || [ "$http_code" != "200" ] || [ "$frontend_http_code" != "200" ]; then
    echo ""
    log_warn "⚠️  检测到部分服务异常，建议检查日志："
    echo "     pm2 logs --lines 50"
fi

# 检查环境变量文件
if [ ! -f .env.frontend ] || [ ! -f .env.aws-backend ]; then
    log_error "环境变量文件不存在！"
    log_error "请确保 .env.frontend 和 .env.aws-backend 文件已正确配置"
    exit 1
fi 