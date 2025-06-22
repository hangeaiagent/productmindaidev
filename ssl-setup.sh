#!/bin/bash

# ProductMind AI SSL配置脚本
# 使用Let's Encrypt免费SSL证书，配置Nginx HTTPS和自动续期

set -e

echo "🔒 开始配置ProductMind AI SSL证书..."

# 配置变量
DOMAIN="productmindai.com"
EMAIL="admin@productmindai.com"
NGINX_CONFIG="/etc/nginx/conf.d/productmind.conf"

# 1. 安装Certbot
echo "📦 安装Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo yum update -y
    sudo yum install -y epel-release
    sudo yum install -y certbot python3-certbot-nginx
    echo "✅ Certbot安装完成"
else
    echo "ℹ️  Certbot已安装"
fi

# 2. 备份当前配置
echo "💾 备份当前Nginx配置..."
sudo cp $NGINX_CONFIG /home/productmindaidev/nginx-backup-$(date +%Y%m%d_%H%M%S).conf

# 3. 申请SSL证书
echo "🔐 申请Let's Encrypt SSL证书..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect

# 4. 优化SSL配置
echo "⚙️  优化SSL配置..."
sudo tee $NGINX_CONFIG > /dev/null <<'NGINX_EOF'
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name productmindai.com www.productmindai.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name productmindai.com www.productmindai.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/productmindai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/productmindai.com/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Netlify函数代理
    location /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
    }
    
    # 静态页面代理
    location /static-pages/ {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/productmindaidev/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 主应用
    root /home/productmindaidev/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# 5. 测试并重载Nginx
echo "🧪 测试Nginx配置..."
sudo nginx -t && sudo systemctl reload nginx

# 6. 设置自动续期脚本
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

# 7. 设置Cron任务
echo "⏰ 设置自动续期Cron任务..."
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/certbot-renew.sh") | sudo crontab -

# 8. 测试续期脚本
echo "🧪 测试续期脚本..."
sudo /usr/local/bin/certbot-renew.sh

echo "🎉 SSL配置完成！"
echo "🌐 域名: https://productmindai.com"
echo "📄 证书路径: /etc/letsencrypt/live/productmindai.com/"
echo "🔄 续期脚本: /usr/local/bin/certbot-renew.sh"
echo "⏰ 续期时间: 每天凌晨3点自动检查"
echo ""
echo "======================================"
echo "✅ SSL配置信息："
echo "🌐 域名: https://productmindai.com"
echo "📄 证书路径: /etc/letsencrypt/live/productmindai.com/"
echo "🔄 续期脚本: /usr/local/bin/certbot-renew.sh"
echo "⏰ 续期时间: 每天凌晨3点自动检查"
echo "📋 续期日志: /var/log/certbot-renew.log"
echo "======================================"
echo ""
echo "🧪 测试命令："
echo "curl -I https://productmindai.com"
echo "sudo certbot certificates"
echo "sudo /usr/local/bin/certbot-renew.sh"
echo ""
echo "💡 建议重启PM2服务："
echo "pm2 restart all" 