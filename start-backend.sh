#!/bin/bash

echo "🚀 启动ProductMind AI后端服务"

# 检查并关闭可能运行的服务
echo "🔍 检查端口占用情况..."
if lsof -ti:3000 > /dev/null; then
    echo "⚠️ 端口3000被占用，正在关闭..."
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    sleep 2
fi

# 进入aws-backend目录
cd aws-backend || {
    echo "❌ 找不到aws-backend目录"
    exit 1
}

# 检查环境文件
if [ ! -f .env ]; then
    echo "📝 创建环境配置文件..."
    cp env.example .env
fi

echo "📦 检查依赖..."
if [ ! -d node_modules ]; then
    echo "📥 安装依赖中..."
    npm install
fi

echo "🎯 启动简单服务器..."
node simple-server.mjs &

SERVER_PID=$!
echo "✅ 服务器已启动，PID: $SERVER_PID"
echo "📡 地址: http://localhost:3000"

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 3

# 测试连接
echo "🧪 测试健康检查..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 服务器运行正常！"
    echo ""
    echo "📚 可用接口:"
    echo "  GET  http://localhost:3000/health - 健康检查"
    echo "  GET  http://localhost:3000/api/templates - 获取模板列表"
    echo "  GET  http://localhost:3000/api/projects - 获取项目列表"
    echo "  POST http://localhost:3000/api/generate - 单个内容生成"
    echo "  POST http://localhost:3000/api/batch-production - 批量生产"
    echo ""
    echo "🎯 测试命令示例:"
    echo "  curl http://localhost:3000/health"
    echo "  curl http://localhost:3000/api/templates"
    echo ""
    echo "💡 要停止服务器，请运行: kill $SERVER_PID"
else
    echo "❌ 服务器启动失败"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# 等待用户输入以保持脚本运行
echo "按 Ctrl+C 停止服务器..."
wait $SERVER_PID 