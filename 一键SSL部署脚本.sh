#!/bin/bash

echo "🚀 ProductMind AI 一键SSL部署脚本"
echo "=================================="

# 检查是否为root用户或有sudo权限
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  请不要以root用户运行此脚本"
    exit 1
fi

if ! sudo -n true 2>/dev/null; then
    echo "❌ 需要sudo权限，请确保当前用户有sudo权限"
    exit 1
fi

echo "✅ 权限检查通过"

# 第一步：创建SSL配置脚本
echo "📝 创建SSL配置脚本..."
cat > ssl-setup.sh << 'EOF'
#!/bin/bash
set -e
echo "🔒 开始配置ProductMind AI SSL证书..."

DOMAIN="productmindai.com"
EMAIL="admin@productmindai.com"
NGINX_CONFIG="/etc/nginx/conf.d/productmind.conf"

echo "📦 安装Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo yum update -y
    sudo yum install -y epel-release
    sudo yum install -y certbot python3-certbot-nginx
    echo "✅ Certbot安装完成"
else
    echo "ℹ️  Certbot已安装"
fi

echo "💾 备份当前Nginx配置..."
sudo cp $NGINX_CONFIG /home/productmindaidev/nginx-backup-$(date +%Y%m%d_%H%M%S).conf

echo "🔐 申请Let's Encrypt SSL证书..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect

echo "⚙️  优化SSL配置..."
sudo tee $NGINX_CONFIG > /dev/null <<'NGINX_EOF'
server {
    listen 80;
    server_name productmindai.com www.productmindai.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name productmindai.com www.productmindai.com;
    
    ssl_certificate /etc/letsencrypt/live/productmindai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/productmindai.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
    }
    
    location /static-pages/ {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/productmindaidev/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    root /home/productmindaidev/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

echo "🧪 测试Nginx配置..."
sudo nginx -t && sudo systemctl reload nginx

echo "🔄 配置SSL证书自动续期..."
sudo tee /usr/local/bin/certbot-renew.sh > /dev/null <<'RENEW_EOF'
#!/bin/bash
LOG_FILE="/var/log/certbot-renew.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 开始检查SSL证书续期..." >> $LOG_FILE
/usr/bin/certbot renew --quiet --nginx >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "[$DATE] SSL证书检查完成" >> $LOG_FILE
    /usr/bin/systemctl reload nginx >> $LOG_FILE 2>&1
    echo "[$DATE] Nginx已重载" >> $LOG_FILE
else
    echo "[$DATE] SSL证书续期失败" >> $LOG_FILE
fi
RENEW_EOF

sudo chmod +x /usr/local/bin/certbot-renew.sh

echo "⏰ 设置自动续期Cron任务..."
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/certbot-renew.sh") | sudo crontab -

echo "🧪 测试续期脚本..."
sudo /usr/local/bin/certbot-renew.sh

echo "🎉 SSL配置完成！"
echo "🌐 域名: https://productmindai.com"
echo "📄 证书路径: /etc/letsencrypt/live/productmindai.com/"
echo "🔄 续期脚本: /usr/local/bin/certbot-renew.sh"
echo "⏰ 续期时间: 每天凌晨3点自动检查"
EOF

chmod +x ssl-setup.sh

# 第二步：创建链接更新脚本
echo "📝 创建HTTPS链接更新脚本..."
cat > update-https-links.sh << 'EOF'
#!/bin/bash
echo "🔗 开始更新产品主页HTTPS链接..."

echo "📝 更新generate-seo-pages.cjs中的链接..."
if [ -f "generate-seo-pages.cjs" ]; then
    sed -i 's|http://productmindai.com|https://productmindai.com|g' generate-seo-pages.cjs
    echo "✅ generate-seo-pages.cjs 链接已更新"
else
    echo "⚠️  generate-seo-pages.cjs 文件不存在"
fi

echo "🔄 批量更新已生成的产品主页..."
if [ -d "static-pages/pdhtml" ]; then
    find static-pages/pdhtml -name "index.html" -type f -exec sed -i 's|http://productmindai.com|https://productmindai.com|g' {} \;
    echo "✅ 已更新所有产品主页中的链接"
else
    echo "⚠️  static-pages/pdhtml目录不存在"
fi

echo "🎉 HTTPS链接更新完成！"
EOF

chmod +x update-https-links.sh

# 第三步：执行SSL配置
echo "🚀 开始执行SSL配置..."
./ssl-setup.sh

if [ $? -eq 0 ]; then
    echo "✅ SSL配置成功"
else
    echo "❌ SSL配置失败，请检查错误信息"
    exit 1
fi

# 第四步：更新HTTPS链接
echo "🔗 开始更新HTTPS链接..."
./update-https-links.sh

# 第五步：重启PM2服务
echo "🔄 重启PM2服务..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo "✅ PM2服务已重启"
    pm2 status
else
    echo "⚠️  PM2未安装或不在PATH中"
fi

# 第六步：验证部署结果
echo "🧪 验证部署结果..."

echo "📋 检查SSL证书状态..."
sudo certbot certificates

echo "📋 测试HTTPS访问..."
curl -I https://productmindai.com 2>/dev/null | head -5

echo "📋 测试API端点..."
if curl -s "https://productmindai.com/.netlify/functions/get-categories" >/dev/null 2>&1; then
    echo "✅ API端点访问正常"
else
    echo "⚠️  API端点访问异常，请检查"
fi

echo ""
echo "🎉 SSL部署完成！"
echo "=================================="
echo "✅ 主要成果："
echo "🌐 HTTPS访问: https://productmindai.com"
echo "🔒 SSL证书: Let's Encrypt (90天自动续期)"
echo "🔄 自动续期: 每天凌晨3点检查"
echo "📱 HTTP重定向: 自动跳转到HTTPS"
echo "🛡️  安全头: HSTS、XSS保护等已配置"
echo ""
echo "📋 下一步建议："
echo "1. 测试网站各功能是否正常"
echo "2. 检查SSL Labs评级: https://www.ssllabs.com/ssltest/"
echo "3. 更新所有内部链接为HTTPS"
echo "==================================" 