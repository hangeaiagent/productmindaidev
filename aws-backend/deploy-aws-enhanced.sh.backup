#!/bin/bash

# AWS ECS Fargate 增强版部署脚本
# 解决本地Docker网络问题，使用AWS CodeBuild构建镜像

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> deploy.log
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> deploy.log
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> deploy.log
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> deploy.log
}

log_debug() {
    if [ "$DEBUG" = "true" ]; then
        echo -e "${YELLOW}[DEBUG]${NC} $(date '+%H:%M:%S') $1"
    fi
    echo "$(date '+%Y-%m-%d %H:%M:%S') [DEBUG] $1" >> deploy.log
}

# 进度显示函数
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local percent=$((current * 100 / total))
    local bar_length=50
    local filled_length=$((percent * bar_length / 100))
    
    printf "\r${BLUE}[%3d%%]${NC} " $percent
    printf "["
    for ((i=0; i<filled_length; i++)); do printf "█"; done
    for ((i=filled_length; i<bar_length; i++)); do printf "░"; done
    printf "] %s" "$message"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# 错误处理函数
handle_error() {
    local exit_code=$1
    local line_number=$2
    local command="$3"
    
    log_error "命令执行失败 (退出码: $exit_code, 行号: $line_number)"
    log_error "失败的命令: $command"
    
    # 收集系统信息
    log_debug "系统信息收集开始..."
    echo "=== 错误诊断信息 ===" >> deploy.log
    echo "时间: $(date)" >> deploy.log
    echo "工作目录: $(pwd)" >> deploy.log
    echo "用户: $(whoami)" >> deploy.log
    echo "AWS CLI版本: $(aws --version 2>&1)" >> deploy.log
    echo "Docker版本: $(docker --version 2>&1)" >> deploy.log
    echo "Node.js版本: $(node --version 2>&1)" >> deploy.log
    echo "可用磁盘空间: $(df -h . | tail -1)" >> deploy.log
    echo "内存使用: $(free -h 2>/dev/null || vm_stat)" >> deploy.log
    
    # 显示最近的日志
    log_error "最近的部署日志:"
    tail -20 deploy.log | while read line; do
        echo "  $line"
    done
    
    log_error "完整日志已保存到: deploy.log"
    log_error "请检查上述信息并重试，或联系技术支持"
    
    exit $exit_code
}

# 设置错误陷阱
set -eE
trap 'handle_error $? $LINENO "$BASH_COMMAND"' ERR

# 初始化日志
init_logging() {
    # 创建日志文件
    echo "=== ProductMind AWS 部署日志 ===" > deploy.log
    echo "开始时间: $(date)" >> deploy.log
    echo "脚本版本: v2.0" >> deploy.log
    echo "操作系统: $(uname -a)" >> deploy.log
    echo "" >> deploy.log
    
    log_info "日志记录已初始化"
    log_info "详细日志将保存到: deploy.log"
}

# 显示帮助信息
show_help() {
    echo "AWS ECS Fargate 增强版部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --test-only          仅运行测试，不进行部署"
    echo "  --setup-only         仅设置AWS基础设施"
    echo "  --build-only         仅构建和推送镜像"
    echo "  --deploy-only        仅部署服务（假设镜像已存在）"
    echo "  --full-deploy        完整部署（默认）"
    echo "  --cleanup            清理所有AWS资源"
    echo "  --status             检查部署状态"
    echo "  --logs               查看服务日志"
    echo "  --help               显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  STACK_NAME           CloudFormation堆栈名称（默认：productmind-backend）"
    echo "  IMAGE_TAG            Docker镜像标签（默认：latest）"
    echo "  AWS_REGION           AWS区域（默认：us-east-1）"
    echo ""
}

# 检查必需的工具
check_prerequisites() {
    log_info "检查必需的工具..."
    
    local missing_tools=()
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq未安装，将使用基础JSON解析"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必需的工具: ${missing_tools[*]}"
        log_error "请安装缺少的工具后重试"
        exit 1
    fi
    
    log_success "所有必需的工具都已安装"
}

# 检查AWS认证
check_aws_auth() {
    log_info "检查AWS认证..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS认证失败"
        log_error "请运行 'aws configure' 配置AWS认证"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local region=$(aws configure get region || echo "us-east-1")
    
    log_success "AWS认证成功"
    log_info "账户ID: $account_id"
    log_info "区域: $region"
    
    export AWS_ACCOUNT_ID=$account_id
    export AWS_REGION=${AWS_REGION:-$region}
}

# 设置默认变量
setup_variables() {
    export STACK_NAME=${STACK_NAME:-"productmind-backend"}
    export IMAGE_TAG=${IMAGE_TAG:-"latest"}
    export ECR_REPOSITORY="${STACK_NAME}-repo"
    export IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"
    
    log_info "部署配置:"
    log_info "  堆栈名称: $STACK_NAME"
    log_info "  镜像标签: $IMAGE_TAG"
    log_info "  ECR仓库: $ECR_REPOSITORY"
    log_info "  镜像URI: $IMAGE_URI"
}

# 运行测试
run_tests() {
    log_info "运行项目测试..."
    
    # 检查TypeScript编译
    if ! npm run build &> /dev/null; then
        log_error "TypeScript编译失败"
        return 1
    fi
    
    # 检查服务器启动
    log_info "测试服务器启动..."
    timeout 10s node dist/server.js &
    local server_pid=$!
    sleep 3
    
    if kill -0 $server_pid 2>/dev/null; then
        log_success "服务器启动测试通过"
        kill $server_pid 2>/dev/null || true
    else
        log_error "服务器启动测试失败"
        return 1
    fi
    
    log_success "所有测试通过"
}

# 创建CodeBuild项目用于构建Docker镜像
create_codebuild_project() {
    log_info "创建CodeBuild项目..."
    
    # 首先获取CodeBuild服务角色ARN
    local codebuild_role_arn=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`CodeBuildServiceRoleArn`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$codebuild_role_arn" ]; then
        log_error "无法获取CodeBuild服务角色ARN，请确保CloudFormation堆栈已创建"
        exit 1
    fi
    
    # 创建buildspec.yml
    cat > buildspec.yml << 'EOF'
version: 0.2
phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker image...
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
EOF

    # 创建CodeBuild项目
    local project_name="${STACK_NAME}-build"
    
    if aws codebuild describe-projects --names $project_name &> /dev/null; then
        log_info "CodeBuild项目已存在，跳过创建"
    else
        log_info "创建CodeBuild项目: $project_name"
        
        cat > codebuild-project.json << EOF
{
  "name": "$project_name",
  "source": {
    "type": "NO_SOURCE",
    "buildspec": "buildspec.yml"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "$AWS_REGION"
      },
      {
        "name": "AWS_ACCOUNT_ID",
        "value": "$AWS_ACCOUNT_ID"
      },
      {
        "name": "IMAGE_REPO_NAME",
        "value": "$ECR_REPOSITORY"
      },
      {
        "name": "IMAGE_TAG",
        "value": "$IMAGE_TAG"
      }
    ]
  },
  "serviceRole": "$codebuild_role_arn"
}
EOF
        
        aws codebuild create-project --cli-input-json file://codebuild-project.json
        rm codebuild-project.json
    fi
}

# 设置AWS基础设施
setup_infrastructure() {
    log_info "设置AWS基础设施..."
    show_progress 1 5 "检查CloudFormation模板..."
    
    # 检查CloudFormation模板
    if [ ! -f "aws/cloudformation-simple.yaml" ]; then
        log_error "CloudFormation模板不存在: aws/cloudformation-simple.yaml"
        exit 1
    fi
    
    log_debug "CloudFormation模板验证中..."
    if ! aws cloudformation validate-template --template-body file://aws/cloudformation-simple.yaml &>> deploy.log; then
        log_error "CloudFormation模板验证失败"
        log_error "请检查模板语法"
        exit 1
    fi
    
    show_progress 2 5 "检查现有堆栈..."
    
    # 检查现有堆栈
    local stack_exists=false
    if aws cloudformation describe-stacks --stack-name $STACK_NAME &>> deploy.log; then
        stack_exists=true
        log_info "发现现有堆栈: $STACK_NAME"
    else
        log_info "将创建新堆栈: $STACK_NAME"
    fi
    
    show_progress 3 5 "部署CloudFormation堆栈..."
    
    # 创建或更新CloudFormation堆栈
    if [ "$stack_exists" = true ]; then
        log_info "更新现有CloudFormation堆栈..."
        log_debug "执行堆栈更新命令..."
        
        if aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://aws/cloudformation-simple.yaml \
            --capabilities CAPABILITY_IAM \
            --parameters ParameterKey=ImageUri,ParameterValue=$IMAGE_URI \
            &>> deploy.log; then
            log_info "堆栈更新请求已提交"
        else
            local exit_code=$?
            if grep -q "No updates are to be performed" deploy.log; then
                log_warning "堆栈无需更新"
            else
                log_error "堆栈更新失败 (退出码: $exit_code)"
                log_error "请检查 deploy.log 获取详细错误信息"
                exit $exit_code
            fi
        fi
    else
        log_info "创建新的CloudFormation堆栈..."
        log_debug "执行堆栈创建命令..."
        
        if ! aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://aws/cloudformation-simple.yaml \
            --capabilities CAPABILITY_IAM \
            --parameters ParameterKey=ImageUri,ParameterValue=$IMAGE_URI \
            &>> deploy.log; then
            log_error "堆栈创建失败"
            log_error "请检查 deploy.log 获取详细错误信息"
            exit 1
        fi
        log_info "堆栈创建请求已提交"
    fi
    
    show_progress 4 5 "等待堆栈部署完成..."
    
    # 等待堆栈完成，带进度显示
    log_info "等待CloudFormation堆栈完成（这可能需要5-15分钟）..."
    log_info "您可以在AWS控制台查看详细进度: https://console.aws.amazon.com/cloudformation/"
    
    local wait_start=$(date +%s)
    local max_wait=1800  # 30分钟超时
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - wait_start))
        
        if [ $elapsed -gt $max_wait ]; then
            log_error "等待超时（30分钟），堆栈部署可能失败"
            log_error "请检查AWS控制台获取详细状态"
            exit 1
        fi
        
        # 获取堆栈状态
        local stack_status=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].StackStatus' \
            --output text 2>> deploy.log)
        
        log_debug "当前堆栈状态: $stack_status (已等待: ${elapsed}秒)"
        
        case $stack_status in
            "CREATE_COMPLETE"|"UPDATE_COMPLETE")
                log_success "堆栈部署完成"
                break
                ;;
            "CREATE_FAILED"|"UPDATE_FAILED"|"ROLLBACK_COMPLETE"|"UPDATE_ROLLBACK_COMPLETE")
                log_error "堆栈部署失败: $stack_status"
                log_error "获取失败事件..."
                aws cloudformation describe-stack-events \
                    --stack-name $STACK_NAME \
                    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
                    --output table >> deploy.log
                log_error "详细错误信息已记录到 deploy.log"
                exit 1
                ;;
            "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
                # 显示进度
                local progress_percent=$((elapsed * 100 / max_wait))
                if [ $progress_percent -gt 100 ]; then
                    progress_percent=100
                fi
                printf "\r${BLUE}[%3d%%]${NC} 堆栈部署中... (已等待: %dm%ds)" \
                    $progress_percent $((elapsed/60)) $((elapsed%60))
                sleep 30
                ;;
            *)
                log_warning "未知堆栈状态: $stack_status"
                sleep 30
                ;;
        esac
    done
    
    show_progress 5 5 "基础设施设置完成"
    log_success "基础设施设置完成"
}

# 构建和推送Docker镜像
build_and_push_image() {
    log_info "使用AWS CodeBuild构建Docker镜像..."
    show_progress 1 8 "检查ECR仓库..."
    
    # 确保ECR仓库存在
    if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY &>> deploy.log; then
        log_info "创建ECR仓库..."
        if ! aws ecr create-repository --repository-name $ECR_REPOSITORY &>> deploy.log; then
            log_error "ECR仓库创建失败"
            exit 1
        fi
        log_success "ECR仓库创建成功"
    else
        log_info "ECR仓库已存在"
    fi
    
    show_progress 2 8 "准备源代码..."
    
    # 创建源代码包
    log_info "准备源代码..."
    log_debug "创建源代码压缩包..."
    
    if ! tar -czf source.tar.gz --exclude=node_modules --exclude=dist --exclude=.git --exclude=deploy.log . 2>> deploy.log; then
        log_error "源代码打包失败"
        exit 1
    fi
    
    local source_size=$(du -h source.tar.gz | cut -f1)
    log_info "源代码包大小: $source_size"
    
    show_progress 3 8 "创建临时S3存储桶..."
    
    # 上传到S3（临时）
    local bucket_name="${STACK_NAME}-build-$(date +%s)"
    log_info "创建临时S3存储桶: $bucket_name"
    
    if ! aws s3 mb s3://$bucket_name &>> deploy.log; then
        log_error "S3存储桶创建失败"
        exit 1
    fi
    
    show_progress 4 8 "上传源代码到S3..."
    
    log_info "上传源代码到S3..."
    if ! aws s3 cp source.tar.gz s3://$bucket_name/ &>> deploy.log; then
        log_error "源代码上传失败"
        # 清理
        aws s3 rb s3://$bucket_name --force &>> deploy.log
        rm -f source.tar.gz
        exit 1
    fi
    
    show_progress 5 8 "启动CodeBuild构建..."
    
    # 启动CodeBuild
    local project_name="${STACK_NAME}-build"
    log_info "启动CodeBuild项目: $project_name"
    
    local build_id=$(aws codebuild start-build \
        --project-name $project_name \
        --source-override type=S3,location=$bucket_name/source.tar.gz \
        --query 'build.id' --output text 2>> deploy.log)
    
    if [ -z "$build_id" ]; then
        log_error "CodeBuild启动失败"
        exit 1
    fi
    
    log_info "CodeBuild构建ID: $build_id"
    log_info "您可以在AWS控制台查看构建进度: https://console.aws.amazon.com/codesuite/codebuild/"
    
    show_progress 6 8 "等待构建完成..."
    
    # 等待构建完成，带详细进度
    local build_start=$(date +%s)
    local build_timeout=1800  # 30分钟超时
    
    while true; do
        local current_time=$(date +%s)
        local build_elapsed=$((current_time - build_start))
        
        if [ $build_elapsed -gt $build_timeout ]; then
            log_error "构建超时（30分钟）"
            exit 1
        fi
        
        # 获取构建状态
        local build_info=$(aws codebuild batch-get-builds --ids $build_id 2>> deploy.log)
        local status=$(echo "$build_info" | grep -o '"buildStatus": "[^"]*"' | cut -d'"' -f4)
        local phase=$(echo "$build_info" | grep -o '"currentPhase": "[^"]*"' | cut -d'"' -f4)
        
        log_debug "构建状态: $status, 当前阶段: $phase (已等待: ${build_elapsed}秒)"
        
        case $status in
            "SUCCEEDED")
                log_success "Docker镜像构建成功"
                break
                ;;
            "FAILED"|"FAULT"|"STOPPED"|"TIMED_OUT")
                log_error "Docker镜像构建失败: $status"
                log_error "获取构建日志..."
                aws codebuild batch-get-builds --ids $build_id \
                    --query 'builds[0].logs' >> deploy.log
                exit 1
                ;;
            "IN_PROGRESS")
                local build_percent=$((build_elapsed * 100 / build_timeout))
                if [ $build_percent -gt 100 ]; then
                    build_percent=100
                fi
                printf "\r${BLUE}[%3d%%]${NC} 构建中... 阶段: %s (已等待: %dm%ds)" \
                    $build_percent "$phase" $((build_elapsed/60)) $((build_elapsed%60))
                sleep 30
                ;;
            *)
                log_warning "未知构建状态: $status"
                sleep 30
                ;;
        esac
    done
    
    show_progress 7 8 "清理临时资源..."
    
    # 清理临时资源
    log_info "清理临时资源..."
    aws s3 rm s3://$bucket_name/source.tar.gz &>> deploy.log
    aws s3 rb s3://$bucket_name &>> deploy.log
    rm -f source.tar.gz buildspec.yml
    
    show_progress 8 8 "镜像构建完成"
    log_success "Docker镜像构建和推送完成"
}

# 部署服务
deploy_service() {
    log_info "部署ECS服务..."
    
    # 更新ECS服务
    local cluster_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
        --output text)
    
    local service_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' \
        --output text)
    
    if [ -n "$cluster_name" ] && [ -n "$service_name" ]; then
        log_info "更新ECS服务: $service_name"
        aws ecs update-service \
            --cluster $cluster_name \
            --service $service_name \
            --force-new-deployment
        
        log_info "等待服务部署完成..."
        aws ecs wait services-stable \
            --cluster $cluster_name \
            --services $service_name
        
        log_success "服务部署完成"
    else
        log_error "无法获取集群或服务名称"
        exit 1
    fi
}

# 检查部署状态
check_status() {
    log_info "检查部署状态..."
    
    # 获取负载均衡器URL
    local alb_url=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text 2>/dev/null || echo "未找到")
    
    if [ "$alb_url" != "未找到" ]; then
        log_success "应用URL: http://$alb_url"
        log_info "健康检查: http://$alb_url/health"
        
        # 测试健康检查
        log_info "测试健康检查..."
        if curl -s "http://$alb_url/health" | grep -q "ok"; then
            log_success "健康检查通过"
        else
            log_warning "健康检查失败，服务可能还在启动中"
        fi
    else
        log_warning "无法获取负载均衡器URL"
    fi
    
    # 显示ECS服务状态
    local cluster_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$cluster_name" ]; then
        log_info "ECS服务状态:"
        aws ecs describe-services \
            --cluster $cluster_name \
            --services $(aws cloudformation describe-stacks \
                --stack-name $STACK_NAME \
                --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' \
                --output text) \
            --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
    fi
}

# 查看日志
view_logs() {
    log_info "获取服务日志..."
    
    local log_group="/aws/ecs/$STACK_NAME"
    
    if aws logs describe-log-groups --log-group-name-prefix $log_group &> /dev/null; then
        log_info "最近的日志条目:"
        aws logs tail $log_group --follow
    else
        log_warning "日志组不存在或无法访问"
    fi
}

# 清理资源
cleanup() {
    log_warning "开始清理AWS资源..."
    
    read -p "确定要删除所有AWS资源吗？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "取消清理操作"
        return
    fi
    
    # 删除CloudFormation堆栈
    if aws cloudformation describe-stacks --stack-name $STACK_NAME &> /dev/null; then
        log_info "删除CloudFormation堆栈..."
        aws cloudformation delete-stack --stack-name $STACK_NAME
        aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
    fi
    
    # 删除ECR仓库
    if aws ecr describe-repositories --repository-names $ECR_REPOSITORY &> /dev/null; then
        log_info "删除ECR仓库..."
        aws ecr delete-repository --repository-name $ECR_REPOSITORY --force
    fi
    
    # 删除CodeBuild项目
    local project_name="${STACK_NAME}-build"
    if aws codebuild describe-projects --names $project_name &> /dev/null; then
        log_info "删除CodeBuild项目..."
        aws codebuild delete-project --name $project_name
    fi
    
    log_success "清理完成"
}

# 主函数
main() {
    local action="full-deploy"
    
    # 检查调试模式
    if [[ "$1" == "--debug" ]]; then
        export DEBUG=true
        shift
        log_info "调试模式已启用"
    fi
    
    # 初始化日志
    init_logging
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test-only)
                action="test-only"
                shift
                ;;
            --setup-only)
                action="setup-only"
                shift
                ;;
            --build-only)
                action="build-only"
                shift
                ;;
            --deploy-only)
                action="deploy-only"
                shift
                ;;
            --full-deploy)
                action="full-deploy"
                shift
                ;;
            --cleanup)
                action="cleanup"
                shift
                ;;
            --status)
                action="status"
                shift
                ;;
            --logs)
                action="logs"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "开始AWS ECS Fargate部署..."
    log_info "操作模式: $action"
    log_info "时间戳: $(date)"
    
    # 基础检查
    check_prerequisites
    check_aws_auth
    setup_variables
    
    # 根据操作模式执行相应步骤
    case $action in
        "test-only")
            run_tests
            ;;
        "setup-only")
            setup_infrastructure
            ;;
        "build-only")
            create_codebuild_project
            build_and_push_image
            ;;
        "deploy-only")
            deploy_service
            ;;
        "full-deploy")
            run_tests
            setup_infrastructure
            create_codebuild_project
            build_and_push_image
            deploy_service
            check_status
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            check_status
            ;;
        "logs")
            view_logs
            ;;
    esac
    
    log_success "操作完成！"
    log_info "完整日志已保存到: deploy.log"
}

# 执行主函数
main "$@" 