#!/bin/bash

# ProductMind AI 服务管理脚本 (增强版)
# 功能：管理所有服务的启动、停止、状态检查和自动恢复，包含API验证

# 日志相关
LOG_DIR="/home/productmindaidev/logs"
LOG_FILE="$LOG_DIR/service-manager.log"
MAX_LOG_SIZE=$((50*1024*1024)) # 50MB

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 服务配置
SERVICES=(
    "nginx"
    "netlify-functions"
    "aws-backend"
)

# 端口配置
declare -A SERVICE_PORTS=(
    ["netlify-functions"]="8888"
    ["aws-backend"]="3000"
)

# 健康检查URL
declare -A HEALTH_CHECKS=(
    ["netlify-functions"]="http://localhost:8888/health"
    ["aws-backend"]="http://localhost:3000/health"
)

# 关键API检查
declare -A CRITICAL_APIS=(
    ["ai-product-analysis"]="http://localhost:3000/api/ai-product-analysis"
    ["get-categories"]="http://localhost:8888/.netlify/functions/get-categories?language=zh"
)

# 日志管理
manage_logs() {
    mkdir -p "$LOG_DIR"
    
    if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
        mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d_%H%M%S)"
        touch "$LOG_FILE"
    fi
}

# 日志函数
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 检查端口占用
check_port() {
    local port=$1
    if lsof -i ":$port" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 清理端口
clean_port() {
    local port=$1
    log "INFO" "清理端口 $port"
    sudo lsof -ti ":$port" | xargs -r sudo kill -9
    sleep 2
}

# 检查关键API
check_critical_api() {
    local api_name=$1
    local api_url=$2
    
    case $api_name in
        "ai-product-analysis")
            local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
                -H "Content-Type: application/json" \
                -d '{"requirement":"系统检查测试需求，验证API功能","language":"zh"}' \
                "$api_url")
            ;;
        "get-categories")
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url")
            ;;
        *)
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url")
            ;;
    esac
    
    if [ "$response" = "200" ]; then
        log "SUCCESS" "$api_name API检查通过"
        return 0
    else
        log "ERROR" "$api_name API检查失败 (HTTP: $response)"
        return 1
    fi
}

# 启动单个服务
start_service() {
    local service=$1
    log "INFO" "正在启动服务: $service"
    
    case $service in
        "nginx")
            sudo systemctl start nginx
            ;;
        "netlify-functions")
            clean_port "${SERVICE_PORTS[$service]}"
            cd /home/productmindaidev
            pm2 start ecosystem.config.cjs --only netlify-functions
            ;;
        "aws-backend")
            clean_port "${SERVICE_PORTS[$service]}"
            cd /home/productmindaidev/aws-backend
            # 检查是否有deepseek-api-server在运行
            if ! pgrep -f "deepseek-api-server.cjs" > /dev/null; then
                nohup node deepseek-api-server.cjs > deepseek.log 2>&1 &
                log "INFO" "启动deepseek-api-server"
            fi
            ;;
    esac
    
    # 等待服务启动
    sleep 5
    
    # 验证服务状态
    check_service_health "$service"
}

# 停止单个服务
stop_service() {
    local service=$1
    log "INFO" "正在停止服务: $service"
    
    case $service in
        "nginx")
            sudo systemctl stop nginx
            ;;
        "aws-backend")
            # 停止deepseek-api-server
            pkill -f "deepseek-api-server.cjs"
            ;;
        *)
            pm2 stop "$service" 2>/dev/null || true
            pm2 delete "$service" 2>/dev/null || true
            ;;
    esac
}

# 检查服务健康状态
check_service_health() {
    local service=$1
    
    case $service in
        "nginx")
            if sudo systemctl is-active nginx >/dev/null 2>&1; then
                log "SUCCESS" "Nginx服务运行正常"
                return 0
            else
                log "ERROR" "Nginx服务异常"
                return 1
            fi
            ;;
        "aws-backend")
            # 检查进程是否存在
            if pgrep -f "deepseek-api-server.cjs" > /dev/null; then
                # 检查关键API
                if check_critical_api "ai-product-analysis" "${CRITICAL_APIS[ai-product-analysis]}"; then
                    return 0
                else
                    return 1
                fi
            else
                log "ERROR" "aws-backend进程未运行"
                return 1
            fi
            ;;
        *)
            if [ -n "${HEALTH_CHECKS[$service]}" ]; then
                if curl -s "${HEALTH_CHECKS[$service]}" >/dev/null 2>&1; then
                    log "SUCCESS" "$service 健康检查通过"
                    # 检查关键API（如果有）
                    if [ "$service" = "netlify-functions" ]; then
                        check_critical_api "get-categories" "${CRITICAL_APIS[get-categories]}"
                        return $?
                    fi
                    return 0
                else
                    log "ERROR" "$service 健康检查失败"
                    return 1
                fi
            else
                if pm2 list | grep -q "$service.*online"; then
                    log "SUCCESS" "$service PM2状态正常"
                    return 0
                else
                    log "ERROR" "$service PM2状态异常"
                    return 1
                fi
            fi
            ;;
    esac
}

# 重启单个服务
restart_service() {
    local service=$1
    log "INFO" "正在重启服务: $service"
    stop_service "$service"
    sleep 3
    start_service "$service"
}

# 显示所有服务状态
show_status() {
    log "INFO" "=== 服务状态检查 ==="
    
    for service in "${SERVICES[@]}"; do
        if check_service_health "$service"; then
            echo -e "${GREEN}✓ $service: 运行正常${NC}"
        else
            echo -e "${RED}✗ $service: 运行异常${NC}"
        fi
    done
    
    echo -e "\n=== PM2进程状态 ==="
    pm2 list
    
    echo -e "\n=== 端口占用情况 ==="
    for service in "${!SERVICE_PORTS[@]}"; do
        local port="${SERVICE_PORTS[$service]}"
        if check_port "$port"; then
            echo -e "${GREEN}✓ 端口 $port ($service): 正在使用${NC}"
        else
            echo -e "${RED}✗ 端口 $port ($service): 未使用${NC}"
        fi
    done
    
    echo -e "\n=== 关键API状态 ==="
    for api_name in "${!CRITICAL_APIS[@]}"; do
        if check_critical_api "$api_name" "${CRITICAL_APIS[$api_name]}"; then
            echo -e "${GREEN}✓ $api_name: API正常${NC}"
        else
            echo -e "${RED}✗ $api_name: API异常${NC}"
        fi
    done
}

# 自动恢复服务
auto_recover() {
    log "INFO" "开始自动恢复检查..."
    
    for service in "${SERVICES[@]}"; do
        if ! check_service_health "$service"; then
            log "WARN" "$service 服务异常，尝试重启"
            restart_service "$service"
            sleep 5
            
            if check_service_health "$service"; then
                log "SUCCESS" "$service 服务已恢复"
            else
                log "ERROR" "$service 服务恢复失败"
            fi
        fi
    done
}

# 主函数
main() {
    local command=$1
    local service=$2
    
    # 初始化日志
    manage_logs
    
    case $command in
        "start")
            if [ -n "$service" ]; then
                start_service "$service"
            else
                for s in "${SERVICES[@]}"; do
                    start_service "$s"
                done
            fi
            ;;
        "stop")
            if [ -n "$service" ]; then
                stop_service "$service"
            else
                for s in "${SERVICES[@]}"; do
                    stop_service "$s"
                done
            fi
            ;;
        "restart")
            if [ -n "$service" ]; then
                restart_service "$service"
            else
                for s in "${SERVICES[@]}"; do
                    restart_service "$s"
                done
            fi
            ;;
        "status")
            show_status
            ;;
        "recover")
            auto_recover
            ;;
        *)
            echo "用法: $0 {start|stop|restart|status|recover} [service]"
            echo "可用服务: ${SERVICES[*]}"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 