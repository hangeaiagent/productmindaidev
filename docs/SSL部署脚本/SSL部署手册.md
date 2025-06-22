# ProductMind AI SSL部署手册

## 🎯 部署目标

为ProductMind AI系统配置免费的Let's Encrypt SSL证书，实现HTTPS访问和自动续期。

## 🚀 快速部署命令

### 第一步：连接服务器并创建脚本

```bash
# 连接到服务器
ssh productmindaidev@3.93.149.236

# 创建SSL配置脚本
cat > ssl-setup.sh << 'EOF'
#!/bin/bash
set -e
echo "🔒 开始配置ProductMind AI SSL证书..."

DOMAIN="productmindai.com"
EMAIL="admin@productmindai.com"
NGINX_CONFIG="/etc/nginx/conf.d/productmind.conf"

# 安装Certbot
echo "📦 安装Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo yum update -y
    sudo yum install -y epel-release
    sudo yum install -y certbot python3-certbot-nginx
fi

# 备份配置
sudo cp $NGINX_CONFIG /home/productmindaidev/nginx-backup-$(date +%Y%m%d_%H%M%S).conf

# 申请SSL证书
echo "🔐 申请SSL证书..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --email $EMAIL --agree-tos --no-eff-email --redirect

# 优化SSL配置
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

# 测试并重载Nginx
sudo nginx -t && sudo systemctl reload nginx

# 设置自动续期
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
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/certbot-renew.sh") | sudo crontab -
sudo /usr/local/bin/certbot-renew.sh

echo "🎉 SSL配置完成！"
echo "🌐 域名: https://productmindai.com"
EOF

chmod +x ssl-setup.sh
```

### 第二步：创建链接更新脚本

```bash
cat > update-https-links.sh << 'EOF'
#!/bin/bash
echo "🔗 开始更新HTTPS链接..."

sed -i 's|http://productmindai.com|https://productmindai.com|g' generate-seo-pages.cjs

if [ -d "static-pages/pdhtml" ]; then
    find static-pages/pdhtml -name "index.html" -type f -exec sed -i 's|http://productmindai.com|https://productmindai.com|g' {} \;
    echo "✅ 已更新所有产品主页中的链接"
fi

read -p "是否重新生成所有产品主页？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    export VITE_SUPABASE_URL="https://uobwbhvwrciaxloqdizc.supabase.co"
    export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc"
    node generate-seo-pages.cjs
    echo "✅ 产品主页重新生成完成"
fi

echo "🎉 HTTPS链接更新完成！"
EOF

chmod +x update-https-links.sh
```

### 第三步：执行部署

```bash
# 执行SSL配置
./ssl-setup.sh

# 更新链接
./update-https-links.sh

# 重启PM2服务
pm2 restart all
```

## 🧪 验证部署

```bash
# 检查证书
sudo certbot certificates

# 测试HTTPS
curl -I https://productmindai.com

# 测试API
curl -s "https://productmindai.com/.netlify/functions/get-categories" | jq .success
```

## 🔍 故障排查

```bash
# 检查Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# 检查PM2
pm2 status
pm2 logs

# 检查续期
sudo tail -f /var/log/certbot-renew.log
```

---

**🎉 部署完成后访问：https://productmindai.com** 