#!/bin/bash
# fix-sitemap-nginx.sh - 修复nginx站点地图配置
# ProductMind AI SEO优化系列

echo "🔧 修复nginx站点地图配置..."
echo "=========================================="

# 远程服务器配置
REMOTE_HOST="3.93.149.236"
REMOTE_USER="ec2-user"
REMOTE_KEY="/Users/a1/work/productmindai.pem"
REMOTE_PATH="/home/productmindaidev"

echo "🌐 远程服务器: $REMOTE_USER@$REMOTE_HOST"
echo "📁 项目路径: $REMOTE_PATH"

# 1. 检查当前nginx配置
echo -e "\n1️⃣ 检查当前nginx配置..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
echo "📋 检查nginx进程:"
sudo systemctl status nginx | head -5

echo -e "\n📋 检查nginx配置文件:"
sudo find /etc/nginx -name "*.conf" | head -5

echo -e "\n📋 检查默认站点配置:"
if [ -f "/etc/nginx/sites-available/default" ]; then
    echo "默认配置文件存在"
    sudo grep -n "location" /etc/nginx/sites-available/default | head -3
elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "默认配置文件存在 (conf.d)"
    sudo grep -n "location" /etc/nginx/conf.d/default.conf | head -3
else
    echo "未找到默认配置文件"
fi
EOF

# 2. 创建站点地图专用nginx配置
echo -e "\n2️⃣ 创建站点地图专用nginx配置..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /home/productmindaidev

echo "📝 创建nginx站点地图配置..."
sudo tee /etc/nginx/conf.d/sitemap.conf > /dev/null << 'NGINX_CONF'
# 站点地图专用配置
server {
    listen 80;
    server_name productmindai.com www.productmindai.com;
    
    # 站点地图文件处理
    location ~* ^/(sitemap.*\.xml|robots\.txt)$ {
        root /home/productmindaidev/public;
        
        # 设置正确的MIME类型
        location ~* \.xml$ {
            add_header Content-Type application/xml;
            add_header Cache-Control "public, max-age=3600";
        }
        
        location ~* robots\.txt$ {
            add_header Content-Type text/plain;
            add_header Cache-Control "public, max-age=3600";
        }
        
        # 允许跨域访问
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
        
        # 日志记录
        access_log /var/log/nginx/sitemap_access.log;
        error_log /var/log/nginx/sitemap_error.log;
        
        try_files $uri $uri/ =404;
    }
    
    # 其他请求处理
    location / {
        root /home/productmindaidev;
        try_files $uri $uri/ /index.html;
        
        # 设置基本头部
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options nosniff;
    }
}
NGINX_CONF

echo "✅ nginx站点地图配置已创建"
EOF

# 3. 测试nginx配置
echo -e "\n3️⃣ 测试nginx配置..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
echo "🔍 测试nginx配置语法..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ nginx配置语法正确"
    
    echo "🔄 重新加载nginx配置..."
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ nginx配置重新加载成功"
    else
        echo "❌ nginx配置重新加载失败"
        sudo systemctl status nginx
    fi
else
    echo "❌ nginx配置语法错误"
    sudo nginx -t
fi
EOF

# 4. 验证站点地图访问
echo -e "\n4️⃣ 验证站点地图访问..."
sleep 3  # 等待nginx重新加载完成

SITEMAPS=(
    "sitemap-index.xml"
    "sitemap.xml"
    "sitemap-zh.xml"
    "sitemap-en.xml"
    "sitemap-images.xml"
    "robots.txt"
)

for file in "${SITEMAPS[@]}"; do
    echo "🔍 测试: https://productmindai.com/$file"
    
    # 检查HTTP状态码和Content-Type
    response=$(curl -s -I "https://productmindai.com/$file")
    http_code=$(echo "$response" | grep -i "^HTTP" | awk '{print $2}')
    content_type=$(echo "$response" | grep -i "^content-type" | cut -d: -f2 | xargs)
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ HTTP $http_code - Content-Type: $content_type"
    else
        echo "   ❌ HTTP $http_code"
    fi
done

# 5. 显示下一步操作
echo -e "\n=========================================="
echo "🎉 nginx站点地图配置修复完成！"
echo ""
echo "📋 现在请重新在Google Search Console中提交站点地图："
echo "🔗 https://search.google.com/search-console?resource_id=sc-domain%3Aproductmindai.com"
echo ""
echo "📝 提交清单："
for sitemap in sitemap-index.xml sitemap.xml sitemap-zh.xml sitemap-en.xml sitemap-images.xml; do
    echo "   - $sitemap"
done
echo ""
echo "⚠️  如果仍有问题，请等待几分钟让DNS缓存更新"
echo "==========================================" 