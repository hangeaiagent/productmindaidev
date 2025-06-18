#!/bin/bash

# ProductMind AI 快速重新部署脚本
# 基于系统部署记录.md中的最佳实践

set -e  # 遇到错误立即退出

echo "🚀 ProductMind AI 快速重新部署开始..."
echo "执行时间: $(date)"

# 检查Node.js版本
echo "📋 1. 检查环境..."
NODE_VERSION=$(node --version)
echo "当前Node.js版本: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    echo "❌ 错误: 需要Node.js v20.x版本"
    echo "请运行: nvm use 20.12.2"
    exit 1
fi

# 停止所有服务
echo "🛑 2. 停止所有服务..."
pm2 stop all || true
pm2 delete all || true

# 清理旧文件
echo "🧹 3. 清理旧构建文件..."
rm -rf node_modules dist .netlify

# 重新安装依赖
echo "📦 4. 重新安装依赖..."
npm install

# 检查关键依赖
if ! npm list express cors >/dev/null 2>&1; then
    echo "📦 安装缺失的依赖..."
    npm install express cors
fi

# 重新构建前端
echo "🔨 5. 重新构建前端..."
npm run build

# 验证构建结果
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ 错误: 前端构建失败"
    exit 1
fi

echo "✅ 前端构建成功"

# 启动Functions服务器
echo "🌐 6. 启动Functions服务器..."
if [ ! -f "functions-server.cjs" ]; then
    echo "❌ 错误: functions-server.cjs 文件不存在"
    echo "请确保该文件存在于项目根目录"
    exit 1
fi

pm2 start functions-server.cjs --name "functions-server"

# 等待服务启动
sleep 3

# 启动AWS后端服务
echo "⚡ 7. 启动AWS后端服务..."
if [ ! -f "aws-backend/src/server.ts" ]; then
    echo "❌ 错误: AWS后端文件不存在"
    exit 1
fi

# 检查ts-node是否安装
if ! command -v ts-node >/dev/null 2>&1; then
    echo "📦 安装ts-node..."
    npm install -g ts-node
fi

pm2 start aws-backend/src/server.ts --name "aws-backend" --interpreter ts-node

# 等待服务启动
sleep 5

# 检查服务状态
echo "📊 8. 检查服务状态..."
pm2 status

# 验证API端点
echo "🔍 9. 验证API端点..."

# 测试健康检查
echo "测试健康检查..."
if curl -f -s http://localhost:8888/health >/dev/null; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    exit 1
fi

# 测试分类API
echo "测试分类API..."
if curl -f -s "http://localhost:8888/.netlify/functions/get-categories" | grep -q '"success":true'; then
    echo "✅ 分类API测试通过"
else
    echo "❌ 分类API测试失败"
    exit 1
fi

# 测试项目API
echo "测试项目API..."
if curl -f -s "http://localhost:8888/.netlify/functions/get-projects-by-category?category=全部&search=&language=zh" | grep -q '"success":true'; then
    echo "✅ 项目API测试通过"
else
    echo "❌ 项目API测试失败"
    exit 1
fi

# 测试域名访问
echo "测试域名访问..."
if curl -f -s "http://productmindai.com/.netlify/functions/get-categories" | grep -q '"success":true'; then
    echo "✅ 域名访问测试通过"
else
    echo "⚠️  域名访问测试失败，请检查Nginx配置"
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "📊 服务状态:"
pm2 status

echo ""
echo "🔗 访问地址:"
echo "   - 网站: http://productmindai.com"
echo "   - AI产品页面: http://productmindai.com/ai-products"
echo "   - 健康检查: http://productmindai.com/.netlify/functions/get-categories"

echo ""
echo "📝 如果遇到问题，请查看:"
echo "   - PM2日志: pm2 logs"
echo "   - Nginx日志: sudo tail -f /var/log/nginx/productmind_error.log"
echo "   - 系统部署记录: 系统部署记录.md"

echo ""
echo "✨ 部署完成时间: $(date)" 