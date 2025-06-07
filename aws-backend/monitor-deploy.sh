#!/bin/bash

# ProductMind 部署监控脚本
# 实时监控部署进度和日志

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
STACK_NAME="productmind-backend"
LOG_FILE="deploy.log"
REFRESH_INTERVAL=5

# 显示横幅
show_banner() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                ProductMind 部署监控器                        ║"
    echo "║                  实时监控部署进度                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 获取CloudFormation堆栈状态
get_stack_status() {
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND"
}

# 获取ECS服务状态
get_ecs_status() {
    local cluster_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$cluster_name" ]; then
        local service_name=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$service_name" ]; then
            aws ecs describe-services \
                --cluster $cluster_name \
                --services $service_name \
                --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
                --output json 2>/dev/null || echo "{}"
        else
            echo "{}"
        fi
    else
        echo "{}"
    fi
}

# 获取CodeBuild状态
get_codebuild_status() {
    local project_name="${STACK_NAME}-build"
    
    # 获取最近的构建
    local build_id=$(aws codebuild list-builds-for-project \
        --project-name $project_name \
        --query 'ids[0]' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$build_id" ] && [ "$build_id" != "None" ]; then
        aws codebuild batch-get-builds \
            --ids $build_id \
            --query 'builds[0].{Status:buildStatus,Phase:currentPhase,StartTime:startTime}' \
            --output json 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

# 显示状态面板
show_status_panel() {
    local stack_status=$(get_stack_status)
    local ecs_status=$(get_ecs_status)
    local codebuild_status=$(get_codebuild_status)
    
    echo -e "${CYAN}📊 部署状态概览${NC} ($(date '+%H:%M:%S'))"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # CloudFormation状态
    echo -e "${BLUE}🏗️  CloudFormation:${NC}"
    case $stack_status in
        "CREATE_COMPLETE"|"UPDATE_COMPLETE")
            echo -e "   状态: ${GREEN}✅ $stack_status${NC}"
            ;;
        "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
            echo -e "   状态: ${YELLOW}🔄 $stack_status${NC}"
            ;;
        "CREATE_FAILED"|"UPDATE_FAILED"|"ROLLBACK_COMPLETE")
            echo -e "   状态: ${RED}❌ $stack_status${NC}"
            ;;
        "NOT_FOUND")
            echo -e "   状态: ${YELLOW}⚪ 堆栈不存在${NC}"
            ;;
        *)
            echo -e "   状态: ${YELLOW}❓ $stack_status${NC}"
            ;;
    esac
    
    # CodeBuild状态
    echo -e "${BLUE}🔨 CodeBuild:${NC}"
    if [ "$codebuild_status" != "{}" ]; then
        local build_status=$(echo "$codebuild_status" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)
        local build_phase=$(echo "$codebuild_status" | grep -o '"Phase": "[^"]*"' | cut -d'"' -f4)
        
        case $build_status in
            "SUCCEEDED")
                echo -e "   状态: ${GREEN}✅ 构建成功${NC}"
                ;;
            "IN_PROGRESS")
                echo -e "   状态: ${YELLOW}🔄 构建中 - $build_phase${NC}"
                ;;
            "FAILED"|"FAULT"|"STOPPED"|"TIMED_OUT")
                echo -e "   状态: ${RED}❌ 构建失败 - $build_status${NC}"
                ;;
            *)
                echo -e "   状态: ${YELLOW}❓ $build_status${NC}"
                ;;
        esac
    else
        echo -e "   状态: ${YELLOW}⚪ 无活动构建${NC}"
    fi
    
    # ECS服务状态
    echo -e "${BLUE}🚀 ECS服务:${NC}"
    if [ "$ecs_status" != "{}" ]; then
        local service_status=$(echo "$ecs_status" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)
        local running=$(echo "$ecs_status" | grep -o '"Running": [0-9]*' | cut -d' ' -f2)
        local desired=$(echo "$ecs_status" | grep -o '"Desired": [0-9]*' | cut -d' ' -f2)
        local pending=$(echo "$ecs_status" | grep -o '"Pending": [0-9]*' | cut -d' ' -f2)
        
        echo -e "   状态: ${GREEN}$service_status${NC}"
        echo -e "   实例: 运行中 $running/$desired, 等待中 $pending"
        
        if [ "$running" = "$desired" ] && [ "$desired" != "0" ]; then
            echo -e "   ${GREEN}✅ 服务健康${NC}"
        elif [ "$pending" != "0" ]; then
            echo -e "   ${YELLOW}🔄 服务启动中${NC}"
        else
            echo -e "   ${RED}⚠️ 服务异常${NC}"
        fi
    else
        echo -e "   状态: ${YELLOW}⚪ 服务未创建${NC}"
    fi
    
    # 应用访问地址
    local alb_url=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$alb_url" ]; then
        echo -e "${BLUE}🌐 访问地址:${NC}"
        echo -e "   主页: ${CYAN}http://$alb_url${NC}"
        echo -e "   健康检查: ${CYAN}http://$alb_url/health${NC}"
        
        # 测试健康检查
        if curl -s --max-time 5 "http://$alb_url/health" | grep -q "ok" 2>/dev/null; then
            echo -e "   ${GREEN}✅ 健康检查通过${NC}"
        else
            echo -e "   ${YELLOW}⚠️ 健康检查失败或超时${NC}"
        fi
    fi
    
    echo ""
}

# 显示最新日志
show_recent_logs() {
    echo -e "${CYAN}📝 最新部署日志${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f "$LOG_FILE" ]; then
        tail -10 "$LOG_FILE" | while read line; do
            if [[ $line == *"[ERROR]"* ]]; then
                echo -e "${RED}$line${NC}"
            elif [[ $line == *"[WARNING]"* ]]; then
                echo -e "${YELLOW}$line${NC}"
            elif [[ $line == *"[SUCCESS]"* ]]; then
                echo -e "${GREEN}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        echo -e "${YELLOW}日志文件不存在: $LOG_FILE${NC}"
    fi
    
    echo ""
}

# 显示CloudFormation事件
show_cloudformation_events() {
    echo -e "${CYAN}🏗️  CloudFormation 最新事件${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if aws cloudformation describe-stacks --stack-name $STACK_NAME &>/dev/null; then
        aws cloudformation describe-stack-events \
            --stack-name $STACK_NAME \
            --max-items 5 \
            --query 'StackEvents[].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
            --output table 2>/dev/null || echo "无法获取事件"
    else
        echo -e "${YELLOW}堆栈不存在${NC}"
    fi
    
    echo ""
}

# 显示帮助信息
show_help() {
    echo "ProductMind 部署监控器"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h        显示帮助信息"
    echo "  --interval N      设置刷新间隔（秒，默认5）"
    echo "  --log-file FILE   指定日志文件（默认deploy.log）"
    echo "  --once            只显示一次状态，不循环"
    echo ""
    echo "快捷键:"
    echo "  Ctrl+C           退出监控"
    echo "  q                退出监控"
    echo ""
}

# 主监控循环
monitor_loop() {
    local once_mode=false
    
    if [ "$1" = "--once" ]; then
        once_mode=true
    fi
    
    while true; do
        show_banner
        show_status_panel
        show_recent_logs
        show_cloudformation_events
        
        if [ "$once_mode" = true ]; then
            break
        fi
        
        echo -e "${CYAN}按 Ctrl+C 或 'q' 退出监控，${REFRESH_INTERVAL}秒后自动刷新...${NC}"
        
        # 等待用户输入或超时
        if read -t $REFRESH_INTERVAL -n 1 key 2>/dev/null; then
            if [ "$key" = "q" ] || [ "$key" = "Q" ]; then
                echo ""
                echo -e "${GREEN}监控已退出${NC}"
                break
            fi
        fi
    done
}

# 主函数
main() {
    local once_mode=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --interval)
                REFRESH_INTERVAL="$2"
                shift 2
                ;;
            --log-file)
                LOG_FILE="$2"
                shift 2
                ;;
            --once)
                once_mode=true
                shift
                ;;
            *)
                echo "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}错误: AWS CLI未找到${NC}"
        echo "请先激活AWS CLI环境: source ~/aws-cli-env/bin/activate"
        exit 1
    fi
    
    # 检查AWS认证
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}错误: AWS认证失败${NC}"
        echo "请先配置AWS认证: aws configure"
        exit 1
    fi
    
    # 开始监控
    if [ "$once_mode" = true ]; then
        monitor_loop --once
    else
        monitor_loop
    fi
}

# 信号处理
trap 'echo -e "\n${GREEN}监控已退出${NC}"; exit 0' INT TERM

# 执行主函数
main "$@" 