#!/bin/bash

# ProductMind 部署诊断脚本
# 快速诊断部署问题

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

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                ProductMind 部署诊断器                        ║"
    echo "║                  快速定位部署问题                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查系统环境
check_system_environment() {
    log_info "检查系统环境..."
    
    echo "系统信息:"
    echo "  操作系统: $(uname -s)"
    echo "  架构: $(uname -m)"
    echo "  内核版本: $(uname -r)"
    echo "  当前用户: $(whoami)"
    echo "  工作目录: $(pwd)"
    echo "  可用磁盘空间: $(df -h . | tail -1 | awk '{print $4}')"
    
    # 检查内存
    if command -v free &> /dev/null; then
        echo "  可用内存: $(free -h | grep '^Mem:' | awk '{print $7}')"
    elif command -v vm_stat &> /dev/null; then
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local free_mb=$((free_pages * 4096 / 1024 / 1024))
        echo "  可用内存: ${free_mb}MB"
    fi
    
    echo ""
}

# 检查必需工具
check_required_tools() {
    log_info "检查必需工具..."
    
    local required_tools=("aws" "node" "npm" "curl")
    local optional_tools=("jq" "docker")
    local missing_tools=()
    
    # 检查必需工具
    for tool in "${required_tools[@]}"; do
        if command -v $tool &> /dev/null; then
            local version=$($tool --version 2>&1 | head -1)
            echo -e "  ${GREEN}✅ $tool${NC}: $version"
        else
            echo -e "  ${RED}❌ $tool${NC}: 未安装"
            missing_tools+=($tool)
        fi
    done
    
    # 检查可选工具
    for tool in "${optional_tools[@]}"; do
        if command -v $tool &> /dev/null; then
            local version=$($tool --version 2>&1 | head -1)
            echo -e "  ${GREEN}✅ $tool${NC}: $version (可选)"
        else
            echo -e "  ${YELLOW}⚠️ $tool${NC}: 未安装 (可选工具)"
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必需工具: ${missing_tools[*]}"
        return 1
    fi
    
    echo ""
}

# 检查AWS配置
check_aws_configuration() {
    log_info "检查AWS配置..."
    
    # 检查AWS CLI配置
    if aws configure list &> /dev/null; then
        echo "AWS CLI配置:"
        aws configure list | while read line; do
            echo "  $line"
        done
    else
        log_error "AWS CLI配置失败"
        return 1
    fi
    
    # 检查AWS认证
    if aws sts get-caller-identity &> /dev/null; then
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        local user_arn=$(aws sts get-caller-identity --query Arn --output text)
        local region=$(aws configure get region)
        
        echo "AWS认证信息:"
        echo "  账户ID: $account_id"
        echo "  用户ARN: $user_arn"
        echo "  区域: $region"
        
        log_success "AWS认证正常"
    else
        log_error "AWS认证失败"
        echo "请运行: aws configure"
        return 1
    fi
    
    echo ""
}

# 检查项目文件
check_project_files() {
    log_info "检查项目文件..."
    
    local required_files=(
        "package.json"
        "tsconfig.json"
        "Dockerfile"
        "src/server.ts"
        "aws/cloudformation-simple.yaml"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  ${GREEN}✅ $file${NC}"
        else
            echo -e "  ${RED}❌ $file${NC}: 文件不存在"
            missing_files+=($file)
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_error "缺少必需文件: ${missing_files[*]}"
        return 1
    fi
    
    # 检查node_modules
    if [ -d "node_modules" ]; then
        echo -e "  ${GREEN}✅ node_modules${NC}: 已安装"
    else
        echo -e "  ${YELLOW}⚠️ node_modules${NC}: 未安装，请运行 npm install"
    fi
    
    echo ""
}

# 检查CloudFormation堆栈
check_cloudformation_stack() {
    log_info "检查CloudFormation堆栈..."
    
    if aws cloudformation describe-stacks --stack-name $STACK_NAME &> /dev/null; then
        local stack_status=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].StackStatus' \
            --output text)
        
        echo "堆栈状态: $stack_status"
        
        case $stack_status in
            "CREATE_COMPLETE"|"UPDATE_COMPLETE")
                log_success "堆栈状态正常"
                ;;
            "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
                log_warning "堆栈正在部署中"
                ;;
            "CREATE_FAILED"|"UPDATE_FAILED"|"ROLLBACK_COMPLETE"|"UPDATE_ROLLBACK_COMPLETE")
                log_error "堆栈部署失败"
                echo "最近的失败事件:"
                aws cloudformation describe-stack-events \
                    --stack-name $STACK_NAME \
                    --max-items 3 \
                    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
                    --output table
                ;;
        esac
        
        # 显示堆栈输出
        echo "堆栈输出:"
        aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' \
            --output table
    else
        log_warning "CloudFormation堆栈不存在"
    fi
    
    echo ""
}

# 检查ECS服务
check_ecs_service() {
    log_info "检查ECS服务..."
    
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
            echo "ECS服务信息:"
            aws ecs describe-services \
                --cluster $cluster_name \
                --services $service_name \
                --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
                --output table
            
            # 检查任务状态
            echo "任务状态:"
            aws ecs list-tasks \
                --cluster $cluster_name \
                --service-name $service_name \
                --query 'taskArns[0]' \
                --output text | xargs -I {} aws ecs describe-tasks \
                --cluster $cluster_name \
                --tasks {} \
                --query 'tasks[0].{TaskArn:taskArn,LastStatus:lastStatus,HealthStatus:healthStatus,CreatedAt:createdAt}' \
                --output table 2>/dev/null || echo "  无活动任务"
        else
            log_warning "ECS服务名称未找到"
        fi
    else
        log_warning "ECS集群名称未找到"
    fi
    
    echo ""
}

# 检查ECR仓库
check_ecr_repository() {
    log_info "检查ECR仓库..."
    
    local repo_name="${STACK_NAME}-repo"
    
    if aws ecr describe-repositories --repository-names $repo_name &> /dev/null; then
        echo "ECR仓库信息:"
        aws ecr describe-repositories \
            --repository-names $repo_name \
            --query 'repositories[0].{Name:repositoryName,URI:repositoryUri,CreatedAt:createdAt}' \
            --output table
        
        # 检查镜像
        echo "镜像列表:"
        aws ecr list-images \
            --repository-name $repo_name \
            --query 'imageIds[].imageTag' \
            --output table 2>/dev/null || echo "  无镜像"
    else
        log_warning "ECR仓库不存在"
    fi
    
    echo ""
}

# 检查CodeBuild项目
check_codebuild_project() {
    log_info "检查CodeBuild项目..."
    
    local project_name="${STACK_NAME}-build"
    
    if aws codebuild describe-projects --names $project_name &> /dev/null; then
        echo "CodeBuild项目信息:"
        aws codebuild describe-projects \
            --names $project_name \
            --query 'projects[0].{Name:name,ServiceRole:serviceRole,Created:created}' \
            --output table
        
        # 检查最近的构建
        echo "最近的构建:"
        aws codebuild list-builds-for-project \
            --project-name $project_name \
            --query 'ids[0:3]' \
            --output text | xargs -I {} aws codebuild batch-get-builds \
            --ids {} \
            --query 'builds[].[id,buildStatus,currentPhase,startTime]' \
            --output table 2>/dev/null || echo "  无构建历史"
    else
        log_warning "CodeBuild项目不存在"
    fi
    
    echo ""
}

# 检查网络连接
check_network_connectivity() {
    log_info "检查网络连接..."
    
    local endpoints=(
        "https://aws.amazon.com"
        "https://console.aws.amazon.com"
        "https://registry-1.docker.io"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s --max-time 10 --head "$endpoint" > /dev/null; then
            echo -e "  ${GREEN}✅ $endpoint${NC}: 连接正常"
        else
            echo -e "  ${RED}❌ $endpoint${NC}: 连接失败"
        fi
    done
    
    # 检查应用访问
    local alb_url=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$alb_url" ]; then
        if curl -s --max-time 10 "http://$alb_url/health" | grep -q "ok"; then
            echo -e "  ${GREEN}✅ 应用健康检查${NC}: 正常"
        else
            echo -e "  ${RED}❌ 应用健康检查${NC}: 失败"
        fi
    fi
    
    echo ""
}

# 分析部署日志
analyze_deploy_logs() {
    log_info "分析部署日志..."
    
    if [ -f "$LOG_FILE" ]; then
        local total_lines=$(wc -l < "$LOG_FILE")
        local error_count=$(grep -c "\[ERROR\]" "$LOG_FILE" || echo "0")
        local warning_count=$(grep -c "\[WARNING\]" "$LOG_FILE" || echo "0")
        
        echo "日志统计:"
        echo "  总行数: $total_lines"
        echo "  错误数: $error_count"
        echo "  警告数: $warning_count"
        
        if [ "$error_count" -gt 0 ]; then
            echo ""
            echo "最近的错误:"
            grep "\[ERROR\]" "$LOG_FILE" | tail -5 | while read line; do
                echo -e "  ${RED}$line${NC}"
            done
        fi
        
        if [ "$warning_count" -gt 0 ]; then
            echo ""
            echo "最近的警告:"
            grep "\[WARNING\]" "$LOG_FILE" | tail -3 | while read line; do
                echo -e "  ${YELLOW}$line${NC}"
            done
        fi
    else
        log_warning "部署日志文件不存在: $LOG_FILE"
    fi
    
    echo ""
}

# 生成诊断报告
generate_report() {
    log_info "生成诊断报告..."
    
    local report_file="diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== ProductMind 部署诊断报告 ==="
        echo "生成时间: $(date)"
        echo "操作系统: $(uname -a)"
        echo ""
        
        echo "=== 系统环境 ==="
        check_system_environment 2>&1
        
        echo "=== 工具检查 ==="
        check_required_tools 2>&1
        
        echo "=== AWS配置 ==="
        check_aws_configuration 2>&1
        
        echo "=== 项目文件 ==="
        check_project_files 2>&1
        
        echo "=== CloudFormation堆栈 ==="
        check_cloudformation_stack 2>&1
        
        echo "=== ECS服务 ==="
        check_ecs_service 2>&1
        
        echo "=== ECR仓库 ==="
        check_ecr_repository 2>&1
        
        echo "=== CodeBuild项目 ==="
        check_codebuild_project 2>&1
        
        echo "=== 网络连接 ==="
        check_network_connectivity 2>&1
        
        echo "=== 部署日志分析 ==="
        analyze_deploy_logs 2>&1
        
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "=== 完整部署日志 ==="
            cat "$LOG_FILE"
        fi
        
    } > "$report_file"
    
    log_success "诊断报告已生成: $report_file"
}

# 显示建议
show_recommendations() {
    log_info "常见问题解决建议..."
    
    echo -e "${CYAN}🔧 常见问题解决方案:${NC}"
    echo ""
    echo "1. AWS认证问题:"
    echo "   - 运行: aws configure"
    echo "   - 检查访问密钥是否正确"
    echo "   - 确认用户有足够权限"
    echo ""
    echo "2. Docker网络问题:"
    echo "   - 使用增强版部署: ./deploy-aws-enhanced.sh --full-deploy"
    echo "   - 检查Docker Desktop是否运行"
    echo "   - 重启Docker服务"
    echo ""
    echo "3. CloudFormation失败:"
    echo "   - 检查模板语法: aws cloudformation validate-template"
    echo "   - 查看详细错误: aws cloudformation describe-stack-events"
    echo "   - 清理失败的堆栈: ./deploy-aws-enhanced.sh --cleanup"
    echo ""
    echo "4. ECS服务启动失败:"
    echo "   - 查看任务日志: ./deploy-aws-enhanced.sh --logs"
    echo "   - 检查镜像是否存在"
    echo "   - 验证任务定义配置"
    echo ""
    echo "5. 网络连接问题:"
    echo "   - 检查防火墙设置"
    echo "   - 使用VPN或代理"
    echo "   - 尝试不同的网络环境"
    echo ""
}

# 主函数
main() {
    show_banner
    
    # 解析命令行参数
    case "${1:-}" in
        --report)
            generate_report
            exit 0
            ;;
        --help|-h)
            echo "ProductMind 部署诊断器"
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --report    生成详细诊断报告"
            echo "  --help, -h  显示帮助信息"
            echo ""
            exit 0
            ;;
    esac
    
    # 执行诊断检查
    check_system_environment
    check_required_tools
    check_aws_configuration
    check_project_files
    check_cloudformation_stack
    check_ecs_service
    check_ecr_repository
    check_codebuild_project
    check_network_connectivity
    analyze_deploy_logs
    show_recommendations
    
    echo -e "${GREEN}诊断完成！${NC}"
    echo "如需详细报告，请运行: $0 --report"
}

# 执行主函数
main "$@" 