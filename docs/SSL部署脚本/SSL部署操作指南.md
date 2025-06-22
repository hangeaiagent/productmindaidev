# ProductMind AI SSL部署操作指南

## 🎯 部署目标
为ProductMind AI系统配置免费的Let's Encrypt SSL证书，实现HTTPS访问和自动续期。

## 📋 前置条件
- 服务器已安装Nginx
- 域名productmindai.com已正确解析到服务器IP
- 具有sudo权限
- 端口80和443已开放

## 🚀 完整部署步骤

### 第一步：连接服务器并创建SSL配置脚本

```bash
# 连接到服务器
ssh productmindaidev@3.93.149.236

# 创建SSL配置脚本
cat > ssl-setup.sh << 'EOF'
#!/bin/bash
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
EOF

# 添加执行权限
chmod +x ssl-setup.sh
```

### 第二步：创建HTTPS链接更新脚本

```bash
cat > update-https-links.sh << 'EOF'
#!/bin/bash
echo "🔗 开始更新产品主页HTTPS链接..."

# 1. 更新产品主页生成器中的链接
echo "📝 更新generate-seo-pages.cjs中的链接..."
sed -i 's|http://productmindai.com|https://productmindai.com|g' generate-seo-pages.cjs

# 2. 批量更新所有已生成的产品主页
echo "🔄 批量更新已生成的产品主页..."
if [ -d "static-pages/pdhtml" ]; then
    find static-pages/pdhtml -name "index.html" -type f -exec sed -i 's|http://productmindai.com|https://productmindai.com|g' {} \;
    echo "✅ 已更新所有产品主页中的链接"
else
    echo "⚠️  static-pages/pdhtml目录不存在"
fi

# 3. 重新生成产品主页
read -p "是否重新生成所有产品主页？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 重新生成所有产品主页..."
    export VITE_SUPABASE_URL="https://uobwbhvwrciaxloqdizc.supabase.co"
    export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc"
    node generate-seo-pages.cjs
    echo "✅ 产品主页重新生成完成"
fi

echo "🎉 HTTPS链接更新完成！"
EOF

# 添加执行权限
chmod +x update-https-links.sh
```

### 第三步：执行SSL配置

```bash
# 执行SSL配置脚本
./ssl-setup.sh
```

**注意：** 在执行过程中会要求确认：
- 同意Let's Encrypt服务条款
- 是否接收EFF邮件（选择N）
- 是否将HTTP重定向到HTTPS（选择2）

### 第四步：更新应用链接

```bash
# 执行链接更新脚本
./update-https-links.sh
```

当询问是否重新生成产品主页时，选择 `y` 来更新所有链接。

### 第五步：重启PM2服务

```bash
# 重启PM2服务以应用新的HTTPS配置
pm2 restart all

# 检查服务状态
pm2 status
```

## 🧪 验证部署结果

### 1. 测试SSL证书

```bash
# 检查证书状态
sudo certbot certificates

# 测试HTTPS访问
curl -I https://productmindai.com

# 检查安全头
curl -I https://productmindai.com | grep -E "(Strict-Transport-Security|X-Frame-Options)"
```

### 2. 测试网站功能

```bash
# 测试API端点
curl -s "https://productmindai.com/.netlify/functions/get-categories" | jq .success

# 测试静态页面
curl -I https://productmindai.com/static-pages/pdhtml/
```

### 3. 验证自动续期

```bash
# 查看Cron任务
sudo crontab -l

# 手动测试续期
sudo /usr/local/bin/certbot-renew.sh

# 查看续期日志
sudo tail -f /var/log/certbot-renew.log
```

## 📊 预期结果

部署完成后，您应该看到：

✅ **SSL证书状态**
```
Certificate Name: productmindai.com
  Domains: productmindai.com www.productmindai.com
  Expiry Date: 2025-09-20 (90 days)
  Certificate Path: /etc/letsencrypt/live/productmindai.com/fullchain.pem
```

✅ **HTTPS访问测试**
```
HTTP/2 200 
server: nginx/1.20.1
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
```

✅ **自动续期配置**
```
0 3 * * * /usr/local/bin/certbot-renew.sh
```

## 🔍 故障排查

### 问题1：证书申请失败

```bash
# 检查域名解析
nslookup productmindai.com

# 检查80端口
sudo netstat -tlnp | grep :80

# 检查防火墙
sudo firewall-cmd --list-all
```

### 问题2：Nginx配置错误

```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 恢复备份
sudo cp /home/productmindaidev/nginx-backup-*.conf /etc/nginx/conf.d/productmind.conf
sudo systemctl reload nginx
```

### 问题3：PM2服务异常

```bash
# 检查PM2状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all
```

## 🎯 完成检查清单

- [ ] SSL证书申请成功
- [ ] HTTPS访问正常
- [ ] HTTP自动重定向到HTTPS
- [ ] 安全头配置正确
- [ ] 自动续期脚本设置
- [ ] PM2服务重启
- [ ] 产品主页链接更新
- [ ] API功能测试通过

---

**部署完成后，ProductMind AI将拥有完整的HTTPS支持！** 🎉 