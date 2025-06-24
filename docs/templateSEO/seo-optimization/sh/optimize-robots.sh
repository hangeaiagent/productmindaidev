#!/bin/bash
# optimize-robots.sh - 优化robots.txt
# ProductMind AI SEO优化系列 - 搜索引擎爬虫配置

echo "🤖 优化robots.txt..."

# 确保public目录存在
mkdir -p public

# 备份现有robots.txt
if [ -f "public/robots.txt" ]; then
    cp public/robots.txt public/robots.txt.backup.$(date +%Y%m%d_%H%M%S)
    echo "📝 已备份现有robots.txt"
fi

# 创建优化的robots.txt
cat > public/robots.txt << EOF
# ProductMind AI - Robots.txt
# 更新时间: $(date +%Y-%m-%d)
# 配置说明: 允许所有搜索引擎访问，优化爬取效率

User-agent: *
Allow: /

# 主要页面 - 高优先级
Allow: /ai-products
Allow: /dashboard
Allow: /static-pages/
Allow: /en/

# 静态资源 - 允许访问
Allow: /assets/
Allow: /images/
Allow: /public/
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.svg
Allow: /*.ico
Allow: /*.webp

# 禁止访问的目录和文件
Disallow: /admin/
Disallow: /.netlify/
Disallow: /api/
Disallow: /src/
Disallow: /node_modules/
Disallow: /logs/
Disallow: /.git/
Disallow: /*.log
Disallow: /*?*
Disallow: /private/
Disallow: /temp/
Disallow: /backup/

# 特殊搜索引擎规则
User-agent: Googlebot
Crawl-delay: 1
Allow: /

User-agent: Bingbot  
Crawl-delay: 2
Allow: /

User-agent: Baiduspider
Crawl-delay: 3
Allow: /

User-agent: YandexBot
Crawl-delay: 2
Allow: /

# 禁止不良爬虫
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# 站点地图
Sitemap: https://productmindai.com/sitemap.xml
Sitemap: https://productmindai.com/sitemap-images.xml
Sitemap: https://productmindai.com/sitemap-static.xml

# 缓存友好设置
# 建议爬取频率: 每日一次主要页面，每周一次静态页面
EOF

echo "✅ robots.txt优化完成！"
echo "📍 文件位置: public/robots.txt"
echo "🎯 优化内容："
echo "   - 允许主要搜索引擎访问"
echo "   - 设置合理的爬取延迟"
echo "   - 禁止访问敏感目录"
echo "   - 配置多个sitemap"
echo "   - 阻止不良爬虫"

# 验证文件创建
if [ -f "public/robots.txt" ]; then
    echo "📊 文件大小: $(stat -f%z public/robots.txt 2>/dev/null || stat -c%s public/robots.txt) bytes"
    echo "🔗 访问地址: https://productmindai.com/robots.txt"
else
    echo "❌ robots.txt创建失败"
    exit 1
fi 