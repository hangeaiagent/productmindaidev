#!/bin/bash

# ProductMind AI SSL配置脚本
# 使用Let's Encrypt免费SSL证书，配置Nginx HTTPS和自动续期

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置变量
DOMAIN="productmindai.com"
EMAIL="admin@productmindai.com"  # 请替换为您的邮箱
NGINX_CONFIG="/etc/nginx/conf.d/productmind.conf"
BACKUP_DIR="/home/productmindaidev/ssl-backup"

log_info "开始配置ProductMind AI SSL证书..."

# 1. 检查系统环境
log_info "检查系统环境..."
if ! command -v nginx &> /dev/null; then
    log_error "Nginx未安装，请先安装Nginx"
    exit 1
fi

# 2. 安装Certbot
log_info "安装Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo yum update -y
    sudo yum install -y epel-release
    sudo yum install -y certbot python3-certbot-nginx
    log_success "Certbot安装完成"
else
    log_info "Certbot已安装"
fi

# 3. 创建备份目录
log_info "创建备份目录..."
mkdir -p $BACKUP_DIR
sudo cp $NGINX_CONFIG $BACKUP_DIR/nginx-config-$(date +%Y%m%d_%H%M%S).conf
log_success "Nginx配置已备份"

# 4. 检查域名解析
log_info "检查域名解析..."
if ! nslookup $DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
    log_warning "域名解析可能未正确配置，请确保 $DOMAIN 指向当前服务器IP"
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. 临时配置HTTP版本用于验证
log_info "配置临时HTTP版本用于域名验证..."
sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Netlify函数代理
    location /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 静态页面代理
    location /static-pages/ {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 静态文件服务
    root /home/productmindaidev/dist;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# 6. 创建webroot目录
sudo mkdir -p /var/www/html
sudo chown -R nginx:nginx /var/www/html

# 7. 测试Nginx配置
log_info "测试Nginx配置..."
sudo nginx -t
if [ $? -ne 0 ]; then
    log_error "Nginx配置错误"
    exit 1
fi

# 8. 重载Nginx
sudo systemctl reload nginx
log_success "Nginx配置已更新"

# 9. 申请SSL证书
log_info "申请Let's Encrypt SSL证书..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect

if [ $? -eq 0 ]; then
    log_success "SSL证书申请成功！"
else
    log_error "SSL证书申请失败"
    exit 1
fi

# 10. 优化SSL配置
log_info "优化SSL配置..."
sudo tee $NGINX_CONFIG > /dev/null <<EOF
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Netlify函数代理
    location /.netlify/functions/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
        
        # CORS头
        add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range" always;
    }
    
    # 静态页面代理
    location /static-pages/ {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
        
        # 缓存控制
        location ~* \.(html|htm)$ {
            proxy_pass http://localhost:3031;
            expires 1h;
            add_header Cache-Control "public, immutable";
        }
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
        try_files \$uri \$uri/ /index.html;
        
        # 安全头
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 11. 测试最终配置
log_info "测试最终Nginx配置..."
sudo nginx -t
if [ $? -ne 0 ]; then
    log_error "最终Nginx配置错误，恢复备份"
    sudo cp $BACKUP_DIR/nginx-config-*.conf $NGINX_CONFIG
    sudo systemctl reload nginx
    exit 1
fi

# 12. 重载Nginx
sudo systemctl reload nginx
log_success "Nginx HTTPS配置完成！"

# 13. 设置自动续期
log_info "配置SSL证书自动续期..."

# 创建续期脚本
sudo tee /usr/local/bin/certbot-renew.sh > /dev/null <<EOF
#!/bin/bash
# SSL证书自动续期脚本

LOG_FILE="/var/log/certbot-renew.log"
DATE=\$(date '+%Y-%m-%d %H:%M:%S')

echo "[\$DATE] 开始检查SSL证书续期..." >> \$LOG_FILE

# 尝试续期证书
/usr/bin/certbot renew --quiet --nginx >> \$LOG_FILE 2>&1

if [ \$? -eq 0 ]; then
    echo "[\$DATE] SSL证书检查完成" >> \$LOG_FILE
    # 重载Nginx以应用新证书
    /usr/bin/systemctl reload nginx >> \$LOG_FILE 2>&1
    echo "[\$DATE] Nginx已重载" >> \$LOG_FILE
else
    echo "[\$DATE] SSL证书续期失败" >> \$LOG_FILE
    # 可以在这里添加邮件通知
fi
EOF

sudo chmod +x /usr/local/bin/certbot-renew.sh

# 14. 设置Cron任务
log_info "设置自动续期Cron任务..."
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/certbot-renew.sh") | sudo crontab -

# 15. 测试续期功能
log_info "测试证书续期功能..."
sudo /usr/local/bin/certbot-renew.sh
log_success "续期脚本测试完成"

# 16. 验证SSL配置
log_info "验证SSL配置..."
sleep 5

if curl -s -I https://$DOMAIN | grep -q "HTTP/2 200"; then
    log_success "HTTPS配置验证成功！"
else
    log_warning "HTTPS验证可能有问题，请手动检查"
fi

# 17. 显示配置信息
log_success "SSL配置完成！"
echo
echo "======================================"
echo "SSL配置信息："
echo "域名: https://$DOMAIN"
echo "证书路径: /etc/letsencrypt/live/$DOMAIN/"
echo "续期脚本: /usr/local/bin/certbot-renew.sh"
echo "续期时间: 每天凌晨3点自动检查"
echo "备份目录: $BACKUP_DIR"
echo "======================================"
echo
echo "测试命令："
echo "curl -I https://$DOMAIN"
echo "sudo certbot certificates"
echo "sudo /usr/local/bin/certbot-renew.sh"
echo
log_info "建议重启PM2服务以确保所有服务正常工作："
echo "pm2 restart all" 