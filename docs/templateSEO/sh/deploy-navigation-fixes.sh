#!/bin/bash

# 导航链接修复部署脚本
# 用于将修改部署到远程服务器并重新生成页面

echo "🚀 开始部署导航链接修复到远程服务器..."
echo "============================================="

# 服务器信息
SERVER_HOST="3.93.149.236"
SERVER_USER="ec2-user"
SERVER_PATH="/home/ec2-user/productmindaidev"
KEY_FILE="~/.ssh/productmindai.pem"

# 检查SSH密钥是否存在
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ SSH密钥文件不存在: $KEY_FILE"
    echo "请确保SSH密钥文件存在并具有正确的权限"
    exit 1
fi

echo "📁 准备上传文件到服务器..."

# 上传修改后的文件
echo "📤 上传产品主页生成器..."
scp -i "$KEY_FILE" generate-seo-pages.cjs "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

echo "📤 上传模板详情生成器..."
scp -i "$KEY_FILE" aws-backend/enhanced-template-generator.mjs "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/aws-backend/"

echo "📤 上传修复脚本..."
scp -i "$KEY_FILE" fix-all-navigation-links.sh "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

# 在服务器上执行修复和重新生成
echo ""
echo "🔧 在服务器上执行修复和重新生成..."

ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/productmindaidev

echo "📋 当前目录: $(pwd)"
echo "📁 文件列表:"
ls -la generate-seo-pages.cjs aws-backend/enhanced-template-generator.mjs 2>/dev/null || echo "某些文件可能不存在"

# 设置执行权限
chmod +x fix-all-navigation-links.sh

echo ""
echo "🔧 执行导航链接修复..."
./fix-all-navigation-links.sh

echo ""
echo "📊 检查PM2服务状态..."
pm2 list

echo ""
echo "🔄 重启相关PM2服务..."
pm2 restart all

echo ""
echo "⏱️ 等待服务启动..."
sleep 5

echo ""
echo "📋 重新生成测试页面..."
# 重新生成一个测试项目的主页
node generate-seo-pages.cjs 111c5e34-058d-4293-9cc6-02c0d1535297

echo ""
echo "✅ 服务器端操作完成！"
echo "🌐 测试页面: https://productmindai.com/static-pages/pdhtml/111c5e34-058d-4293-9cc6-02c0d1535297/index.html"

ENDSSH

echo ""
echo "🎉 部署完成！"
echo "=============="
echo ""
echo "📋 已完成的操作："
echo "✅ 上传修改后的生成器文件"
echo "✅ 执行导航链接修复"
echo "✅ 重启PM2服务"
echo "✅ 重新生成测试页面"
echo ""
echo "🌐 请访问以下链接验证修改："
echo "https://productmindai.com/static-pages/pdhtml/111c5e34-058d-4293-9cc6-02c0d1535297/index.html" 