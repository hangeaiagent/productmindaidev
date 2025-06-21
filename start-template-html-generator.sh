#!/bin/bash

# 模板HTML生成器启动脚本

echo "🚀 启动模板HTML页面生成器"
echo "═══════════════════════════════════════"

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装Node.js"
    exit 1
fi

# 进入aws-backend目录
cd "$(dirname "$0")/aws-backend" || {
    echo "❌ 无法进入aws-backend目录"
    exit 1
}

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，请确保环境变量已配置"
    echo "📋 参考env.example文件进行配置"
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 询问用户操作
echo ""
echo "请选择操作："
echo "1) 运行测试 (推荐先运行)"
echo "2) 生成HTML页面"
echo "3) 退出"
echo ""
read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🧪 运行测试脚本..."
        node test-template-html-generator.mjs
        ;;
    2)
        echo ""
        echo "🔄 开始生成HTML页面..."
        node template-html-generator.mjs
        ;;
    3)
        echo "👋 退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 脚本执行完成" 