#!/bin/bash

# ProductMind AI AWS Backend 部署脚本
# 用于AWS ECS Fargate部署

set -e  # 遇到错误立即退出

echo "🚀 开始部署 ProductMind AI AWS Backend..."

# 环境变量检查
check_env_vars() {
    echo "📋 检查环境变量..."
    
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
        echo "❌ 缺少必需的环境变量:"
        printf ' - %s\n' "${missing_vars[@]}"
        echo "请在.env文件中配置这些变量"
        exit 1
    fi
    
    echo "✅ 环境变量检查完成"
}

# 编译TypeScript
build_app() {
    echo "🔨 编译应用..."
    npm run build
    echo "✅ 编译完成"
}

# 运行测试
run_tests() {
    echo "🧪 运行测试..."
    
    # 启动服务器进行测试
    echo "启动测试服务器..."
    node dist/server.js &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 3
    
    # 健康检查测试
    echo "测试健康检查端点..."
    curl -f http://localhost:3000/health > /dev/null
    
    # 测试端点
    echo "测试模板服务端点..."
    curl -f http://localhost:3000/test/templates > /dev/null
    
    # 批量生成测试
    echo "测试批量生成功能..."
    curl -X POST -H "Content-Type: application/json" \
         -d '{"demoMode": true, "languages": ["zh"]}' \
         http://localhost:3000/test/batch-generate > /dev/null
    
    # 停止测试服务器
    kill $SERVER_PID 2>/dev/null || true
    
    echo "✅ 所有测试通过"
}

# 构建Docker镜像
build_docker() {
    echo "🐳 构建Docker镜像..."
    
    IMAGE_NAME="productmind-aws-backend"
    IMAGE_TAG="${1:-latest}"
    
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    
    echo "✅ Docker镜像构建完成: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# 测试Docker镜像
test_docker() {
    echo "🧪 测试Docker镜像..."
    
    IMAGE_NAME="productmind-aws-backend:latest"
    
    # 运行容器
    docker run -d --name productmind-test \
        -p 3001:3000 \
        -e NODE_ENV=production \
        $IMAGE_NAME
    
    # 等待容器启动
    sleep 5
    
    # 测试健康检查
    curl -f http://localhost:3001/health > /dev/null
    
    # 清理测试容器
    docker stop productmind-test
    docker rm productmind-test
    
    echo "✅ Docker镜像测试通过"
}

# AWS ECR推送（可选）
push_to_ecr() {
    echo "☁️ 推送到AWS ECR..."
    
    # 这里需要配置ECR仓库URL
    ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/productmind-aws-backend"
    
    # 登录ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
    
    # 标记并推送镜像
    docker tag productmind-aws-backend:latest $ECR_REPO:latest
    docker push $ECR_REPO:latest
    
    echo "✅ 镜像已推送到ECR"
}

# 主部署流程
main() {
    echo "=== ProductMind AI AWS Backend 部署开始 ==="
    
    # 加载环境变量
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # 检查环境变量
    check_env_vars
    
    # 编译应用
    build_app
    
    # 运行测试
    run_tests
    
    # 构建Docker镜像
    if command -v docker &> /dev/null; then
        build_docker "$1"
        
        # 测试Docker镜像
        test_docker
        
        # 可选：推送到ECR
        if [ "$2" == "push" ] && [ -n "$AWS_ACCOUNT_ID" ]; then
            push_to_ecr
        fi
    else
        echo "⚠️ Docker未安装，跳过镜像构建"
    fi
    
    echo "🎉 部署完成！"
    echo ""
    echo "下一步："
    echo "1. 配置AWS ECS Fargate任务定义"
    echo "2. 设置负载均衡器"
    echo "3. 配置Auto Scaling"
    echo "4. 部署到生产环境"
}

# 运行部署
main "$@" 