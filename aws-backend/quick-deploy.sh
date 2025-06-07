#!/bin/bash

# ProductMind AWS 快速部署脚本
# 一键部署到AWS ECS Fargate

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    ProductMind AWS 部署                      ║"
    echo "║                  解决30秒超时限制问题                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查前提条件
check_prerequisites() {
    log_info "检查部署前提条件..."
    
    # 检查AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI未找到，请先激活虚拟环境："
        echo "source ~/aws-cli-env/bin/activate"
        exit 1
    fi
    
    # 检查AWS认证
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS认证失败，请先配置："
        echo "aws configure"
        exit 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装"
        exit 1
    fi
    
    # 检查必要文件
    if [ ! -f "package.json" ]; then
        log_error "请在aws-backend目录中运行此脚本"
        exit 1
    fi
    
    if [ ! -f "aws/cloudformation-simple.yaml" ]; then
        log_error "CloudFormation模板不存在"
        exit 1
    fi
    
    log_success "所有前提条件检查通过"
}

# 获取AWS信息
get_aws_info() {
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    export AWS_REGION=$(aws configure get region || echo "us-east-1")
    export STACK_NAME="productmind-backend"
    export IMAGE_TAG="latest"
    export ECR_REPOSITORY="${STACK_NAME}-repo"
    export IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"
    
    log_info "AWS配置信息："
    log_info "  账户ID: $AWS_ACCOUNT_ID"
    log_info "  区域: $AWS_REGION"
    log_info "  堆栈名称: $STACK_NAME"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    if ! npm install &> /dev/null; then
        log_error "npm install 失败"
        exit 1
    fi
    
    if ! npm run build &> /dev/null; then
        log_error "项目构建失败"
        exit 1
    fi
    
    log_success "项目构建完成"
}

# 部署基础设施
deploy_infrastructure() {
    log_info "部署AWS基础设施..."
    
    if aws cloudformation describe-stacks --stack-name $STACK_NAME &> /dev/null; then
        log_info "更新现有堆栈..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://aws/cloudformation-simple.yaml \
            --capabilities CAPABILITY_IAM \
            --parameters ParameterKey=ImageUri,ParameterValue=$IMAGE_URI \
            &> /dev/null || log_warning "堆栈无需更新"
    else
        log_info "创建新堆栈..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://aws/cloudformation-simple.yaml \
            --capabilities CAPABILITY_IAM \
            --parameters ParameterKey=ImageUri,ParameterValue=$IMAGE_URI \
            &> /dev/null
    fi
    
    log_info "等待堆栈部署完成（这可能需要5-10分钟）..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME 2>/dev/null || \
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME 2>/dev/null
    
    log_success "基础设施部署完成"
}

# 构建和推送Docker镜像
build_and_push_image() {
    log_info "构建和推送Docker镜像..."
    
    # 确保ECR仓库存在
    if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY &> /dev/null; then
        log_info "创建ECR仓库..."
        aws ecr create-repository --repository-name $ECR_REPOSITORY &> /dev/null
    fi
    
    # 登录ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # 构建镜像
    log_info "构建Docker镜像..."
    if ! docker build -t $ECR_REPOSITORY:$IMAGE_TAG . &> /dev/null; then
        log_error "Docker镜像构建失败，可能是网络问题"
        log_info "建议使用增强版部署脚本：./deploy-aws-enhanced.sh --full-deploy"
        exit 1
    fi
    
    # 标记和推送镜像
    docker tag $ECR_REPOSITORY:$IMAGE_TAG $IMAGE_URI
    docker push $IMAGE_URI &> /dev/null
    
    log_success "Docker镜像推送完成"
}

# 部署服务
deploy_service() {
    log_info "部署ECS服务..."
    
    # 获取集群和服务名称
    local cluster_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
        --output text)
    
    local service_name=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' \
        --output text)
    
    if [ -n "$cluster_name" ] && [ -n "$service_name" ]; then
        # 强制新部署
        aws ecs update-service \
            --cluster $cluster_name \
            --service $service_name \
            --force-new-deployment &> /dev/null
        
        log_info "等待服务部署完成..."
        aws ecs wait services-stable \
            --cluster $cluster_name \
            --services $service_name
        
        log_success "服务部署完成"
    else
        log_error "无法获取集群或服务信息"
        exit 1
    fi
}

# 显示部署结果
show_results() {
    log_info "获取部署结果..."
    
    local alb_url=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text 2>/dev/null)
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                      🎉 部署成功！                           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    if [ -n "$alb_url" ]; then
        echo -e "${BLUE}🌐 应用访问地址：${NC}"
        echo "   主页: http://$alb_url"
        echo "   健康检查: http://$alb_url/health"
        echo "   API端点: http://$alb_url/api/v1/"
        echo ""
        
        # 测试健康检查
        log_info "测试健康检查..."
        sleep 30  # 等待服务完全启动
        if curl -s "http://$alb_url/health" | grep -q "ok"; then
            log_success "✅ 健康检查通过！服务正常运行"
        else
            log_warning "⚠️ 健康检查暂时失败，服务可能还在启动中"
            echo "请稍等几分钟后再次测试"
        fi
    else
        log_warning "无法获取负载均衡器URL"
    fi
    
    echo ""
    echo -e "${YELLOW}📊 管理命令：${NC}"
    echo "   查看状态: ./deploy-aws-enhanced.sh --status"
    echo "   查看日志: ./deploy-aws-enhanced.sh --logs"
    echo "   清理资源: ./deploy-aws-enhanced.sh --cleanup"
    echo ""
    echo -e "${BLUE}💰 预估月度成本: $65-80 USD${NC}"
}

# 主函数
main() {
    show_banner
    
    # 检查参数
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        echo "ProductMind AWS 快速部署脚本"
        echo ""
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --help, -h    显示帮助信息"
        echo "  --force       强制重新部署（跳过确认）"
        echo ""
        echo "前提条件:"
        echo "  1. 激活AWS CLI环境: source ~/aws-cli-env/bin/activate"
        echo "  2. 配置AWS认证: aws configure"
        echo "  3. 在aws-backend目录中运行"
        exit 0
    fi
    
    # 确认部署
    if [[ "$1" != "--force" ]]; then
        echo -e "${YELLOW}⚠️ 此操作将在AWS上创建资源，可能产生费用（约$65-80/月）${NC}"
        read -p "确定要继续部署吗？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
    
    # 执行部署步骤
    check_prerequisites
    get_aws_info
    build_project
    deploy_infrastructure
    
    # 尝试本地Docker构建，失败则提示使用增强版
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            build_and_push_image
        else
            log_warning "Docker未运行，使用增强版部署脚本"
            exec ./deploy-aws-enhanced.sh --build-only
        fi
    else
        log_warning "Docker未安装，使用增强版部署脚本"
        exec ./deploy-aws-enhanced.sh --build-only
    fi
    
    deploy_service
    show_results
    
    log_success "🎉 ProductMind后端已成功部署到AWS ECS Fargate！"
}

# 执行主函数
main "$@" 