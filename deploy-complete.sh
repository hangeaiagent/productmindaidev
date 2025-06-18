#!/bin/bash
# ProductMind AI - 完整部署管理脚本
# 整合前端、Netlify Functions 和 AWS后台三个应用的部署、启动、重启和关闭

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_success() {
    echo -e "${CYAN}[SUCCESS] $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "ProductMind AI - 完整部署管理脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  deploy          完整部署所有服务"
    echo "  start           启动所有服务"
    echo "  stop            停止所有服务"
    echo "  restart         重启所有服务"
    echo "  status          查看服务状态"
    echo "  logs            查看服务日志"
    echo "  health          健康检查"
    echo ""
    echo "选项:"
    echo "  --frontend-only    仅操作前端服务"
    echo "  --aws-only         仅操作AWS后台服务"
    echo "  --netlify-only     仅操作Netlify函数服务"
    echo "  --safe-mode        安全模式（保护正在运行的批量任务）"
    echo "  --force            强制执行（停止所有进程）"
    echo ""
    echo "示例:"
    echo "  $0 deploy                    # 完整部署所有服务"
    echo "  $0 start --aws-only          # 仅启动AWS后台服务"
    echo "  $0 restart --safe-mode       # 安全重启（保护批量任务）"
    echo "  $0 stop --frontend-only      # 仅停止前端服务"
}

# 检测环境
detect_environment() {
    if [ -d "/home/productmindaidev" ]; then
        PROJECT_DIR="/home/productmindaidev"
        ENV_TYPE="server"
        log_info "检测到服务器环境: $PROJECT_DIR"
    else
        PROJECT_DIR=$(pwd)
        ENV_TYPE="local"
        log_info "检测到本地环境: $PROJECT_DIR"
    fi
    
    cd "$PROJECT_DIR" || { log_error "无法进入项目目录"; exit 1; }
}

# 检查批量生成任务
check_batch_tasks() {
    BATCH_PROCESSES=$(ps aux | grep -E "(continuous_batch|batch-generate|aws-backend.*batch)" | grep -v grep)
    if [ -n "$BATCH_PROCESSES" ]; then
        log_warn "检测到正在运行的批量生成任务:"
        echo "$BATCH_PROCESSES"
        return 0
    else
        return 1
    fi
}

# 停止服务
stop_services() {
    local scope=$1
    local safe_mode=$2
    
    log_step "停止服务 (范围: $scope, 安全模式: $safe_mode)"
    
    if [ "$safe_mode" = "true" ]; then
        if check_batch_tasks; then
            log_warn "安全模式：保护批量生成任务，仅停止前端相关服务"
            pm2 stop netlify-functions 2>/dev/null || true
            pm2 delete netlify-functions 2>/dev/null || true
            return 0
        fi
    fi
    
    case $scope in
        "frontend")
            pm2 stop netlify-functions 2>/dev/null || true
            pm2 delete netlify-functions 2>/dev/null || true
            ;;
        "aws")
            pm2 stop aws-backend 2>/dev/null || true
            pm2 delete aws-backend 2>/dev/null || true
            ;;
        "netlify")
            pm2 stop netlify-functions 2>/dev/null || true
            pm2 delete netlify-functions 2>/dev/null || true
            ;;
        "all")
            if [ "$safe_mode" = "true" ]; then
                pm2 stop netlify-functions 2>/dev/null || true
                pm2 delete netlify-functions 2>/dev/null || true
            else
                pm2 stop all 2>/dev/null || true
                pm2 delete all 2>/dev/null || true
                # 清理可能的僵尸进程
                sudo pkill -f "node.*backend-server" 2>/dev/null || true
                sudo pkill -f "continuous_batch" 2>/dev/null || true
            fi
            ;;
    esac
    
    log_success "服务停止完成"
}

# 启动AWS后台服务
start_aws_backend() {
    log_step "启动AWS后台服务..."
    
    # 检查AWS后台目录
    if [ ! -d "aws-backend" ]; then
        log_error "aws-backend目录不存在"
        return 1
    fi
    
    # 停止现有的AWS后台服务
    pm2 stop aws-backend 2>/dev/null || true
    pm2 delete aws-backend 2>/dev/null || true
    
    # 使用PM2配置启动
    if [ -f "ecosystem.config.aws.cjs" ]; then
        pm2 start ecosystem.config.aws.cjs || {
            log_error "AWS后台服务启动失败"
            return 1
        }
    else
        log_error "未找到 ecosystem.config.aws.cjs 配置文件"
        return 1
    fi
    
    # 等待服务启动
    sleep 5
    
    # 健康检查
    if curl -s http://localhost:3000/health > /dev/null; then
        log_success "AWS后台服务启动成功"
        return 0
    else
        log_error "AWS后台服务健康检查失败"
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    log_step "启动前端服务..."
    
    # 检查必要文件
    if [ ! -f "backend-server.cjs" ]; then
        log_error "backend-server.cjs不存在，请先运行部署"
        return 1
    fi
    
    # 停止现有的前端服务
    pm2 stop netlify-functions 2>/dev/null || true
    pm2 delete netlify-functions 2>/dev/null || true
    
    # 使用通用配置启动
    pm2 start ecosystem.config.cjs || {
        log_error "前端服务启动失败"
        return 1
    }
    
    # 等待服务启动
    sleep 5
    
    # 健康检查
    if curl -s http://localhost:8888/health > /dev/null; then
        log_success "前端服务启动成功"
        return 0
    else
        log_error "前端服务健康检查失败"
        return 1
    fi
}

# 启动服务
start_services() {
    local scope=$1
    
    log_step "启动服务 (范围: $scope)"
    
    case $scope in
        "frontend")
            start_frontend
            ;;
        "aws")
            start_aws_backend
            ;;
        "netlify")
            start_frontend
            ;;
        "all")
            # 先启动AWS后台，再启动前端
            if start_aws_backend; then
                log_info "AWS后台服务启动成功，继续启动前端服务"
            else
                log_warn "AWS后台服务启动失败，但继续启动前端服务"
            fi
            
            start_frontend
            ;;
    esac
}

# 完整部署
deploy_all() {
    log_highlight "开始完整部署..."
    
    # 1. 构建前端
    log_step "构建前端..."
    npm run build || { log_error "前端构建失败"; exit 1; }
    
    # 2. 验证函数文件
    log_step "验证Netlify函数..."
    if [ -d "netlify/functions-js" ]; then
        log_info "✓ 找到 netlify/functions-js 目录"
        ls -la netlify/functions-js/
    else
        log_error "netlify/functions-js 目录不存在"
        exit 1
    fi
    
    # 3. 创建/更新后端服务器
    log_step "创建后端服务器..."
    cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server v5.0 on port ${PORT}`);

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
  const functionFiles = fs.existsSync(functionsDir) 
    ? fs.readdirSync(functionsDir).filter(f => f.endsWith('.cjs'))
    : [];

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    functions: functionFiles.length,
    functionList: functionFiles,
    version: '5.0.0-complete',
    functionsDir: functionsDir,
    deploymentType: 'complete-integration'
  });
});

// 加载JavaScript函数
const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
console.log(`[${new Date().toISOString()}] Looking for JS functions in: ${functionsDir}`);

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.cjs'));
  console.log(`[${new Date().toISOString()}] Found ${files.length} CJS function files: ${files.join(', ')}`);

  files.forEach(file => {
    const functionName = file.replace('.cjs', '');
    const functionPath = path.join(functionsDir, file);
    
    app.all(`/.netlify/functions/${functionName}`, async (req, res) => {
      try {
        delete require.cache[require.resolve(functionPath)];
        const func = require(functionPath);
        
        const event = {
          httpMethod: req.method,
          queryStringParameters: req.query,
          body: req.method === 'POST' ? JSON.stringify(req.body) : null,
          headers: req.headers,
          path: req.path,
          pathParameters: req.params
        };
        
        const context = {};
        const result = await func.handler(event, context);
        
        if (result.headers) {
          Object.keys(result.headers).forEach(key => {
            res.set(key, result.headers[key]);
          });
        }
        
        res.status(result.statusCode || 200).send(result.body);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Function ${functionName} error:`, error);
        res.status(500).json({ 
          error: 'Function execution failed', 
          function: functionName,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    console.log(`[${new Date().toISOString()}] ✓ Registered function: /.netlify/functions/${functionName}`);
  });
} else {
  console.log(`[${new Date().toISOString()}] Functions directory not found: ${functionsDir}`);
}

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v5.0 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
  console.log(`[${new Date().toISOString()}] ✓ Complete integration deployment`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
EOF
    
    # 4. 创建必要目录
    mkdir -p logs/aws-backend
    
    # 5. 启动所有服务
    log_step "启动所有服务..."
    start_services "all"
    
    log_success "完整部署完成！"
}

# 查看服务状态
show_status() {
    log_step "服务状态检查..."
    
    echo ""
    log_highlight "PM2服务状态:"
    pm2 list
    
    echo ""
    log_highlight "端口监听状态:"
    netstat -tlnp 2>/dev/null | grep -E "(3000|8888)" || echo "未检测到预期端口监听"
    
    echo ""
    log_highlight "批量任务状态:"
    BATCH_TASKS=$(ps aux | grep -E "(continuous_batch|batch-generate)" | grep -v grep)
    if [ -n "$BATCH_TASKS" ]; then
        echo "$BATCH_TASKS"
    else
        echo "未检测到批量生成任务"
    fi
    
    echo ""
    log_highlight "健康检查:"
    if curl -s http://localhost:8888/health > /dev/null; then
        echo "✅ 前端服务 (8888): 正常"
    else
        echo "❌ 前端服务 (8888): 异常"
    fi
    
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ AWS后台 (3000): 正常"
    else
        echo "❌ AWS后台 (3000): 异常"
    fi
}

# 查看日志
show_logs() {
    local lines=${1:-50}
    
    log_step "显示服务日志 (最近 $lines 行)..."
    
    echo ""
    log_highlight "PM2进程日志:"
    pm2 logs --lines $lines
}

# 健康检查
health_check() {
    log_step "执行健康检查..."
    
    local all_healthy=true
    
    # 检查前端服务
    if curl -s http://localhost:8888/health > /dev/null; then
        log_success "前端服务健康检查通过"
        curl -s http://localhost:8888/health | jq . 2>/dev/null || curl -s http://localhost:8888/health
    else
        log_error "前端服务健康检查失败"
        all_healthy=false
    fi
    
    echo ""
    
    # 检查AWS后台服务
    if curl -s http://localhost:3000/health > /dev/null; then
        log_success "AWS后台服务健康检查通过"
        curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
    else
        log_error "AWS后台服务健康检查失败"
        all_healthy=false
    fi
    
    echo ""
    
    if [ "$all_healthy" = true ]; then
        log_success "所有服务健康检查通过"
        return 0
    else
        log_error "部分服务健康检查失败"
        return 1
    fi
}

# 主函数
main() {
    echo "=== ProductMind AI - 完整部署管理脚本 ==="
    echo "执行时间: $(date)"
    echo ""
    
    # 检测环境
    detect_environment
    
    # 解析参数
    local command=""
    local scope="all"
    local safe_mode="false"
    local force_mode="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|start|stop|restart|status|logs|health)
                command="$1"
                shift
                ;;
            --frontend-only)
                scope="frontend"
                shift
                ;;
            --aws-only)
                scope="aws"
                shift
                ;;
            --netlify-only)
                scope="netlify"
                shift
                ;;
            --safe-mode)
                safe_mode="true"
                shift
                ;;
            --force)
                force_mode="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 如果没有指定命令，显示帮助
    if [ -z "$command" ]; then
        show_help
        exit 0
    fi
    
    # 执行命令
    case $command in
        deploy)
            if [ "$scope" = "all" ]; then
                deploy_all
            else
                log_error "部署命令只支持完整部署 (--all)"
                exit 1
            fi
            ;;
        start)
            start_services "$scope"
            ;;
        stop)
            stop_services "$scope" "$safe_mode"
            ;;
        restart)
            stop_services "$scope" "$safe_mode"
            sleep 3
            start_services "$scope"
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        health)
            health_check
            ;;
    esac
    
    echo ""
    log_success "操作完成！"
}

# 执行主函数
main "$@" 