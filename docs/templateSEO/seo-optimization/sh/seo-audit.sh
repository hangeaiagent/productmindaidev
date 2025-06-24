#!/bin/bash
# seo-audit.sh - SEO状态检查脚本
# ProductMind AI SEO优化系列 - 状态检查

echo "🔍 ProductMind AI SEO状态检查..."
echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo "=== 1. 检查主要SEO文件 ==="
files=("index.html" "public/robots.txt" "public/sitemap.xml" "public/og-image.jpg" "public/favicon.png")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
        echo "✅ $file 存在 (${size} bytes)"
    else
        echo "❌ $file 缺失"
    fi
done

echo -e "\n=== 2. 检查SEO元数据 ==="
if [ -f "index.html" ]; then
    if grep -q "meta name=\"description\"" index.html; then
        desc=$(grep -o 'meta name="description" content="[^"]*"' index.html | head -1)
        echo "✅ Description meta标签存在"
        echo "   内容: ${desc}"
    else
        echo "❌ Description meta标签缺失"
    fi

    if grep -q "meta name=\"keywords\"" index.html; then
        echo "✅ Keywords meta标签存在"
    else
        echo "❌ Keywords meta标签缺失"
    fi

    if grep -q "og:title" index.html; then
        echo "✅ Open Graph标签存在"
    else
        echo "❌ Open Graph标签缺失"
    fi

    if grep -q "twitter:card" index.html; then
        echo "✅ Twitter Cards标签存在"
    else
        echo "❌ Twitter Cards标签缺失"
    fi
else
    echo "❌ index.html 文件不存在"
fi

echo -e "\n=== 3. 检查结构化数据 ==="
if [ -f "index.html" ] && grep -q "application/ld+json" index.html; then
    echo "✅ 结构化数据存在"
    # 检查结构化数据的完整性
    if grep -q "@type.*WebApplication" index.html; then
        echo "   ✅ WebApplication类型正确"
    fi
    if grep -q "aggregateRating" index.html; then
        echo "   ✅ 评分数据存在"
    fi
else
    echo "❌ 结构化数据缺失"
fi

echo -e "\n=== 4. 检查多语言支持 ==="
if [ -f "index.html" ] && grep -q "hreflang" index.html; then
    echo "✅ 多语言标签存在"
    hreflang_count=$(grep -c "hreflang" index.html)
    echo "   语言数量: $hreflang_count"
else
    echo "❌ 多语言标签缺失"
fi

echo -e "\n=== 5. 检查网站性能配置 ==="
if [ -f "public/sw.js" ]; then
    echo "✅ Service Worker存在"
else
    echo "❌ Service Worker缺失"
fi

if [ -f "index.html" ] && grep -q "preconnect" index.html; then
    echo "✅ DNS预连接配置存在"
else
    echo "❌ DNS预连接配置缺失"
fi

if [ -f "index.html" ] && grep -q "preload" index.html; then
    echo "✅ 资源预加载配置存在"
else
    echo "❌ 资源预加载配置缺失"
fi

echo -e "\n=== 6. 检查静态SEO页面 ==="
if [ -d "static-pages" ]; then
    page_count=$(find static-pages -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ 静态SEO页面: $page_count 个"
    
    # 检查页面质量
    if [ "$page_count" -gt 0 ]; then
        sample_page=$(find static-pages -name "*.html" | head -1)
        if [ -f "$sample_page" ] && grep -q "meta name=\"description\"" "$sample_page"; then
            echo "   ✅ 静态页面包含SEO元数据"
        else
            echo "   ⚠️  静态页面SEO元数据可能不完整"
        fi
    fi
else
    echo "❌ 静态SEO页面目录不存在"
fi

echo -e "\n=== 7. 网站可访问性测试 ==="
echo "📊 建议使用以下命令检查网站性能："
echo "curl -o /dev/null -s -w 'HTTP状态: %{http_code}, 总时间: %{time_total}s, DNS解析: %{time_namelookup}s\\n' https://productmindai.com"

echo -e "\n=== 8. SEO工具链接 ==="
echo "🔗 Google PageSpeed Insights:"
echo "   https://pagespeed.web.dev/analysis/https-productmindai-com"
echo "🔗 Google Search Console:"
echo "   https://search.google.com/search-console"
echo "🔗 Schema.org验证:"
echo "   https://validator.schema.org/"

echo -e "\n=========================================="
echo "🎯 SEO检查完成！"
echo "📋 建议定期运行此脚本监控SEO状态" 