#!/bin/bash
# fix-sitemap-nginx-v2.sh - 精确修复nginx站点地图配置
# ProductMind AI SEO优化系列

echo "🔧 精确修复nginx站点地图配置..."
echo "=========================================="

# 远程服务器配置
REMOTE_HOST="3.93.149.236"
REMOTE_USER="ec2-user"
REMOTE_KEY="/Users/a1/work/productmindai.pem"

echo "🌐 远程服务器: $REMOTE_USER@$REMOTE_HOST"

# 1. 备份现有配置
echo -e "\n1️⃣ 备份现有nginx配置..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
sudo cp /etc/nginx/conf.d/productmind.conf /etc/nginx/conf.d/productmind.conf.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 配置已备份"
EOF

# 2. 创建修改后的配置
echo -e "\n2️⃣ 修改nginx配置以支持站点地图..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /home/productmindaidev

# 创建新的nginx配置
sudo tee /etc/nginx/conf.d/productmind.conf > /dev/null << 'NGINX_CONF'
server {
    server_name productmindai.com www.productmindai.com;

    access_log /var/log/nginx/productmind_access.log;
    error_log /var/log/nginx/productmind_error.log;

    # 站点地图和SEO文件 - 最高优先级
    location ~* ^/(sitemap.*\.xml|robots\.txt)$ {
        root /home/productmindaidev/public;
        
        # 设置正确的MIME类型
        location ~* \.xml$ {
            add_header Content-Type "application/xml; charset=utf-8";
            expires 1h;
            add_header Cache-Control "public, max-age=3600";
        }
        
        location ~* robots\.txt$ {
            add_header Content-Type "text/plain; charset=utf-8";
            expires 1h;
            add_header Cache-Control "public, max-age=3600";
        }
        
        # 允许跨域访问
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        
        # 直接提供文件，不走SPA路由
        try_files $uri =404;
    }

    # 静态SEO页面代理 - 第二优先级
    location ^~ /static-pages/ {
        proxy_pass http://127.0.0.1:3031;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 代理超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 静态文件缓存
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Netlify函数代理
    location ^~ /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API请求代理到AWS后端
    location ^~ /api/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location ^~ /health {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 静态资源文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/productmindaidev/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA路由处理 - 最低优先级
    location / {
        root /home/productmindaidev/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/productmindai.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/productmindai.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = productmindai.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name productmindai.com www.productmindai.com;
    return 404; # managed by Certbot
}
NGINX_CONF

echo "✅ nginx配置已更新"
EOF

# 3. 删除冲突的配置文件
echo -e "\n3️⃣ 删除冲突的配置文件..."
ssh -i "$REMOTE_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
# 删除我们之前创建的冲突配置
if [ -f "/etc/nginx/conf.d/sitemap.conf" ]; then
    sudo rm /etc/nginx/conf.d/sitemap.conf
    echo "✅ 删除了冲突的sitemap.conf"
fi
EOF

# 4. 测试并重新加载nginx
echo -e "\n4️⃣ 测试并重新加载nginx..."
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

# 5. 验证站点地图访问
echo -e "\n5️⃣ 验证站点地图访问..."
sleep 5  # 等待nginx重新加载完成

SITEMAPS=(
    "sitemap-index.xml"
    "sitemap.xml"
    "sitemap-zh.xml"
    "sitemap-en.xml"
    "sitemap-images.xml"
    "robots.txt"
)

echo "🔍 测试站点地图访问..."
for file in "${SITEMAPS[@]}"; do
    echo "   测试: https://productmindai.com/$file"
    
    # 检查HTTP状态码和Content-Type
    response=$(curl -s -I "https://productmindai.com/$file")
    http_code=$(echo "$response" | grep -i "^HTTP" | awk '{print $2}')
    content_type=$(echo "$response" | grep -i "^content-type" | cut -d: -f2 | xargs)
    
    if [ "$http_code" = "200" ]; then
        if [[ "$file" == *.xml && "$content_type" == *"xml"* ]]; then
            echo "   ✅ HTTP $http_code - Content-Type: $content_type (正确)"
        elif [[ "$file" == "robots.txt" && "$content_type" == *"text"* ]]; then
            echo "   ✅ HTTP $http_code - Content-Type: $content_type (正确)"
        else
            echo "   ⚠️  HTTP $http_code - Content-Type: $content_type (需要检查)"
        fi
    else
        echo "   ❌ HTTP $http_code"
    fi
done

# 6. 测试实际内容
echo -e "\n6️⃣ 测试站点地图内容..."
echo "🔍 检查sitemap-index.xml内容:"
curl -s "https://productmindai.com/sitemap-index.xml" | head -3

echo -e "\n🔍 检查robots.txt内容:"
curl -s "https://productmindai.com/robots.txt" | head -3

echo -e "\n=========================================="
echo "🎉 nginx站点地图配置修复完成！"
echo ""
echo "📋 现在请重新在Google Search Console中提交站点地图："
echo "🔗 https://search.google.com/search-console?resource_id=sc-domain%3Aproductmindai.com"
echo ""
echo "📝 提交清单："
for sitemap in "${SITEMAPS[@]}"; do
    if [[ "$sitemap" == *.xml ]]; then
        echo "   - $sitemap"
    fi
done
echo ""
echo "✅ 如果Content-Type显示为application/xml，说明修复成功！"
echo "==========================================" 