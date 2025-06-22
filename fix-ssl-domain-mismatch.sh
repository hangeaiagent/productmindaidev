#!/bin/bash

# SSL域名不匹配问题修复脚本
# 用于修复productmindai.com的SSL证书配置

echo "🔍 SSL域名不匹配问题诊断和修复脚本"
echo "========================================"

# 检查当前SSL证书状态
echo "📋 检查当前SSL证书状态..."
echo "当前证书信息："
openssl s_client -connect productmindai.com:443 -servername productmindai.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -dates

echo ""
echo "证书覆盖的域名："
openssl s_client -connect productmindai.com:443 -servername productmindai.com < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A 5 "Subject Alternative Name"

echo ""
echo "🔧 检查Nginx配置..."

# 检查Nginx配置文件
if [ -f "/etc/nginx/conf.d/productmind.conf" ]; then
    echo "✅ 找到Nginx配置文件: /etc/nginx/conf.d/productmind.conf"
    
    echo "📋 当前配置内容："
    cat /etc/nginx/conf.d/productmind.conf
    
    echo ""
    echo "🔧 检查SSL证书路径..."
    
    # 检查证书文件是否存在
    if [ -f "/etc/letsencrypt/live/productmindai.com/fullchain.pem" ]; then
        echo "✅ SSL证书文件存在: /etc/letsencrypt/live/productmindai.com/fullchain.pem"
        
        # 检查证书内容
        echo "📋 证书详细信息："
        openssl x509 -in /etc/letsencrypt/live/productmindai.com/fullchain.pem -noout -subject -dates -text | grep -A 5 "Subject Alternative Name"
    else
        echo "❌ SSL证书文件不存在: /etc/letsencrypt/live/productmindai.com/fullchain.pem"
    fi
    
    if [ -f "/etc/letsencrypt/live/productmindai.com/privkey.pem" ]; then
        echo "✅ SSL私钥文件存在: /etc/letsencrypt/live/productmindai.com/privkey.pem"
    else
        echo "❌ SSL私钥文件不存在: /etc/letsencrypt/live/productmindai.com/privkey.pem"
    fi
else
    echo "❌ 未找到Nginx配置文件: /etc/nginx/conf.d/productmind.conf"
fi

echo ""
echo "🔧 检查Nginx进程和端口..."
echo "Nginx进程状态："
systemctl status nginx --no-pager

echo ""
echo "端口监听状态："
netstat -tlnp | grep -E ':80|:443'

echo ""
echo "🔧 测试域名解析..."
echo "域名解析结果："
dig productmindai.com A +short

echo ""
echo "🔧 测试SSL连接..."
echo "SSL连接测试："
timeout 10 openssl s_client -connect productmindai.com:443 -servername productmindai.com < /dev/null

echo ""
echo "📊 诊断总结："
echo "============"

# 诊断结果
cert_subject=$(openssl s_client -connect productmindai.com:443 -servername productmindai.com < /dev/null 2>/dev/null | openssl x509 -noout -subject)

if [[ $cert_subject == *"productmindai.com"* ]]; then
    echo "✅ SSL证书域名配置正确"
elif [[ $cert_subject == *"netlify.app"* ]]; then
    echo "❌ 问题确认：网站使用了Netlify的证书而不是productmindai.com的证书"
    echo ""
    echo "🛠️  可能的解决方案："
    echo "1. 检查Nginx配置是否正确加载了productmindai.com的SSL证书"
    echo "2. 确认Let's Encrypt证书是否正确生成"
    echo "3. 重新生成和配置SSL证书"
    echo "4. 检查是否有反向代理或CDN配置问题"
else
    echo "⚠️  未知的SSL证书配置问题"
fi

echo ""
echo "🔧 建议的修复步骤："
echo "1. 重新检查并配置Nginx SSL设置"
echo "2. 确认SSL证书文件路径正确"
echo "3. 重启Nginx服务"
echo "4. 清除浏览器缓存并重新测试" 