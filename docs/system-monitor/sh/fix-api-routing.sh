#!/bin/bash

# 修复API路由配置脚本
# 将ai-product-analysis API路由到正确的端口

SERVER="ec2-user@3.93.149.236"
PEM_FILE="/Users/a1/work/productmindai.pem"
NGINX_CONFIG="/etc/nginx/conf.d/productmind.conf"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1"
}

log "${YELLOW}开始修复API路由配置...${NC}"

# 备份当前配置
log "备份当前nginx配置..."
ssh -i "$PEM_FILE" "$SERVER" "sudo cp $NGINX_CONFIG ${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# 创建新的nginx配置
log "创建新的nginx配置..."
ssh -i "$PEM_FILE" "$SERVER" "sudo tee $NGINX_CONFIG > /dev/null" << 'EOF'
server {
    server_name productmindai.com www.productmindai.com;

    access_log /var/log/nginx/productmind_access.log;
    error_log /var/log/nginx/productmind_error.log;

    # 站点地图和SEO文件 - alias方式（无try_files）
    location ~* ^/(sitemap.*\.xml)$ {
        alias /home/productmindaidev/public/$1;
        add_header Content-Type "application/xml; charset=utf-8";
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # robots.txt 单独处理
    location = /robots.txt {
        alias /home/productmindaidev/public/robots.txt;
        add_header Content-Type "text/plain; charset=utf-8";
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # 静态SEO页面代理
    location ^~ /static-pages/ {
        proxy_pass http://127.0.0.1:3031;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # AI产品分析API - 代理到aws-backend (端口3000)
    location ^~ /api/ai-product-analysis {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
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

    # 其他API请求代理到functions服务器 (端口8888)
    location ^~ /api/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
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
EOF

# 测试nginx配置
log "测试nginx配置..."
if ssh -i "$PEM_FILE" "$SERVER" "sudo nginx -t"; then
    log "${GREEN}✓ Nginx配置测试通过${NC}"
else
    log "${RED}✗ Nginx配置测试失败，恢复备份${NC}"
    ssh -i "$PEM_FILE" "$SERVER" "sudo cp ${NGINX_CONFIG}.backup.* $NGINX_CONFIG"
    exit 1
fi

# 重新加载nginx
log "重新加载nginx..."
if ssh -i "$PEM_FILE" "$SERVER" "sudo systemctl reload nginx"; then
    log "${GREEN}✓ Nginx重新加载成功${NC}"
else
    log "${RED}✗ Nginx重新加载失败${NC}"
    exit 1
fi

# 等待服务稳定
sleep 3

# 测试API
log "测试AI产品分析API..."
if ssh -i "$PEM_FILE" "$SERVER" 'curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"requirement\":\"测试\",\"language\":\"zh\"}" http://localhost:3000/api/ai-product-analysis' | grep -q "200"; then
    log "${GREEN}✓ AI产品分析API测试通过${NC}"
else
    log "${YELLOW}⚠ AI产品分析API可能需要启动aws-backend服务${NC}"
fi

# 启动aws-backend服务（如果没有运行）
log "检查并启动aws-backend服务..."
ssh -i "$PEM_FILE" "$SERVER" "cd /home/productmindaidev && ./system-service-manager.sh start aws-backend"

log "${GREEN}✓ API路由配置修复完成${NC}"
log "现在可以测试 https://productmindai.com/api/ai-product-analysis" 