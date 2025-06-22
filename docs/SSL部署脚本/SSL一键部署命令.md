# SSL一键部署命令

## 🚀 快速部署

请在服务器上执行以下命令：

### 方法一：直接执行（推荐）

```bash
# 连接到服务器
ssh productmindaidev@3.93.149.236

# 进入工作目录
cd /home/productmindaidev

# 一键部署SSL
curl -fsSL https://raw.githubusercontent.com/your-repo/ssl-deploy.sh | bash
```

### 方法二：手动执行

```bash
# 连接到服务器
ssh productmindaidev@3.93.149.236

# 创建一键部署脚本
cat > deploy-ssl.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 ProductMind AI SSL一键部署"
echo "============================="

# 1. 安装Certbot
echo "📦 安装Certbot..."
sudo yum update -y
sudo yum install -y epel-release certbot python3-certbot-nginx

# 2. 备份配置
echo "💾 备份Nginx配置..."
sudo cp /etc/nginx/conf.d/productmind.conf /home/productmindaidev/nginx-backup-$(date +%Y%m%d_%H%M%S).conf

# 3. 申请SSL证书
echo "🔐 申请SSL证书..."
sudo certbot --nginx -d productmindai.com -d www.productmindai.com \
    --email admin@productmindai.com --agree-tos --no-eff-email --redirect

# 4. 优化配置
echo "⚙️  优化SSL配置..."
sudo tee /etc/nginx/conf.d/productmind.conf > /dev/null <<'NGINX_EOF'
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
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    location /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
    
    location /static-pages/ {
        proxy_pass http://localhost:3031;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
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
}
NGINX_EOF

# 5. 重载Nginx
sudo nginx -t && sudo systemctl reload nginx

# 6. 设置自动续期
sudo tee /usr/local/bin/certbot-renew.sh > /dev/null <<'RENEW_EOF'
#!/bin/bash
/usr/bin/certbot renew --quiet --nginx
/usr/bin/systemctl reload nginx
RENEW_EOF

sudo chmod +x /usr/local/bin/certbot-renew.sh
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/certbot-renew.sh") | sudo crontab -

# 7. 更新链接
echo "🔗 更新HTTPS链接..."
if [ -f "generate-seo-pages.cjs" ]; then
    sed -i 's|http://productmindai.com|https://productmindai.com|g' generate-seo-pages.cjs
fi

if [ -d "static-pages/pdhtml" ]; then
    find static-pages/pdhtml -name "index.html" -exec sed -i 's|http://productmindai.com|https://productmindai.com|g' {} \;
fi

# 8. 重启服务
echo "🔄 重启PM2服务..."
pm2 restart all

# 9. 验证
echo "🧪 验证部署..."
curl -I https://productmindai.com

echo "🎉 SSL部署完成！"
echo "访问: https://productmindai.com"
EOF

# 执行部署
chmod +x deploy-ssl.sh
./deploy-ssl.sh
```

## 🧪 验证部署

部署完成后，执行以下命令验证：

```bash
# 检查SSL证书
sudo certbot certificates

# 测试HTTPS访问
curl -I https://productmindai.com

# 检查PM2状态
pm2 status

# 测试API
curl -s "https://productmindai.com/.netlify/functions/get-categories"
```

## 📊 预期结果

✅ **HTTPS访问正常**: https://productmindai.com  
✅ **SSL证书有效**: 90天自动续期  
✅ **HTTP重定向**: 自动跳转到HTTPS  
✅ **PM2服务正常**: 所有服务运行中  

## 🔍 故障排查

如果遇到问题：

```bash
# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 查看Certbot日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# 检查PM2日志
pm2 logs

# 恢复备份配置
sudo cp /home/productmindaidev/nginx-backup-*.conf /etc/nginx/conf.d/productmind.conf
sudo systemctl reload nginx
```

---

**🎉 部署完成后即可通过 https://productmindai.com 安全访问！** 