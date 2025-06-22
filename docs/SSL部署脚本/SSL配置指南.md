# SSL配置指南

## 🎯 目标
为ProductMind AI配置免费SSL证书，实现HTTPS访问和自动续期。

## 🚀 操作步骤

### 第一步：连接服务器并创建脚本

```bash
# 连接服务器
ssh productmindaidev@3.93.149.236

# 创建SSL配置脚本
cat > ssl-setup.sh << 'EOF'
#!/bin/bash
set -e
echo "🔒 开始配置SSL证书..."

# 安装Certbot
sudo yum update -y
sudo yum install -y epel-release certbot python3-certbot-nginx

# 备份配置
sudo cp /etc/nginx/conf.d/productmind.conf /home/productmindaidev/nginx-backup-$(date +%Y%m%d_%H%M%S).conf

# 申请SSL证书
sudo certbot --nginx -d productmindai.com -d www.productmindai.com \
    --email admin@productmindai.com --agree-tos --no-eff-email --redirect

# 优化配置
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
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
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

sudo nginx -t && sudo systemctl reload nginx

# 设置自动续期
sudo tee /usr/local/bin/certbot-renew.sh > /dev/null <<'RENEW_EOF'
#!/bin/bash
/usr/bin/certbot renew --quiet --nginx
/usr/bin/systemctl reload nginx
RENEW_EOF

sudo chmod +x /usr/local/bin/certbot-renew.sh
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/certbot-renew.sh") | sudo crontab -

echo "🎉 SSL配置完成！访问: https://productmindai.com"
EOF

chmod +x ssl-setup.sh
```

### 第二步：创建链接更新脚本

```bash
cat > update-https-links.sh << 'EOF'
#!/bin/bash
echo "🔗 更新HTTPS链接..."

# 更新生成器文件
sed -i 's|http://productmindai.com|https://productmindai.com|g' generate-seo-pages.cjs

# 更新已生成的页面
if [ -d "static-pages/pdhtml" ]; then
    find static-pages/pdhtml -name "index.html" -exec sed -i 's|http://productmindai.com|https://productmindai.com|g' {} \;
fi

echo "✅ 链接更新完成"
EOF

chmod +x update-https-links.sh
```

### 第三步：执行部署

```bash
# 执行SSL配置
./ssl-setup.sh

# 更新链接
./update-https-links.sh

# 重启服务
pm2 restart all
```

## 🧪 验证结果

```bash
# 检查证书
sudo certbot certificates

# 测试访问
curl -I https://productmindai.com

# 测试API
curl -s "https://productmindai.com/.netlify/functions/get-categories"
```

## 📊 预期结果

✅ **HTTPS访问正常**: https://productmindai.com  
✅ **SSL证书有效**: 90天自动续期  
✅ **安全头配置**: HSTS、XSS保护等  
✅ **HTTP重定向**: 自动跳转到HTTPS  

---

**🎉 部署完成！现在可以安全访问 https://productmindai.com** 