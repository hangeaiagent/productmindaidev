#!/bin/bash
# AWS后台服务启动脚本 (独立于前端部署)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo "=== AWS后台服务启动脚本 ==="
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

# 创建必要的目录
log_step "创建必要的目录..."
mkdir -p aws-backend/logs
mkdir -p logs/aws-backend

# 检查AWS后台目录
if [ ! -d "aws-backend" ]; then
    log_error "aws-backend目录不存在"
    exit 1
fi

# 进入AWS后台目录
cd aws-backend

# 检查必要文件
log_step "检查必要文件..."
if [ ! -f "package.json" ]; then
    log_error "aws-backend/package.json不存在"
    exit 1
fi

if [ ! -f "src/server.ts" ]; then
    log_error "aws-backend/src/server.ts不存在"
    exit 1
fi

# 安装依赖
log_step "安装AWS后台依赖..."
npm install || { log_error "安装依赖失败"; exit 1; }

# 编译TypeScript（如果需要）
if [ -f "tsconfig.json" ]; then
    log_step "编译TypeScript..."
    npx tsc || log_warn "TypeScript编译有警告，但继续执行"
fi

# 停止已存在的AWS后台服务
log_step "停止已存在的AWS后台服务..."
pm2 stop aws-backend 2>/dev/null || true
pm2 delete aws-backend 2>/dev/null || true

# 启动AWS后台服务
log_step "启动AWS后台服务..."
if [ -f "../ecosystem.config.aws.cjs" ]; then
    cd ..
    pm2 start ecosystem.config.aws.cjs || {
        log_error "使用PM2配置启动失败，尝试直接启动"
        cd aws-backend
        PORT=3000 npm start &
        AWS_BACKEND_PID=$!
        log_info "AWS后台服务PID: $AWS_BACKEND_PID"
    }
else
    log_warn "未找到PM2配置，直接启动"
    PORT=3000 npm start &
    AWS_BACKEND_PID=$!
    log_info "AWS后台服务PID: $AWS_BACKEND_PID"
fi

# 等待服务启动
log_step "等待服务启动..."
sleep 10

# 健康检查
log_step "健康检查..."
if curl -s http://localhost:3000/health > /dev/null; then
    log_info "✅ AWS后台服务启动成功"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    log_error "❌ AWS后台服务健康检查失败"
    log_info "检查日志:"
    if [ -f "logs/combined.log" ]; then
        tail -20 logs/combined.log
    fi
    exit 1
fi

# 显示服务状态
log_step "显示服务状态..."
echo ""
log_info "PM2服务状态:"
pm2 list

echo ""
log_info "AWS后台进程状态:"
ps aux | grep -E "(aws-backend|server\.ts|server\.js)" | grep -v grep

echo ""
log_info "🎉 AWS后台服务启动完成！"
echo "✅ 服务地址: http://localhost:3000"
echo "✅ 健康检查: http://localhost:3000/health"
echo ""
log_info "📝 查看日志:"
echo "pm2 logs aws-backend  # PM2日志"
echo "tail -f aws-backend/logs/combined.log  # 应用日志"
echo ""
log_info "🔄 停止服务:"
echo "pm2 stop aws-backend" 