#!/bin/bash
# deploy-remote-seo.sh - 远程服务器SEO优化部署脚本
# ProductMind AI SEO优化系列 - 远程部署

echo "🚀 开始远程服务器SEO优化部署..."
echo "=========================================="

# 远程服务器配置
REMOTE_HOST="3.93.149.236"
REMOTE_USER="ec2-user"
REMOTE_KEY="/Users/a1/work/productmindai.pem"
REMOTE_PATH="/home/productmindaidev"

# 检查SSH密钥
if [ ! -f "$REMOTE_KEY" ]; then
    echo "❌ SSH密钥文件不存在: $REMOTE_KEY"
    exit 1
fi

echo "🔑 使用SSH密钥: $REMOTE_KEY"
echo "🌐 远程服务器: $REMOTE_USER@$REMOTE_HOST"
echo "📁 远程路径: $REMOTE_PATH"

# 1. 上传SEO优化文件
echo -e "\n1️⃣ 上传SEO优化文件到远程服务器..."

# 创建远程目录
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH/docs/templateSEO/seo-optimization/{sh,js,md}"

# 上传脚本文件
echo "📤 上传执行脚本..."
scp -i "$REMOTE_KEY" docs/templateSEO/seo-optimization/sh/*.sh "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/docs/templateSEO/seo-optimization/sh/"

# 上传JavaScript文件
echo "📤 上传JavaScript文件..."
scp -i "$REMOTE_KEY" docs/templateSEO/seo-optimization/js/*.cjs "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/docs/templateSEO/seo-optimization/js/"

# 上传文档文件
echo "📤 上传文档文件..."
scp -i "$REMOTE_KEY" docs/templateSEO/seo-optimization/md/*.md "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/docs/templateSEO/seo-optimization/md/"

# 2. 设置文件权限
echo -e "\n2️⃣ 设置远程文件权限..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" "chmod +x $REMOTE_PATH/docs/templateSEO/seo-optimization/sh/*.sh"

# 3. 检查远程环境
echo -e "\n3️⃣ 检查远程环境..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
echo "📋 检查Node.js版本:"
node --version

echo "📋 检查项目目录:"
ls -la /home/productmindaidev/

echo "📋 检查SEO优化文件:"
find /home/productmindaidev/docs/templateSEO/seo-optimization/ -type f | head -10
EOF

# 4. 执行远程SEO优化部署
echo -e "\n4️⃣ 执行远程SEO优化部署..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /home/productmindaidev

echo "🚀 开始远程SEO优化部署..."

# 创建必要目录
mkdir -p public/images/seo
mkdir -p logs

# 执行SEO优化脚本
echo "📋 执行SEO优化脚本..."
bash docs/templateSEO/seo-optimization/sh/deploy-seo-optimization.sh

echo "✅ 远程SEO优化部署完成！"
EOF

# 5. 验证部署结果
echo -e "\n5️⃣ 验证远程部署结果..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /home/productmindaidev

echo "📋 检查生成的SEO文件:"
ls -la public/ | grep -E "(sitemap|robots|sw\.js)"

echo "📋 检查index.html文件:"
if [ -f "index.html" ]; then
    echo "✅ index.html 存在 ($(stat -c%s index.html 2>/dev/null || stat -f%z index.html) bytes)"
    if grep -q "hreflang" index.html; then
        echo "✅ 包含多语言支持"
    else
        echo "⚠️  缺少多语言支持"
    fi
else
    echo "❌ index.html 不存在"
fi

echo "📋 检查英文版本:"
if [ -f "public/en/index.html" ]; then
    echo "✅ 英文版本存在 ($(stat -c%s public/en/index.html 2>/dev/null || stat -f%z public/en/index.html) bytes)"
else
    echo "❌ 英文版本不存在"
fi

echo "📋 运行SEO状态检查:"
bash docs/templateSEO/seo-optimization/sh/seo-audit.sh
EOF

# 6. 重启相关服务
echo -e "\n6️⃣ 重启相关服务..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /home/productmindaidev

echo "🔄 重启PM2服务..."
pm2 restart all 2>/dev/null || echo "⚠️  PM2服务重启失败或无服务运行"

echo "📊 PM2状态:"
pm2 status 2>/dev/null || echo "⚠️  无法获取PM2状态"
EOF

echo -e "\n=========================================="
echo "🎉 远程服务器SEO优化部署完成！"
echo ""
echo "📋 部署摘要:"
echo "- 远程服务器: $REMOTE_USER@$REMOTE_HOST"
echo "- 部署路径: $REMOTE_PATH"
echo "- SEO文件: 已上传并配置"
echo "- 双语支持: 中文 + 英文"
echo ""
echo "🔗 验证链接:"
echo "- 主站: https://productmindai.com/"
echo "- 英文站: https://productmindai.com/en/"
echo "- 站点地图: https://productmindai.com/sitemap.xml"
echo "- Robots: https://productmindai.com/robots.txt"
echo ""
echo "📋 后续步骤:"
echo "1. 访问网站验证SEO优化效果"
echo "2. 在Google Search Console提交站点地图"
echo "3. 在百度站长工具提交站点地图"
echo "4. 监控网站性能和SEO指标" 