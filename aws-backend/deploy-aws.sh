#!/bin/bash

# ProductMind AI AWS Backend 完整部署脚本
# 用于AWS ECS Fargate自动化部署

set -e  # 遇到错误立即退出

echo "🚀 ProductMind AI AWS Backend - 完整部署脚本"
echo "=================================================="

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
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔥 $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示此帮助信息"
    echo "  -t, --test-only         仅运行测试，不进行部署"
    echo "  -d, --docker-only       仅构建Docker镜像"
    echo "  -p, --push              构建并推送到ECR"
    echo "  -f, --full-deploy       完整部署（包含CloudFormation）"
    echo "  -s, --skip-tests        跳过功能测试"
    echo "  --tag <version>         指定镜像版本标签 (默认: latest)"
    echo "  --stack-name <name>     CloudFormation堆栈名称 (默认: productmind-backend)"
    echo ""
    echo "示例:"
    echo "  $0 --test-only          # 仅运行测试"
    echo "  $0 --docker-only        # 仅构建Docker镜像"
    echo "  $0 --push --tag v1.0.0  # 构建并推送指定版本"
    echo "  $0 --full-deploy        # 完整部署到AWS"
}

# 解析命令行参数
TEST_ONLY=false
DOCKER_ONLY=false
PUSH_TO_ECR=false
FULL_DEPLOY=false
SKIP_TESTS=false
IMAGE_TAG="latest"
STACK_NAME="productmind-backend"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--test-only)
            TEST_ONLY=true
            shift
            ;;
        -d|--docker-only)
            DOCKER_ONLY=true
            shift
            ;;
        -p|--push)
            PUSH_TO_ECR=true
            shift
            ;;
        -f|--full-deploy)
            FULL_DEPLOY=true
            PUSH_TO_ECR=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 必需的环境变量检查
check_required_env() {
    log_step "检查必需环境变量..."
    
    required_vars=(
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY" 
        "AWS_REGION"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必需的环境变量:"
        printf "${RED}   - %s${NC}\n" "${missing_vars[@]}"
        echo ""
        log_warning "请在 .env 文件中配置这些变量："
        echo ""
        echo "# AWS 配置"
        echo "AWS_ACCESS_KEY_ID=your_aws_access_key"
        echo "AWS_SECRET_ACCESS_KEY=your_aws_secret_key" 
        echo "AWS_REGION=ap-southeast-1"
        echo ""
        echo "# Supabase 配置"
        echo "SUPABASE_URL=your_supabase_url"
        echo "SUPABASE_ANON_KEY=your_supabase_anon_key"
        echo ""
        exit 1
    fi
    
    log_success "环境变量检查完成"
}

# 可选环境变量检查
check_optional_env() {
    log_step "检查可选环境变量..."
    
    optional_vars=(
        "JWT_SECRET"
        "DEEPSEEK_API_KEY"
        "OPENAI_API_KEY"
        "REDIS_URL"
        "AWS_ACCOUNT_ID"
    )
    
    missing_optional=()
    for var in "${optional_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_optional+=("$var")
        fi
    done
    
    if [ ${#missing_optional[@]} -ne 0 ]; then
        log_warning "以下可选环境变量未配置:"
        printf "${YELLOW}   - %s${NC}\n" "${missing_optional[@]}"
        echo ""
        log_info "这些变量可以稍后在AWS Secrets Manager中配置"
    else
        log_success "所有可选环境变量已配置"
    fi
}

# 检查AWS CLI配置
check_aws_cli() {
    log_step "检查AWS CLI配置..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI未安装，请先安装："
        echo "  brew install awscli  # macOS"
        echo "  或访问：https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # 测试AWS CLI连接
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI配置无效，请运行："
        echo "  aws configure"
        exit 1
    fi
    
    # 获取AWS账户ID
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        export AWS_ACCOUNT_ID
    fi
    
    log_success "AWS CLI配置正常，账户ID: $AWS_ACCOUNT_ID"
}

# 检查Docker
check_docker() {
    log_step "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker Desktop"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker未运行，请启动Docker Desktop"
        exit 1
    fi
    
    log_success "Docker环境正常"
}

# 编译应用
build_app() {
    log_step "编译TypeScript应用..."
    npm run build
    log_success "编译完成"
}

# 运行功能测试
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "跳过功能测试"
        return
    fi
    
    log_step "运行功能测试..."
    
    # 启动测试服务器
    node dist/server.js &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 3
    
    # 运行测试
    test_commands=(
        "curl -f http://localhost:3000/health"
        "curl -f http://localhost:3000/test/templates"
    )
    
    for cmd in "${test_commands[@]}"; do
        if ! eval "$cmd" > /dev/null 2>&1; then
            kill $SERVER_PID 2>/dev/null || true
            log_error "测试失败: $cmd"
            exit 1
        fi
    done
    
    # 测试批量生成端点（分开执行避免引号问题）
    if ! curl -f -X POST -H "Content-Type: application/json" -d "{\"demoMode\": true}" http://localhost:3000/test/batch-generate > /dev/null 2>&1; then
        kill $SERVER_PID 2>/dev/null || true
        log_error "批量生成测试失败"
        exit 1
    fi
    
    # 停止测试服务器
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
    
    log_success "所有功能测试通过"
}

# 构建Docker镜像
build_docker() {
    log_step "构建Docker镜像..."
    
    IMAGE_NAME="productmind-aws-backend"
    
    if ! docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .; then
        log_error "Docker镜像构建失败"
        exit 1
    fi
    
    log_success "Docker镜像构建完成: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# 推送到ECR
push_to_ecr() {
    log_step "推送镜像到AWS ECR..."
    
    ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/productmind-aws-backend"
    
    # 创建ECR仓库（如果不存在）
    aws ecr describe-repositories --repository-names productmind-aws-backend &> /dev/null || {
        log_info "创建ECR仓库..."
        aws ecr create-repository --repository-name productmind-aws-backend
    }
    
    # 登录ECR
    log_info "登录ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
    
    # 标记并推送镜像
    docker tag productmind-aws-backend:${IMAGE_TAG} $ECR_REPO:${IMAGE_TAG}
    docker push $ECR_REPO:${IMAGE_TAG}
    
    log_success "镜像已推送到ECR: $ECR_REPO:${IMAGE_TAG}"
}

# 部署CloudFormation
deploy_cloudformation() {
    log_step "部署CloudFormation堆栈..."
    
    # 检查参数
    log_info "请提供以下部署参数（如果未在命令行指定）："
    
    if [ -z "$VPC_ID" ]; then
        read -p "VPC ID: " VPC_ID
    fi
    
    if [ -z "$SUBNET_IDS" ]; then
        read -p "私有子网IDs (逗号分隔): " SUBNET_IDS
    fi
    
    if [ -z "$PUBLIC_SUBNET_IDS" ]; then
        read -p "公有子网IDs (逗号分隔): " PUBLIC_SUBNET_IDS
    fi
    
    # 部署CloudFormation
    aws cloudformation deploy \
        --template-file aws/cloudformation-template.yaml \
        --stack-name $STACK_NAME \
        --parameter-overrides \
            VpcId=$VPC_ID \
            SubnetIds=$SUBNET_IDS \
            PublicSubnetIds=$PUBLIC_SUBNET_IDS \
        --capabilities CAPABILITY_IAM \
        --no-fail-on-empty-changeset
    
    log_success "CloudFormation堆栈部署完成"
    
    # 获取输出信息
    LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    if [ -n "$LOAD_BALANCER_DNS" ]; then
        log_success "应用已部署！访问地址: http://$LOAD_BALANCER_DNS"
    fi
}

# 配置Secrets Manager
setup_secrets() {
    log_step "配置AWS Secrets Manager..."
    
    secrets=(
        "productmind/supabase-url:SUPABASE_URL"
        "productmind/supabase-anon-key:SUPABASE_ANON_KEY"
        "productmind/deepseek-api-key:DEEPSEEK_API_KEY"
        "productmind/openai-api-key:OPENAI_API_KEY"
    )
    
    for secret in "${secrets[@]}"; do
        secret_name=$(echo $secret | cut -d: -f1)
        env_var=$(echo $secret | cut -d: -f2)
        
        if [ -n "${!env_var}" ]; then
            aws secretsmanager create-secret \
                --name $secret_name \
                --secret-string "{\"$env_var\":\"${!env_var}\"}" \
                2>/dev/null || \
            aws secretsmanager update-secret \
                --secret-id $secret_name \
                --secret-string "{\"$env_var\":\"${!env_var}\"}"
            
            log_success "配置密钥: $secret_name"
        else
            log_warning "跳过空密钥: $secret_name"
        fi
    done
}

# 主函数
main() {
    echo ""
    log_step "开始部署流程..."
    
    # 加载环境变量
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
        log_info "已加载 .env 文件"
    fi
    
    # 加载部署配置文件
    if [ -f deploy-config ]; then
        export $(cat deploy-config | grep -v '^#' | xargs)
        log_info "已加载 deploy-config 配置文件"
    elif [ "$FULL_DEPLOY" = true ]; then
        log_warning "未找到 deploy-config 文件"
        log_info "请复制 deploy-config.example 为 deploy-config 并配置AWS参数"
        log_info "或在部署时手动输入参数"
    fi
    
    # 基础检查
    check_required_env
    check_optional_env
    
    if [ "$TEST_ONLY" = true ]; then
        build_app
        run_tests
        log_success "测试完成！"
        exit 0
    fi
    
    # 编译应用
    build_app
    
    # 运行测试
    run_tests
    
    # Docker相关检查
    if [ "$DOCKER_ONLY" = true ] || [ "$PUSH_TO_ECR" = true ]; then
        check_docker
        build_docker
        
        if [ "$DOCKER_ONLY" = true ]; then
            log_success "Docker镜像构建完成！"
            exit 0
        fi
    fi
    
    # AWS相关操作
    if [ "$PUSH_TO_ECR" = true ]; then
        check_aws_cli
        push_to_ecr
    fi
    
    # 完整部署
    if [ "$FULL_DEPLOY" = true ]; then
        setup_secrets
        deploy_cloudformation
    fi
    
    echo ""
    log_success "🎉 部署完成！"
    
    if [ "$FULL_DEPLOY" = true ]; then
        echo ""
        log_info "下一步操作："
        echo "1. 更新ECS服务使用新镜像"
        echo "2. 检查CloudWatch日志"
        echo "3. 验证应用健康状态"
        echo "4. 配置域名和SSL证书（可选）"
    fi
}

# 运行主函数
main "$@" 