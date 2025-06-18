#!/bin/bash
# ProductMind AI - 服务器环境完整部署管理脚本
# 支持前端、Netlify Functions、AWS后台和Nginx的统一管理

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 服务器配置
SERVER_DIR="/home/productmindaidev"
NGINX_CONF="/etc/nginx/sites-available/productmind"
NGINX_ENABLED="/etc/nginx/sites-enabled/productmind"
DOMAIN="productmindai.com"

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

# 检查是否在服务器环境
check_server_environment() {
    if [ ! -d "$SERVER_DIR" ]; then
        log_error "此脚本只能在服务器环境运行 (需要 $SERVER_DIR 目录)"
        exit 1
    fi
    
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 权限运行此脚本"
        exit 1
    fi
    
    log_info "确认服务器环境: $SERVER_DIR"
    cd "$SERVER_DIR" || { log_error "无法进入项目目录"; exit 1; }
}

# 显示帮助信息
show_help() {
    echo "ProductMind AI - 服务器环境部署管理脚本"
    echo ""
    echo "用法: sudo $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  deploy          完整部署所有服务 (包含Nginx配置)"
    echo "  start           启动所有服务"
    echo "  stop            停止所有服务"
    echo "  restart         重启所有服务"
    echo "  status          查看服务状态"
    echo "  logs            查看服务日志"
    echo "  health          健康检查"
    echo "  nginx           管理Nginx (start|stop|restart|status)"
    echo ""
    echo "选项:"
    echo "  --frontend-only    仅操作前端服务"
    echo "  --aws-only         仅操作AWS后台服务"
    echo "  --safe-mode        安全模式（保护正在运行的批量任务）"
    echo "  --skip-nginx       跳过Nginx操作"
    echo ""
    echo "示例:"
    echo "  sudo $0 deploy                    # 完整部署"
    echo "  sudo $0 start --aws-only          # 仅启动AWS后台"
    echo "  sudo $0 restart --safe-mode       # 安全重启"
    echo "  sudo $0 nginx restart             # 重启Nginx"
}

# 检查批量生成任务
check_batch_tasks() {
    BATCH_PROCESSES=$(ps aux | grep -E "(continuous_batch|batch-generate)" | grep -v grep)
    if [ -n "$BATCH_PROCESSES" ]; then
        log_warn "检测到正在运行的批量生成任务:"
        echo "$BATCH_PROCESSES"
        return 0
    else
        return 1
    fi
}

# 配置Nginx
configure_nginx() {
    log_step "配置Nginx..."
    
    # 创建Nginx配置文件
    cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name productmindai.com www.productmindai.com;
    
    # 前端应用 (Netlify Functions)
    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Netlify Functions 代理
    location /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # AWS后台API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 健康检查端点
    location /health {
        proxy_pass http://localhost:8888/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:8888;
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_set_header Host $host;
    }
    
    # 日志配置
    access_log /var/log/nginx/productmind_access.log;
    error_log /var/log/nginx/productmind_error.log;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF
    
    # 启用站点
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_CONF" "$NGINX_ENABLED"
        log_info "Nginx站点配置已启用"
    fi
    
    # 测试配置
    if nginx -t; then
        log_success "Nginx配置测试通过"
    else
        log_error "Nginx配置测试失败"
        return 1
    fi
}

# 管理Nginx
manage_nginx() {
    local action=$1
    
    case $action in
        start)
            log_step "启动Nginx..."
            systemctl start nginx
            if systemctl is-active --quiet nginx; then
                log_success "Nginx启动成功"
            else
                log_error "Nginx启动失败"
                return 1
            fi
            ;;
        stop)
            log_step "停止Nginx..."
            systemctl stop nginx
            log_success "Nginx已停止"
            ;;
        restart)
            log_step "重启Nginx..."
            systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                log_success "Nginx重启成功"
            else
                log_error "Nginx重启失败"
                return 1
            fi
            ;;
        status)
            log_step "Nginx状态:"
            systemctl status nginx --no-pager
            ;;
        reload)
            log_step "重载Nginx配置..."
            systemctl reload nginx
            log_success "Nginx配置已重载"
            ;;
    esac
}

# 停止服务
stop_services() {
    local scope=$1
    local safe_mode=$2
    local skip_nginx=$3
    
    log_step "停止服务 (范围: $scope, 安全模式: $safe_mode)"
    
    if [ "$safe_mode" = "true" ]; then
        if check_batch_tasks; then
            log_warn "安全模式：保护批量生成任务，仅停止前端相关服务"
            sudo -u ec2-user pm2 stop netlify-functions 2>/dev/null || true
            sudo -u ec2-user pm2 delete netlify-functions 2>/dev/null || true
            return 0
        fi
    fi
    
    case $scope in
        "frontend")
            sudo -u ec2-user pm2 stop netlify-functions 2>/dev/null || true
            sudo -u ec2-user pm2 delete netlify-functions 2>/dev/null || true
            ;;
        "aws")
            sudo -u ec2-user pm2 stop aws-backend 2>/dev/null || true
            sudo -u ec2-user pm2 delete aws-backend 2>/dev/null || true
            ;;
        "all")
            if [ "$safe_mode" = "true" ]; then
                sudo -u ec2-user pm2 stop netlify-functions 2>/dev/null || true
                sudo -u ec2-user pm2 delete netlify-functions 2>/dev/null || true
            else
                sudo -u ec2-user pm2 stop all 2>/dev/null || true
                sudo -u ec2-user pm2 delete all 2>/dev/null || true
                # 清理僵尸进程
                pkill -f "node.*backend-server" 2>/dev/null || true
                pkill -f "continuous_batch" 2>/dev/null || true
            fi
            ;;
    esac
    
    # 停止Nginx (如果不跳过)
    if [ "$skip_nginx" != "true" ] && [ "$scope" = "all" ]; then
        manage_nginx stop
    fi
    
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
    
    # 进入AWS后台目录
    cd aws-backend || {
        log_error "无法进入aws-backend目录"
        return 1
    }
    
    # 检查构建文件
    if [ ! -f "dist/server.js" ]; then
        log_warn "未找到构建文件，正在构建..."
        sudo -u ec2-user npm run build || {
            log_error "AWS后台构建失败"
            cd ..
            return 1
        }
    fi
    
    # 停止现有的AWS后台服务
    sudo -u ec2-user pm2 stop aws-backend 2>/dev/null || true
    sudo -u ec2-user pm2 delete aws-backend 2>/dev/null || true
    
    # 使用AWS后台目录中的配置文件启动
    if [ -f "ecosystem.config.js" ]; then
        sudo -u ec2-user pm2 start ecosystem.config.js || {
            log_error "AWS后台服务启动失败"
            cd ..
            return 1
        }
    else
        log_error "未找到 ecosystem.config.js 配置文件"
        cd ..
        return 1
    fi
    
    # 回到根目录
    cd ..
    
    # 等待服务启动
    sleep 10
    
    # 健康检查 (使用正确的端口3001)
    if curl -s http://localhost:3001/health > /dev/null; then
        log_success "AWS后台服务启动成功 (端口3001)"
        return 0
    else
        log_error "AWS后台服务健康检查失败 (端口3001)"
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
    sudo -u ec2-user pm2 stop netlify-functions 2>/dev/null || true
    sudo -u ec2-user pm2 delete netlify-functions 2>/dev/null || true
    
    # 使用通用配置启动
    sudo -u ec2-user pm2 start ecosystem.config.cjs || {
        log_error "前端服务启动失败"
        return 1
    }
    
    # 等待服务启动
    sleep 10
    
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
    local skip_nginx=$2
    
    log_step "启动服务 (范围: $scope)"
    
    case $scope in
        "frontend")
            start_frontend
            ;;
        "aws")
            start_aws_backend
            ;;
        "all")
            # 先启动AWS后台，再启动前端
            if start_aws_backend; then
                log_info "AWS后台服务启动成功，继续启动前端服务"
            else
                log_warn "AWS后台服务启动失败，但继续启动前端服务"
            fi
            
            start_frontend
            
            # 启动Nginx (如果不跳过)
            if [ "$skip_nginx" != "true" ]; then
                manage_nginx start
            fi
            ;;
    esac
}

# 完整部署
deploy_all() {
    log_highlight "开始服务器完整部署..."
    
    # 1. 停止现有服务
    log_step "停止现有服务..."
    stop_services "all" "false" "false"
    
    # 2. 更新权限
    log_step "更新文件权限..."
    chown -R ec2-user:ec2-user "$SERVER_DIR"
    
    # 3. 安装依赖
    log_step "安装依赖..."
    sudo -u ec2-user npm install || { log_error "依赖安装失败"; exit 1; }
    sudo -u ec2-user npm install dotenv || true
    
    # 4. 构建前端
    log_step "构建前端..."
    sudo -u ec2-user npm run build || { log_error "前端构建失败"; exit 1; }
    
    # 5. 验证函数文件
    log_step "验证Netlify函数..."
    if [ -d "netlify/functions-js" ]; then
        log_info "✓ 找到 netlify/functions-js 目录"
        ls -la netlify/functions-js/
    else
        log_error "netlify/functions-js 目录不存在"
        exit 1
    fi
    
    # 6. 创建后端服务器
    log_step "创建后端服务器..."
    cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server v5.0-server on port ${PORT}`);

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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
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
    version: '5.0.0-server',
    environment: 'production',
    server: 'productmindai.com'
  });
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

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
}

// SPA路由支持
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v5.0 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
  console.log(`[${new Date().toISOString()}] ✓ Server deployment complete`);
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
    
    # 7. 创建必要目录
    mkdir -p logs/aws-backend
    mkdir -p logs/nginx
    
    # 8. 配置Nginx
    configure_nginx
    
    # 9. 启动所有服务
    log_step "启动所有服务..."
    start_services "all" "false"
    
    log_success "服务器完整部署完成！"
}

# 查看服务状态
show_status() {
    log_step "服务器状态检查..."
    
    echo ""
    log_highlight "PM2服务状态:"
    sudo -u ec2-user pm2 list
    
    echo ""
    log_highlight "Nginx状态:"
    systemctl status nginx --no-pager
    
    echo ""
    log_highlight "端口监听状态:"
    netstat -tlnp | grep -E "(80|3001|8888)"
    
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
    
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ AWS后台 (3001): 正常"
    else
        echo "❌ AWS后台 (3001): 异常"
    fi
    
    if curl -s http://localhost/health > /dev/null; then
        echo "✅ Nginx代理 (80): 正常"
    else
        echo "❌ Nginx代理 (80): 异常"
    fi
}

# 主函数
main() {
    echo "=== ProductMind AI - 服务器环境部署管理脚本 ==="
    echo "执行时间: $(date)"
    echo ""
    
    # 检查服务器环境
    check_server_environment
    
    # 解析参数
    local command=""
    local scope="all"
    local safe_mode="false"
    local skip_nginx="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|start|stop|restart|status|logs|health)
                command="$1"
                shift
                ;;
            nginx)
                command="nginx"
                shift
                nginx_action="$1"
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
            --safe-mode)
                safe_mode="true"
                shift
                ;;
            --skip-nginx)
                skip_nginx="true"
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
            deploy_all
            ;;
        start)
            start_services "$scope" "$skip_nginx"
            ;;
        stop)
            stop_services "$scope" "$safe_mode" "$skip_nginx"
            ;;
        restart)
            stop_services "$scope" "$safe_mode" "$skip_nginx"
            sleep 5
            start_services "$scope" "$skip_nginx"
            ;;
        status)
            show_status
            ;;
        logs)
            sudo -u ec2-user pm2 logs --lines 50
            ;;
        health)
            # 执行健康检查
            curl -s http://localhost:8888/health | jq . 2>/dev/null || curl -s http://localhost:8888/health
            echo ""
            curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
            ;;
        nginx)
            manage_nginx "$nginx_action"
            ;;
    esac
    
    echo ""
    log_success "操作完成！"
}

# 执行主函数
main "$@" 