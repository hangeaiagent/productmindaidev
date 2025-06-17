#!/bin/bash

# AI Products 函数测试脚本

echo "🧪 测试 AI Products 函数..."

# 检查环境变量
if [ -f ".env" ]; then
    source .env
    echo "✅ 加载环境变量"
else
    echo "❌ 未找到 .env 文件"
    exit 1
fi

# 启动 Netlify Dev 服务器（后台运行）
echo "🚀 启动 Netlify Dev 服务器..."
npx netlify dev --port 8888 &
NETLIFY_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 10

# 测试函数
echo "📚 测试 get-categories 函数..."
curl -s "http://localhost:8888/.netlify/functions/get-categories" | jq '.success'

echo "📊 测试 get-projects-by-category 函数..."
curl -s "http://localhost:8888/.netlify/functions/get-projects-by-category" | jq '.success'

echo "🛑 停止服务器..."
kill $NETLIFY_PID

echo "✅ 测试完成" 